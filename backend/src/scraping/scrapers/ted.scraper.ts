import { Page } from 'playwright';
import { BaseScraper, TenderData, ScrapingResult } from '../base/base-scraper.interface';

interface TedNotice {
  'publication-number'?: string;
  'notice-title'?: { eng?: string; [key: string]: string | undefined };
  'buyer-name'?: { eng?: string; [key: string]: string | undefined };
  'description-proc'?: { eng?: string; [key: string]: string | undefined };
  'deadline-receipt-tender-date-lot'?: string[];
  'publication-date'?: string;
  'procedure-type'?: string;
  'buyer-country'?: string[];
  links?: { html?: { ENG?: string; eng?: string } };
}

export class TedScraper extends BaseScraper {
  constructor() {
    super({
      name: 'TED',
      baseUrl: 'https://ted.europa.eu',
      region: 'worldwide',
      rateLimitMs: 2000,
      maxRetries: 3,
      timeoutMs: 60000,
    });
  }

  async scrape(_page: Page): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: false,
      tenders: [],
      errors: [],
      metadata: { totalScanned: 0, scrapedAt: new Date() },
    };

    try {
      const apiResult = await this.fetchFromApi();
      if (apiResult.tenders.length > 0) {
        return apiResult;
      }
      result.errors.push(...apiResult.errors);
    } catch (error) {
      result.errors.push(`TED API failed: ${error.message}`);
    }

    return result;
  }

  private async fetchFromApi(): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: false,
      tenders: [],
      errors: [],
      metadata: { totalScanned: 0, scrapedAt: new Date() },
    };

    const response = await fetch('https://api.ted.europa.eu/v3/notices/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: 'notice-type=cn-standard',
        scope: 'ACTIVE',
        fields: [
          'publication-number',
          'notice-title',
          'buyer-name',
          'description-proc',
          'deadline-receipt-tender-date-lot',
          'publication-date',
          'procedure-type',
          'buyer-country',
          'links',
        ],
        page: 1,
        limit: 50,
        paginationMode: 'PAGE_NUMBER',
        checkQuerySyntax: false,
      }),
    });

    if (!response.ok) {
      result.errors.push(`TED API returned ${response.status}`);
      return result;
    }

    const data = (await response.json()) as {
      notices?: TedNotice[];
      totalNoticeCount?: number;
    };

    const notices = data.notices || [];
    result.metadata.totalScanned = notices.length;

    for (const notice of notices) {
      const tender = this.mapNotice(notice);
      if (tender) {
        result.tenders.push(tender);
      }
    }

    result.success = result.tenders.length > 0;
    return result;
  }

  private getLocalizedText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const preferred = record.eng || record.en || record.ENG || record.EN;
      if (preferred) return this.getLocalizedText(preferred);
      const first = Object.values(record)[0];
      return this.getLocalizedText(first);
    }
    return String(value);
  }

  private mapNotice(notice: TedNotice): TenderData | null {
    const title = this.getLocalizedText(notice['notice-title'] as any);
    if (!title) return null;

    const pubNumber = notice['publication-number'] || '';
    const org = this.getLocalizedText(notice['buyer-name'] as any) || 'European Union';
    const description = this.getLocalizedText(notice['description-proc'] as any);
    const deadlineStr = notice['deadline-receipt-tender-date-lot']?.[0];
    const deadline = this.parseDate(deadlineStr);
    const publishedDate = this.parseDate(notice['publication-date']);
    const country = Array.isArray(notice['buyer-country'])
      ? notice['buyer-country'][0]
      : notice['buyer-country'] || 'EU';
    const htmlLink = notice.links?.html?.ENG || notice.links?.html?.eng;
    const sourceUrl = htmlLink
      ? htmlLink.startsWith('http')
        ? htmlLink
        : `${this.config.baseUrl}${htmlLink}`
      : `${this.config.baseUrl}/en/notice/-/detail/${pubNumber}`;

    return {
      title: this.cleanText(title),
      description: this.cleanText(description),
      organization: this.cleanText(org),
      country,
      category: notice['procedure-type'] || 'Public Procurement',
      deadline,
      published_date: publishedDate,
      tender_number: pubNumber,
      source_url: sourceUrl,
      procurement_type: notice['procedure-type'] || 'Open Procedure',
      status: deadline && deadline < new Date() ? 'closed' : 'open',
    };
  }
}

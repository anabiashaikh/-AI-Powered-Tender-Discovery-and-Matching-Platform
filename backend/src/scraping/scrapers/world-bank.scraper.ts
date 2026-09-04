import { Page } from 'playwright';
import { BaseScraper, TenderData, ScrapingResult } from '../base/base-scraper.interface';

interface WorldBankNotice {
  id?: string;
  notice_type?: string;
  notice_status?: string;
  project_name?: string;
  project_id?: string;
  project_ctry_name?: string;
  bid_description?: string;
  bid_deadline_date?: string;
  notice_date?: string;
  procurement_method_name?: string;
  notice_url?: string;
}

export class WorldBankScraper extends BaseScraper {
  constructor() {
    super({
      name: 'WorldBank',
      baseUrl: 'https://projects.worldbank.org',
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
      const url =
        'https://search.worldbank.org/api/v2/procnotices?format=json&rows=50&os=0&fl=id,notice_type,notice_status,project_name,project_id,project_ctry_name,bid_description,bid_deadline_date,notice_date,procurement_method_name,notice_url';

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        result.errors.push(`World Bank API returned ${response.status}`);
        return result;
      }

      const data = (await response.json()) as {
        procnotices?: WorldBankNotice[];
        total?: number;
      };

      const notices = data.procnotices || [];
      result.metadata.totalScanned = notices.length;

      for (const notice of notices) {
        const tender = this.mapNotice(notice);
        if (tender) {
          result.tenders.push(tender);
        }
      }

      result.success = result.tenders.length > 0;
    } catch (error) {
      result.errors.push(`World Bank API failed: ${error.message}`);
    }

    return result;
  }

  private mapNotice(notice: WorldBankNotice): TenderData | null {
    const title = notice.project_name || notice.bid_description?.slice(0, 200);
    if (!title) return null;

    const deadline = this.parseDate(notice.bid_deadline_date);
    const publishedDate = this.parseDate(notice.notice_date);
    const sourceUrl =
      notice.notice_url ||
      (notice.project_id
        ? `${this.config.baseUrl}/en/projects-operations/procurement/${notice.project_id}`
        : this.config.baseUrl);

    return {
      title: this.cleanText(title),
      description: this.cleanText(notice.bid_description || ''),
      organization: 'World Bank',
      country: notice.project_ctry_name || 'International',
      category: notice.procurement_method_name || notice.notice_type || 'General Procurement',
      deadline,
      published_date: publishedDate,
      tender_number: notice.id || notice.project_id || '',
      source_url: sourceUrl,
      procurement_type: notice.procurement_method_name || 'Open',
      status:
        notice.notice_status?.toLowerCase() === 'closed' ||
        (deadline && deadline < new Date())
          ? 'closed'
          : 'open',
    };
  }
}

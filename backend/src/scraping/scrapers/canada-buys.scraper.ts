import { Page } from 'playwright';
import { Logger } from '@nestjs/common';
import { BaseScraper, TenderData, ScrapingResult } from '../base/base-scraper.interface';

interface CanadaBuysRecord {
  title?: string;
  title_titre?: string;
  reference_number_numero_reference?: string;
  solicitation_number?: string;
  closing_date_date_limite?: string;
  publication_date?: string;
  organization?: string;
  organization_name?: string;
  description?: string;
  category?: string;
  province?: string;
  url?: string;
  link?: string;
}

export class CanadaBuysScraper extends BaseScraper {
  private readonly logger = new Logger(CanadaBuysScraper.name);

  constructor() {
    super({
      name: 'CanadaBuys',
      baseUrl: 'https://buyandsell.gc.ca',
      region: 'canada',
      rateLimitMs: 1000,
      maxRetries: 3,
      timeoutMs: 30000,
    });
  }

  async scrape(page: Page): Promise<ScrapingResult> {
    const apiResult = await this.fetchFromOpenData();
    if (apiResult.success && apiResult.tenders.length > 0) {
      return apiResult;
    }

    return this.scrapeWithPlaywright(page, apiResult.errors);
  }

  private async fetchFromOpenData(): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: false,
      tenders: [],
      errors: [],
      metadata: { totalScanned: 0, scrapedAt: new Date() },
    };

    try {
      const url =
        'https://open.canada.ca/data/en/api/3/action/package_search?q=procurement&rows=20&sort=metadata_modified+desc';

      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        result.errors.push(`Canada Open Data API returned ${response.status}`);
        return result;
      }

      const data = (await response.json()) as {
        result?: { results?: Array<{ title?: string; notes?: string; organization?: { title?: string }; resources?: Array<{ url?: string; name?: string }> }> };
      };

      const packages = data.result?.results || [];
      result.metadata.totalScanned = packages.length;

      for (const pkg of packages) {
        const title = pkg.title;
        if (!title) continue;

        const resourceUrl = pkg.resources?.[0]?.url || this.config.baseUrl;
        result.tenders.push({
          title: this.cleanText(title),
          description: this.cleanText(pkg.notes || ''),
          organization: this.cleanText(pkg.organization?.title || 'Government of Canada'),
          country: 'Canada',
          category: 'Government Procurement',
          deadline: null,
          published_date: new Date(),
          tender_number: '',
          source_url: resourceUrl,
          procurement_type: 'Open Bidding',
          status: 'open',
        });
      }

      result.success = result.tenders.length > 0;
    } catch (error) {
      result.errors.push(`Canada Open Data API failed: ${error.message}`);
    }

    return result;
  }

  private async scrapeWithPlaywright(page: Page, priorErrors: string[]): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: false,
      tenders: [],
      errors: [...priorErrors],
      metadata: { totalScanned: 0, scrapedAt: new Date() },
    };

    try {
      await page.goto('https://canadabuys.canada.ca/en/tender-opportunities', {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeoutMs,
      });

      await page.waitForTimeout(3000);

      const tenderElements = await page
        .locator('article, .views-row, tr[data-drupal-link-system-path], .tender-item, a[href*="tender"]')
        .all();

      result.metadata.totalScanned = tenderElements.length;

      for (const element of tenderElements.slice(0, 30)) {
        try {
          const tender = await this.extractTenderData(element);
          if (tender) {
            result.tenders.push(tender);
          }
        } catch (error) {
          result.errors.push(`Error extracting tender: ${error.message}`);
        }
      }

      result.success = result.tenders.length > 0;
    } catch (error) {
      result.errors.push(`Playwright scraping failed: ${error.message}`);
    }

    return result;
  }

  private async extractTenderData(element: any): Promise<TenderData | null> {
    try {
      const titleElement = element.locator('h2, h3, .title, a').first();
      const title = await this.cleanText(await titleElement.textContent());
      if (!title || title.length < 5) return null;

      const linkElement = element.locator('a[href]').first();
      const href = await linkElement.getAttribute('href');
      const sourceUrl = this.extractUrl(href, 'https://canadabuys.canada.ca');

      const orgElement = element.locator('.organization, .department, td').nth(1);
      const organization = await this.cleanText(await orgElement.textContent());

      const deadlineElement = element.locator('.deadline, .closing-date, time').first();
      const deadlineText = await this.cleanText(await deadlineElement.textContent());
      const deadline = this.parseDate(deadlineText);

      return {
        title,
        description: '',
        organization: organization || 'Government of Canada',
        country: 'Canada',
        category: 'General',
        deadline,
        published_date: new Date(),
        tender_number: '',
        source_url: sourceUrl,
        procurement_type: 'Open Bidding',
        status: deadline && deadline < new Date() ? 'closed' : 'open',
      };
    } catch {
      return null;
    }
  }
}

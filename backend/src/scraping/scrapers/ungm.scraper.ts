import { Page } from 'playwright';
import { BaseScraper, TenderData, ScrapingResult, ScraperConfig } from '../base/base-scraper.interface';

export class UngmScraper extends BaseScraper {
  constructor() {
    super({
      name: 'UNGM',
      baseUrl: 'https://www.ungm.org',
      region: 'worldwide',
      rateLimitMs: 1500,
      maxRetries: 3,
      timeoutMs: 45000,
    });
  }

  async scrape(page: Page): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: false,
      tenders: [],
      errors: [],
      metadata: {
        totalScanned: 0,
        totalPages: 0,
        scrapedAt: new Date(),
      },
    };

    try {
      // Navigate to UNGM opportunities page
      await page.goto('https://www.ungm.org/Public/Notice', {
        waitUntil: 'networkidle',
        timeout: this.config.timeoutMs,
      });

      // Wait for results to load
      await page.waitForSelector('.notice-row, .tender-item, [data-notice-id]', {
        timeout: 12000,
      }).catch(() => {
        // Try alternative selector
      });

      // Get total pages if available
      const paginationElement = page.locator('.pagination, .pager').first();
      if (await paginationElement.count() > 0) {
        const paginationText = await paginationElement.textContent();
        if (paginationText) {
          const match = paginationText.match(/(\d+)\s*pages?/i);
          if (match) {
            result.metadata.totalPages = parseInt(match[1]);
          }
        }
      }

      // Extract tender listings
      const tenderElements = await page.locator('.notice-row, .tender-item, [data-notice-id]').all();
      result.metadata.totalScanned = tenderElements.length;

      for (const element of tenderElements) {
        try {
          const tender = await this.extractTenderData(element);
          if (tender) {
            result.tenders.push(tender);
          }
        } catch (error) {
          result.errors.push(`Error extracting tender: ${error.message}`);
        }
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Scraping failed: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  private async extractTenderData(element: any): Promise<TenderData | null> {
    try {
      // Title
      const titleElement = element.locator('.title, .notice-title, a[href*="Notice"]').first();
      const title = await this.cleanText(await titleElement.textContent());

      // Link
      const linkElement = element.locator('a[href*="Notice"]').first();
      const href = await linkElement.getAttribute('href');
      const sourceUrl = this.extractUrl(href, this.config.baseUrl);

      // Organization (UN agency)
      const orgElement = element.locator('.organization, .agency, .un-agency').first();
      const organization = await this.cleanText(await orgElement.textContent());

      // Notice number
      const refElement = element.locator('.notice-number, .reference, .notice-id').first();
      const tenderNumber = await this.cleanText(await refElement.textContent());

      // Description
      const descElement = element.locator('.description, .summary, .short-desc').first();
      const description = await this.cleanText(await descElement.textContent());

      // Deadline
      const deadlineElement = element.locator('.deadline, .due-date, .submission-date').first();
      const deadlineText = await this.cleanText(await deadlineElement.textContent());
      const deadline = this.parseDate(deadlineText);

      // Published date
      const publishedElement = element.locator('.published, .published-date, .issue-date').first();
      const publishedText = await this.cleanText(await publishedElement.textContent());
      const publishedDate = this.parseDate(publishedText);

      // Category
      const categoryElement = element.locator('.category, .notice-type, .procurement-type').first();
      const category = await this.cleanText(await categoryElement.textContent());

      // Country
      const countryElement = element.locator('.country, .nation, .location').first();
      const country = await this.cleanText(await countryElement.textContent());

      if (!title) {
        return null;
      }

      return {
        title,
        description,
        organization: organization || 'United Nations',
        country: country || 'International',
        province_region: undefined,
        category: category || 'General',
        deadline,
        published_date: publishedDate,
        tender_number: tenderNumber || '',
        source_url: sourceUrl,
        procurement_type: category || 'Open',
        status: deadline && deadline < new Date() ? 'closed' : 'open',
      };
    } catch (error) {
      return null;
    }
  }
}

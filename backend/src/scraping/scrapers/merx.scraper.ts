import { Page } from 'playwright';
import { BaseScraper, TenderData, ScrapingResult, ScraperConfig } from '../base/base-scraper.interface';

export class MerxScraper extends BaseScraper {
  constructor() {
    super({
      name: 'MERX',
      baseUrl: 'https://www.merx.com',
      region: 'canada',
      rateLimitMs: 2000,
      maxRetries: 3,
      timeoutMs: 60000,
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
      // Navigate to MERX public opportunities page
      await page.goto('https://www.merx.com/english/OpportunityList.aspx', {
        waitUntil: 'networkidle',
        timeout: this.config.timeoutMs,
      });

      // Wait for results to load
      await page.waitForSelector('.opportunity-item, .tender-item, [data-opportunity-id]', {
        timeout: 15000,
      }).catch(() => {
        // Try alternative selector
      });

      // Extract tender listings
      const tenderElements = await page.locator('.opportunity-item, .tender-item, [data-opportunity-id]').all();
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
      const titleElement = element.locator('.title, .opportunity-title, h3').first();
      const title = await this.cleanText(await titleElement.textContent());

      // Link
      const linkElement = element.locator('a[href*="Opportunity"]').first();
      const href = await linkElement.getAttribute('href');
      const sourceUrl = this.extractUrl(href, this.config.baseUrl);

      // Organization
      const orgElement = element.locator('.organization, .owner, .agency').first();
      const organization = await this.cleanText(await orgElement.textContent());

      // Reference number
      const refElement = element.locator('.reference, .opportunity-id, .solicitation-number').first();
      const tenderNumber = await this.cleanText(await refElement.textContent());

      // Description
      const descElement = element.locator('.description, .summary, .details').first();
      const description = await this.cleanText(await descElement.textContent());

      // Deadline
      const deadlineElement = element.locator('.deadline, .closing-date, .expiry-date').first();
      const deadlineText = await this.cleanText(await deadlineElement.textContent());
      const deadline = this.parseDate(deadlineText);

      // Published date
      const publishedElement = element.locator('.published, .posted-date, .publication-date').first();
      const publishedText = await this.cleanText(await publishedElement.textContent());
      const publishedDate = this.parseDate(publishedText);

      // Category
      const categoryElement = element.locator('.category, .procurement-type, .type').first();
      const category = await this.cleanText(await categoryElement.textContent());

      // Province/Region
      const regionElement = element.locator('.location, .province, .region').first();
      const provinceRegion = await this.cleanText(await regionElement.textContent());

      if (!title) {
        return null;
      }

      return {
        title,
        description,
        organization: organization || 'Government of Canada',
        country: 'Canada',
        province_region: provinceRegion || undefined,
        category: category || 'General',
        deadline,
        published_date: publishedDate,
        tender_number: tenderNumber || '',
        source_url: sourceUrl,
        procurement_type: category || 'Open Bidding',
        status: deadline && deadline < new Date() ? 'closed' : 'open',
      };
    } catch (error) {
      return null;
    }
  }
}

import { Page } from 'playwright';
import { BaseScraper, TenderData, ScrapingResult, ScraperConfig } from '../base/base-scraper.interface';

export class IdbScraper extends BaseScraper {
  constructor() {
    super({
      name: 'IDB',
      baseUrl: 'https://www.iadb.org',
      region: 'worldwide',
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
      // Navigate to IDB procurement opportunities
      await page.goto('https://www.iadb.org/en/projects-operations/procurement', {
        waitUntil: 'networkidle',
        timeout: this.config.timeoutMs,
      });

      // Wait for results to load
      await page.waitForSelector('.project-item, .tender-item, [data-project-id]', {
        timeout: 15000,
      }).catch(() => {
        // Try alternative selector
      });

      // Extract tender listings
      const tenderElements = await page.locator('.project-item, .tender-item, [data-project-id]').all();
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
      const titleElement = element.locator('.title, .project-title, h3').first();
      const title = await this.cleanText(await titleElement.textContent());

      // Link
      const linkElement = element.locator('a[href*="projects"]').first();
      const href = await linkElement.getAttribute('href');
      const sourceUrl = this.extractUrl(href, this.config.baseUrl);

      // Organization
      const orgElement = element.locator('.organization, .country, .borrower').first();
      const organization = await this.cleanText(await orgElement.textContent());

      // Project ID
      const refElement = element.locator('.project-id, .pid, .reference').first();
      const tenderNumber = await this.cleanText(await refElement.textContent());

      // Description
      const descElement = element.locator('.description, .summary, .objective').first();
      const description = await this.cleanText(await descElement.textContent());

      // Deadline
      const deadlineElement = element.locator('.deadline, .closing-date, .submission-date').first();
      const deadlineText = await this.cleanText(await deadlineElement.textContent());
      const deadline = this.parseDate(deadlineText);

      // Published date
      const publishedElement = element.locator('.published, .publication-date, .notice-date').first();
      const publishedText = await this.cleanText(await publishedElement.textContent());
      const publishedDate = this.parseDate(publishedText);

      // Category
      const categoryElement = element.locator('.category, .procurement-type, .method').first();
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
        organization: organization || 'Inter-American Development Bank',
        country: country || 'Latin America',
        province_region: undefined,
        category: category || 'General Procurement',
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

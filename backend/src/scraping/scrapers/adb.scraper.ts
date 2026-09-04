import { Page } from 'playwright';
import { BaseScraper, TenderData, ScrapingResult, ScraperConfig } from '../base/base-scraper.interface';

export class AdBankScraper extends BaseScraper {
  constructor() {
    super({
      name: 'ADB',
      baseUrl: 'https://www.adb.org',
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
      // Navigate to ADB procurement opportunities
      await page.goto('https://www.adb.org/projects/tenders', {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeoutMs,
      });

      const title = await page.title();
      if (title.includes('Cloudflare') || title.includes('Attention Required') || title.includes('Just a moment')) {
        throw new Error('robots.txt / anti-bot restrictions');
      }

      // Wait for results to load
      await page.waitForSelector('.opportunity-item, .tender-item, [data-opportunity-id]', {
        timeout: 5000,
      }).catch(() => {
        // Try alternative selector
      });

      // Extract tender listings
      const tenderElements = await page.locator('.opportunity-item, .tender-item, [data-opportunity-id]').all();
      result.metadata.totalScanned = tenderElements.length;

      if (tenderElements.length === 0) {
        throw new Error('robots.txt / anti-bot restrictions (zero elements matched)');
      }

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
      const linkElement = element.locator('a[href*="business-opportunities"]').first();
      const href = await linkElement.getAttribute('href');
      const sourceUrl = this.extractUrl(href, this.config.baseUrl);

      // Organization
      const orgElement = element.locator('.organization, .department, .country').first();
      const organization = await this.cleanText(await orgElement.textContent());

      // Reference number
      const refElement = element.locator('.reference, .opportunity-id, .project-number').first();
      const tenderNumber = await this.cleanText(await refElement.textContent());

      // Description
      const descElement = element.locator('.description, .summary, .details').first();
      const description = await this.cleanText(await descElement.textContent());

      // Deadline
      const deadlineElement = element.locator('.deadline, .closing-date, .submission-date').first();
      const deadlineText = await this.cleanText(await deadlineElement.textContent());
      const deadline = this.parseDate(deadlineText);

      // Published date
      const publishedElement = element.locator('.published, .posted-date, .notice-date').first();
      const publishedText = await this.cleanText(await publishedElement.textContent());
      const publishedDate = this.parseDate(publishedText);

      // Category
      const categoryElement = element.locator('.category, .procurement-type, .type').first();
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
        organization: organization || 'Asian Development Bank',
        country: country || 'Asia Pacific',
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

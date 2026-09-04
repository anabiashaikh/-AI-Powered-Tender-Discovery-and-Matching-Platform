import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { TendersService } from './tenders.service';
import { ScrapingSource } from './entities/scraping-source.entity';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(private readonly tendersService: TendersService) {}

  async scrapeSource(source: ScrapingSource): Promise<void> {
    let browser: Browser | null = null;

    try {
      this.logger.log(`Starting to scrape source: ${source.name}`);

      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(source.url, { waitUntil: 'networkidle' });

      const tenders = await this.extractTenders(page, source);

      this.logger.log(`Found ${tenders.length} tenders from ${source.name}`);

      for (const tender of tenders) {
        try {
          await this.tendersService.createTender({
            ...tender,
            source_id: source.id,
          });
        } catch (error) {
          this.logger.error(`Error saving tender: ${error.message}`);
        }
      }

      await this.tendersService.updateLastScraped(source.id);

      this.logger.log(`Successfully scraped ${source.name}`);
    } catch (error) {
      this.logger.error(`Error scraping source ${source.name}: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async extractTenders(page: Page, source: ScrapingSource): Promise<any[]> {
    const tenders: any[] = [];
    const config = source.selector_config || {};

    // Generic scraping logic - can be customized based on source
    const tenderElements = await page.locator(config.tenderSelector || '.tender-item').all();

    for (const element of tenderElements) {
      try {
        const title = await element.locator(config.titleSelector || 'h2, .title').textContent();
        const description = await element.locator(config.descriptionSelector || '.description').textContent();
        const organization = await element.locator(config.organizationSelector || '.organization').textContent();
        const deadline = await element.locator(config.deadlineSelector || '.deadline').textContent();
        const category = await element.locator(config.categorySelector || '.category').textContent();
        const link = await element.locator(config.linkSelector || 'a').getAttribute('href');

        if (title) {
          tenders.push({
            title: title.trim(),
            description: description?.trim() || '',
            organization: organization?.trim() || '',
            deadline: deadline ? this.parseDeadline(deadline.trim()) : null,
            category: category?.trim() || '',
            source_url: link ? (link.startsWith('http') ? link : `${new URL(source.url).origin}${link}`) : source.url,
          });
        }
      } catch (error) {
        this.logger.error(`Error extracting tender data: ${error.message}`);
      }
    }

    return tenders;
  }

  private parseDeadline(deadlineText: string): Date | null {
    try {
      // Simple date parsing - can be enhanced with more sophisticated logic
      const date = new Date(deadlineText);
      if (!isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  }

  async scrapeAllActiveSources(): Promise<void> {
    const sources = await this.tendersService.findAllScrapingSources();

    this.logger.log(`Found ${sources.length} active scraping sources`);

    for (const source of sources) {
      try {
        await this.scrapeSource(source);
      } catch (error) {
        this.logger.error(`Failed to scrape source ${source.name}: ${error.message}`);
      }
    }
  }
}

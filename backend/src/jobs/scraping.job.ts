import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScrapingService } from '../tenders/scraping.service';
import { TendersService } from '../tenders/tenders.service';

@Processor('scraping')
export class ScrapingJob {
  private readonly logger = new Logger(ScrapingJob.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    private readonly tendersService: TendersService,
  ) {}

  @Process('scrape-source')
  async handleScrapeSource(job: Job) {
    this.logger.log(`Processing scrape source job: ${job.id}`);
    const { sourceId } = job.data;
    
    try {
      const source = await this.tendersService.findOneScrapingSource(sourceId);
      await this.scrapingService.scrapeSource(source);
      this.logger.log(`Successfully scraped source: ${sourceId}`);
    } catch (error) {
      this.logger.error(`Error scraping source: ${error.message}`);
      throw error;
    }
  }

  @Process('scrape-all-sources')
  async handleScrapeAllSources(job: Job) {
    this.logger.log(`Processing scrape all sources job: ${job.id}`);
    
    try {
      await this.scrapingService.scrapeAllActiveSources();
      this.logger.log('Successfully scraped all active sources');
    } catch (error) {
      this.logger.error(`Error scraping all sources: ${error.message}`);
      throw error;
    }
  }
}

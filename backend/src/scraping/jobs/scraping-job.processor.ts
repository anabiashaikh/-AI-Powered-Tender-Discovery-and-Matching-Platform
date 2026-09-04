import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScrapingService } from '../scraping.service';

export interface ScrapingJobData {
  sourceId: string;
  sourceName: string;
  retryCount?: number;
}

@Processor('scraping')
export class ScrapingJobProcessor {
  private readonly logger = new Logger(ScrapingJobProcessor.name);

  constructor(private readonly scrapingService: ScrapingService) {}

  @Process('scrape-source')
  async handleScrapeSource(job: Job<ScrapingJobData>) {
    this.logger.log(`Processing scraping job for source: ${job.data.sourceName}`);

    try {
      const result = await this.scrapingService.scrapeSource(job.data.sourceId);
      
      this.logger.log(
        `Scraping job completed for ${job.data.sourceName}: ${result.tenders.length} tenders found`
      );

      return result;
    } catch (error) {
      this.logger.error(`Scraping job failed for ${job.data.sourceName}: ${error.message}`);
      throw error;
    }
  }

  @Process('scrape-all-sources')
  async handleScrapeAllSources(job: Job) {
    this.logger.log('Processing scrape all sources job');

    try {
      const results = await this.scrapingService.scrapeAllActiveSources();
      
      this.logger.log(
        `Scrape all sources completed: ${results.length} sources processed`
      );

      return results;
    } catch (error) {
      this.logger.error(`Scrape all sources job failed: ${error.message}`);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} of type ${job.name} started`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} of type ${job.name} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} failed: ${error.message}`
    );
  }
}

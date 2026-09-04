import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScrapingService } from './scraping.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapingSource } from '../tenders/entities/scraping-source.entity';

@Injectable()
export class ScheduledScrapingService {
  private readonly logger = new Logger(ScheduledScrapingService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    @InjectRepository(ScrapingSource)
    private readonly sourceRepository: Repository<ScrapingSource>,
  ) {}

  // Run every 6 hours
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduleScrapingAllSources() {
    this.logger.log('Starting scheduled scraping for all active sources');

    try {
      const sources = await this.sourceRepository.find({
        where: { is_active: true },
      });

      this.logger.log(`Found ${sources.length} active sources for scheduled scraping`);

      for (const source of sources) {
        await this.scrapingQueue.add(
          'scrape-source',
          {
            sourceId: source.id,
            sourceName: source.name,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: 10,
            removeOnFail: 5,
          }
        );
      }

      this.logger.log(`Scheduled ${sources.length} scraping jobs`);
    } catch (error) {
      this.logger.error(`Failed to schedule scraping: ${error.message}`);
    }
  }

  // Run daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyHealthCheck() {
    this.logger.log('Running daily health check for scraping sources');

    try {
      const health = await this.scrapingService.getSourceHealth();
      this.logger.log(
        `Health check results: ${health.healthy} healthy, ${health.degraded} degraded, ${health.unhealthy} unhealthy`
      );

      // Auto-disable unhealthy sources
      const sources = await this.sourceRepository.find();
      for (const source of sources) {
        if (source.health_score < 30 && source.is_active) {
          this.logger.warn(
            `Auto-disabling unhealthy source: ${source.name} (health score: ${source.health_score})`
          );
          await this.scrapingService.toggleSource(source.id, false);
        }
      }
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
    }
  }

  // Run every hour to check for urgent tenders (expiring soon)
  @Cron(CronExpression.EVERY_HOUR)
  async checkUrgentTenders() {
    this.logger.log('Checking for urgent tenders (expiring within 24 hours)');

    try {
      // This would trigger notifications for tenders expiring soon
      // Implementation depends on notification system
      this.logger.log('Urgent tender check completed');
    } catch (error) {
      this.logger.error(`Urgent tender check failed: ${error.message}`);
    }
  }

  // Manual trigger for testing
  async triggerScraping(sourceId?: string) {
    if (sourceId) {
      this.logger.log(`Manual scraping triggered for source: ${sourceId}`);
      await this.scrapingQueue.add('scrape-source', { sourceId });
    } else {
      this.logger.log('Manual scraping triggered for all sources');
      await this.scrapingQueue.add('scrape-all-sources');
    }
  }
}

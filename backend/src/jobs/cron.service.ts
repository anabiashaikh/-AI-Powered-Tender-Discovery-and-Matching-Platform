import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapingService } from '../tenders/scraping.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Run automated scraping every night at 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyScrape() {
    this.logger.log('Executing scheduled daily tender scraping jobs...');
    try {
      await this.scrapingService.scrapeAllActiveSources();
      this.logger.log('Scheduled daily tender scraping completed.');
    } catch (err) {
      this.logger.error(`Error in scheduled daily scrape: ${err.message}`);
    }
  }

  // Run daily match digest emails at 9:00 AM every morning
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyDigest() {
    this.logger.log('Executing scheduled daily digest email compilations...');
    try {
      await this.notificationsService.sendDigest(1); // 1 day lookback
      this.logger.log('Scheduled daily digest email dispatch completed.');
    } catch (err) {
      this.logger.error(`Error in scheduled daily digest: ${err.message}`);
    }
  }

  // Run weekly match digest emails at 9:00 AM every Monday morning
  @Cron('0 9 * * 1') // Monday at 9:00 AM
  async handleWeeklyDigest() {
    this.logger.log('Executing scheduled weekly digest email compilations...');
    try {
      await this.notificationsService.sendDigest(7); // 7 days lookback
      this.logger.log('Scheduled weekly digest email dispatch completed.');
    } catch (err) {
      this.logger.error(`Error in scheduled weekly digest: ${err.message}`);
    }
  }
}

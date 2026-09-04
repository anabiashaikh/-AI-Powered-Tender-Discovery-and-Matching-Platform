import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { ScrapingJobProcessor } from './jobs/scraping-job.processor';
import { ScheduledScrapingService } from './scheduled-scraping.service';
import { ScrapingSource } from '../tenders/entities/scraping-source.entity';
import { Tender } from '../tenders/entities/tender.entity';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScrapingSource, Tender]),
    BullModule.registerQueue({
      name: 'scraping',
    }),
    MatchingModule,
    NotificationsModule,
  ],
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingJobProcessor, ScheduledScrapingService],
  exports: [ScrapingService],
})
export class ScrapingModule {}

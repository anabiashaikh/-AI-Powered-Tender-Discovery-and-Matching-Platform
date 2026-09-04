import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MatchingJob } from './matching.job';
import { NotificationJob } from './notification.job';
import { CronService } from './cron.service';
import { TendersModule } from '../tenders/tenders.module';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'matching',
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    TendersModule,
    MatchingModule,
    NotificationsModule,
  ],
  providers: [MatchingJob, NotificationJob, CronService],
  exports: [MatchingJob, NotificationJob, CronService],
})
export class JobsModule {}

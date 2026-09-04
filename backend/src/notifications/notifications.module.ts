import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { NotificationHistory } from './entities/notification-history.entity';
import { User } from '../auth/entities/user.entity';
import { Tender } from '../tenders/entities/tender.entity';
import { TenderMatch } from '../matching/entities/tender-match.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationHistory, User, Tender, TenderMatch]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

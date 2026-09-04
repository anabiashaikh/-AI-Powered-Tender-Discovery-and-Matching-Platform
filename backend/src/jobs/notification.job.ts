import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('notifications')
export class NotificationJob {
  private readonly logger = new Logger(NotificationJob.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-email')
  async handleSendEmail(job: Job) {
    this.logger.log(`Processing send email job: ${job.id}`);
    const { userId, tenderId, matchId } = job.data;
    
    try {
      await this.notificationsService.sendMatchEmail(userId, tenderId, matchId);
      this.logger.log(`Successfully sent email to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-batch-emails')
  async handleSendBatchEmails(job: Job) {
    this.logger.log(`Processing send batch emails job: ${job.id}`);
    const { matches } = job.data;
    
    try {
      for (const match of matches) {
        await this.notificationsService.sendMatchEmail(match.userId, match.tenderId, match.matchId);
      }
      this.logger.log(`Successfully sent batch emails for ${matches.length} matches`);
    } catch (error) {
      this.logger.error(`Error sending batch emails: ${error.message}`);
      throw error;
    }
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Notification } from './entities/notification.entity';
import { NotificationHistory } from './entities/notification-history.entity';
import { User } from '../auth/entities/user.entity';
import { Tender } from '../tenders/entities/tender.entity';
import { TenderMatch } from '../matching/entities/tender-match.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | null = null;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationHistory)
    private notificationHistoryRepository: Repository<NotificationHistory>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
    @InjectRepository(TenderMatch)
    private tenderMatchRepository: Repository<TenderMatch>,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    return this.notificationRepository.save(notification);
  }

  async findAll(userId?: string): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (userId) {
      queryBuilder.where('notification.user_id = :userId', { userId });
    }

    return queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user', 'tender', 'match'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async sendMatchEmail(userId: string, tenderId: string, matchId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const tender = await this.tenderRepository.findOne({ where: { id: tenderId } });
    const match = await this.tenderMatchRepository.findOne({ 
      where: { id: matchId },
      relations: ['tender'],
    });

    if (!user || !tender || !match) {
      throw new NotFoundException('User, tender, or match not found');
    }

    const subject = `New Tender Match: ${tender.title} (${match.match_score}% match)`;
    const message = this.buildEmailMessage(user, tender, match);

    // Write notification record
    const notification = await this.notificationRepository.findOne({
      where: { user_id: userId, tender_id: tenderId, match_id: matchId },
    });

    try {
      this.logger.log(`Sending match email to ${user.email} for tender: ${tender.title}`);
      
      if (this.resend) {
        await this.resend.emails.send({
          from: this.configService.get('RESEND_FROM_EMAIL') || 'noreply@tenderdiscovery.com',
          to: user.email,
          subject,
          html: message,
        });
      } else {
        this.logger.warn(`Resend API key missing. Logged email subject: "${subject}"`);
      }

      // Update notification status
      if (notification) {
        notification.status = 'sent';
        notification.sent_at = new Date();
        await this.notificationRepository.save(notification);
      }

      // Add to history
      await this.notificationHistoryRepository.save({
        user_id: userId,
        notification_type: 'email',
        content: `Email sent for tender: ${tender.title}`,
      });
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`);
      
      if (notification) {
        notification.status = 'failed';
        await this.notificationRepository.save(notification);
      }

      throw error;
    }
  }

  private buildEmailMessage(user: User, tender: Tender, match: TenderMatch): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">New Tender Match Found!</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>We found a tender that matches your company profile with a <strong>${match.match_score}%</strong> match score.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #f3f4f6;">
          <h3 style="color: #4f46e5; margin-top: 0; margin-bottom: 10px;">${tender.title}</h3>
          <p style="margin: 5px 0;"><strong>Organization:</strong> ${tender.organization || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${tender.category || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Deadline:</strong> ${tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Budget Range:</strong> ${tender.budget_range || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${tender.location || 'N/A'}</p>
        </div>

        <h4 style="color: #333; margin-bottom: 5px;">Why this tender matches:</h4>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 0;">${match.match_explanation || 'AI analysis not available.'}</p>

        <p style="margin-top: 30px; text-align: center;">
          <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard/tenders/${tender.id}" 
             style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Tender Details
          </a>
        </p>
      </div>
    `;
  }

  async queueMatchEmail(userId: string, tenderId: string, matchId: string): Promise<void> {
    await this.create({
      user_id: userId,
      tender_id: tenderId,
      match_id: matchId,
      type: 'email',
      subject: 'New Tender Match',
      message: 'You have a new tender match with a high score.',
    });

    await this.notificationsQueue.add('send-email', {
      userId,
      tenderId,
      matchId,
    });

    this.logger.log(`Queued email notification for user ${userId}`);
  }

  async queueHighScoreMatches(threshold: number = 80): Promise<void> {
    const highScoreMatches = await this.tenderMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.company', 'company')
      .leftJoinAndSelect('company.user', 'user')
      .where('match.match_score >= :threshold', { threshold })
      .andWhere('match.created_at > :last24hours', { last24hours: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getMany();

    for (const match of highScoreMatches) {
      try {
        const user = match.company.user;
        if (user) {
          await this.queueMatchEmail(user.id, match.tender_id, match.id);
        }
      } catch (error) {
        this.logger.error(`Error queuing email for match ${match.id}: ${error.message}`);
      }
    }

    this.logger.log(`Queued ${highScoreMatches.length} high-score match emails`);
  }

  // Daily/Weekly Digests implementation
  async sendDigest(days: number): Promise<void> {
    const timeAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const matches = await this.tenderMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.company', 'company')
      .leftJoinAndSelect('match.tender', 'tender')
      .leftJoinAndSelect('company.user', 'user')
      .where('match.created_at >= :timeAgo', { timeAgo })
      .andWhere('match.match_score >= :score', { score: 75 })
      .getMany();

    this.logger.log(`Compiling ${days === 1 ? 'Daily' : 'Weekly'} Digest. Found ${matches.length} matches.`);

    // Group by user id
    const userMatches = new Map<string, { user: User; matches: TenderMatch[] }>();
    for (const match of matches) {
      const user = match.company.user;
      if (!user) continue;
      if (!userMatches.has(user.id)) {
        userMatches.set(user.id, { user, matches: [] });
      }
      userMatches.get(user.id)?.matches.push(match);
    }

    for (const [userId, data] of userMatches.entries()) {
      try {
        const subject = `${days === 1 ? 'Daily' : 'Weekly'} Tender Digest: ${data.matches.length} Matches Found`;
        const emailContent = this.buildDigestEmail(data.user, data.matches, days);
        
        if (this.resend) {
          await this.resend.emails.send({
            from: this.configService.get('RESEND_FROM_EMAIL') || 'noreply@tenderdiscovery.com',
            to: data.user.email,
            subject,
            html: emailContent,
          });
          this.logger.log(`Sent ${days === 1 ? 'daily' : 'weekly'} digest email to ${data.user.email}`);
        } else {
          this.logger.warn(`Resend API key missing. Mocking digest send to ${data.user.email}`);
        }

        // Add history
        await this.notificationHistoryRepository.save({
          user_id: userId,
          notification_type: `${days === 1 ? 'daily' : 'weekly'}_digest`,
          content: `Sent ${days === 1 ? 'daily' : 'weekly'} digest with ${data.matches.length} matches.`,
        });
      } catch (err) {
        this.logger.error(`Failed to send digest to ${data.user.email}: ${err.message}`);
      }
    }
  }

  private buildDigestEmail(user: User, matches: TenderMatch[], days: number): string {
    const listHtml = matches.map(m => `
      <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
        <h4 style="margin: 0 0 5px; color: #4f46e5; font-size: 16px;">${m.tender.title} (${m.match_score}% Match)</h4>
        <p style="margin: 0 0 5px; font-size: 14px; color: #333;"><strong>Org:</strong> ${m.tender.organization || 'N/A'} | <strong>Deadline:</strong> ${m.tender.deadline ? new Date(m.tender.deadline).toLocaleDateString() : 'N/A'}</p>
        <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.4;">${m.match_explanation?.slice(0, 180) || 'AI analysis report.'}...</p>
      </div>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 25px; border-radius: 8px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-top: 0;">Your ${days === 1 ? 'Daily' : 'Weekly'} Tender Digest</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>We found ${matches.length} high-score tender matches matching your company profile over the last ${days === 1 ? '24 hours' : '7 days'}:</p>
        
        <div style="margin: 20px 0;">
          ${listHtml}
        </div>

        <p style="text-align: center; margin-top: 30px;">
          <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard" 
             style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open Dashboard
          </a>
        </p>
      </div>
    `;
  }

  async getNotificationHistory(userId: string): Promise<NotificationHistory[]> {
    return this.notificationHistoryRepository.find({
      where: { user_id: userId },
      order: { sent_at: 'DESC' },
      take: 50,
    });
  }

  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }
}

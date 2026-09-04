import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CompanyProfile } from '../../company/entities/company-profile.entity';
import { AIConversation } from '../../assistant/entities/ai-conversation.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationHistory } from '../../notifications/entities/notification-history.entity';
import { RefreshToken } from './refresh-token.entity';
import { UserSession } from './user-session.entity';
import { AuditLog } from './audit-log.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ default: 'company_user' })
  role: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true })
  verification_token: string;

  @Column({ nullable: true })
  reset_token: string;

  @Column({ type: 'timestamp', nullable: true })
  reset_token_expires: Date;

  @Column({ nullable: true, unique: true })
  google_id: string;

  @Column({ nullable: true, unique: true })
  microsoft_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => CompanyProfile, company => company.user)
  company_profiles: CompanyProfile[];

  @OneToMany(() => AIConversation, conv => conv.user)
  ai_conversations: AIConversation[];

  @OneToMany(() => Notification, notif => notif.user)
  notifications: Notification[];

  @OneToMany(() => NotificationHistory, history => history.user)
  notification_history: NotificationHistory[];

  @OneToMany(() => RefreshToken, token => token.user)
  refresh_tokens: RefreshToken[];

  @OneToMany(() => UserSession, session => session.user)
  sessions: UserSession[];

  @OneToMany(() => AuditLog, log => log.user)
  audit_logs: AuditLog[];
}

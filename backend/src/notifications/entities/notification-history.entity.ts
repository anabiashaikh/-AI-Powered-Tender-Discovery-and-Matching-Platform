import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('notification_history')
export class NotificationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ name: 'notification_type' })
  notification_type: string;

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'sent_at' })
  sent_at: Date;

  @ManyToOne(() => User, user => user.notification_history)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

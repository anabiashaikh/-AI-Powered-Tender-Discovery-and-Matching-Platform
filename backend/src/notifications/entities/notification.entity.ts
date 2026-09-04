import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Tender } from '../../tenders/entities/tender.entity';
import { TenderMatch } from '../../matching/entities/tender-match.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ nullable: true, name: 'tender_id' })
  tender_id: string;

  @Column({ nullable: true, name: 'match_id' })
  match_id: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  subject: string;

  @Column('text', { nullable: true })
  message: string;

  @Column({ nullable: true, name: 'sent_at' })
  sent_at: Date;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Tender, tender => tender.notifications)
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @ManyToOne(() => TenderMatch, match => match.notifications)
  @JoinColumn({ name: 'match_id' })
  match: TenderMatch;
}

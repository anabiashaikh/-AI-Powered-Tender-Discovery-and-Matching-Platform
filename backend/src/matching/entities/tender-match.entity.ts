import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CompanyProfile } from '../../company/entities/company-profile.entity';
import { Tender } from '../../tenders/entities/tender.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('tender_matches')
export class TenderMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  company_id: string;

  @Column({ name: 'tender_id' })
  tender_id: string;

  @Column()
  match_score: number;

  @Column({ default: 0, name: 'confidence_score' })
  confidence_score: number;

  @Column('text', { nullable: true })
  match_explanation: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => CompanyProfile, company => company.tender_matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyProfile;

  @ManyToOne(() => Tender, tender => tender.tender_matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @OneToMany(() => Notification, notif => notif.match)
  notifications: Notification[];
}

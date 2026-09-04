import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ScrapingSource } from './scraping-source.entity';
import { TenderMatch } from '../../matching/entities/tender-match.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('tenders')
export class Tender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true, name: 'source_url' })
  source_url: string;

  @Column({ nullable: true })
  organization: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true, name: 'budget_range' })
  budget_range: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true, name: 'province_region' })
  province_region: string;

  @Column({ nullable: true, name: 'tender_number' })
  tender_number: string;

  @Column({ nullable: true, name: 'procurement_type' })
  procurement_type: string;

  @Column({ nullable: true, name: 'published_date' })
  published_date: Date;

  @Column({ nullable: true, name: 'source_id' })
  source_id: string;

  @Column({ unique: true, nullable: true })
  hash: string;

  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  embedding: number[];

  @ManyToOne(() => ScrapingSource, source => source.tenders)
  @JoinColumn({ name: 'source_id' })
  source: ScrapingSource;

  @CreateDateColumn({ name: 'scraped_at' })
  scraped_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TenderMatch, match => match.tender)
  tender_matches: TenderMatch[];

  @OneToMany(() => Notification, notif => notif.tender)
  notifications: Notification[];
}

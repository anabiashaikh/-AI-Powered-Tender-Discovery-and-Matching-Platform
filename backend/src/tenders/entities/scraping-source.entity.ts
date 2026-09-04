import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Tender } from './tender.entity';

@Entity('scraping_sources')
export class ScrapingSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column()
  region: string;

  @Column('jsonb', { nullable: true })
  selector_config: Record<string, any>;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 'daily', name: 'scraping_frequency' })
  scraping_frequency: string;

  @Column({ nullable: true, name: 'last_scraped_at' })
  last_scraped_at: Date;

  @Column({ nullable: true, name: 'last_success_at' })
  last_success_at: Date;

  @Column({ nullable: true, name: 'last_error_at' })
  last_error_at: Date;

  @Column({ nullable: true, name: 'last_error_message', type: 'text' })
  last_error_message: string;

  @Column({ default: 0, name: 'total_scraped' })
  total_scraped: number;

  @Column({ default: 0, name: 'total_failed' })
  total_failed: number;

  @Column({ default: 100, name: 'health_score' })
  health_score: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Tender, tender => tender.source)
  tenders: Tender[];
}

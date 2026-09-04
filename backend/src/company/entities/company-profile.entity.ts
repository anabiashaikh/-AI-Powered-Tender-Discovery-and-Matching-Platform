import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { TenderMatch } from '../../matching/entities/tender-match.entity';

@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column()
  company_name: string;

  @Column({ nullable: true })
  industry: string;

  @Column('text', { array: true, nullable: true })
  services: string[];

  @Column('text', { array: true, nullable: true })
  keywords: string[];

  @Column({ nullable: true })
  country: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { array: true, nullable: true })
  certifications: string[];

  @Column({ nullable: true, name: 'website_url' })
  website_url: string;

  @Column({ type: 'jsonb', nullable: true })
  embedding: number[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, user => user.company_profiles)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => TenderMatch, match => match.company)
  tender_matches: TenderMatch[];
}

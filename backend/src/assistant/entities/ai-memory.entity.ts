import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CompanyProfile } from '../../company/entities/company-profile.entity';

@Entity('ai_memories')
@Unique(['company_id', 'key'])
export class AIMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_id: string;

  @Column()
  key: string;

  @Column('text')
  value: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => CompanyProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyProfile;
}

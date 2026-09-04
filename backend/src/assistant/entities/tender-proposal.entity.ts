import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CompanyProfile } from '../../company/entities/company-profile.entity';
import { Tender } from '../../tenders/entities/tender.entity';

@Entity('tender_proposals')
@Unique(['company_id', 'tender_id'])
export class TenderProposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_id: string;

  @Column()
  tender_id: string;

  @Column('text')
  proposal_draft: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => CompanyProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyProfile;

  @ManyToOne(() => Tender, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;
}

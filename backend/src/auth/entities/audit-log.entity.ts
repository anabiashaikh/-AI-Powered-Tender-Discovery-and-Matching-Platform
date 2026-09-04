import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  user_id: string;

  @Column()
  action: string;

  @Column()
  entity_type: string;

  @Column({ nullable: true })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.audit_logs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

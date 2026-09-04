import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { InviteUsage } from './invite-usage.entity';

@Entity('invite_codes')
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  role: string;

  @Column({ default: 1 })
  max_uses: number;

  @Column({ default: 0 })
  uses: number;

  @Column({ nullable: true })
  created_by: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => InviteUsage, usage => usage.inviteCode)
  usages: InviteUsage[];
}

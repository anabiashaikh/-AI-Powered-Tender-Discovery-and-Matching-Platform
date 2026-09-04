import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InviteCode } from './invite-code.entity';
import { User } from './user.entity';

@Entity('invite_usage')
export class InviteUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invite_code_id: string;

  @Column()
  registered_user_id: string;

  @CreateDateColumn()
  used_at: Date;

  @ManyToOne(() => InviteCode, code => code.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invite_code_id' })
  inviteCode: InviteCode;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registered_user_id' })
  registeredUser: User;
}

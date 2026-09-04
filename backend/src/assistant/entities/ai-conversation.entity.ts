import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('ai_conversations')
export class AIConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column('text')
  question: string;

  @Column('text', { nullable: true })
  answer: string;

  @Column('jsonb', { nullable: true })
  context: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.ai_conversations)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  question: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

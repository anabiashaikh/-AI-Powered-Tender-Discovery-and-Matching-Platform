import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  user_id: string;

  @IsString()
  @IsOptional()
  tender_id?: string;

  @IsString()
  @IsOptional()
  match_id?: string;

  @IsString()
  @IsEnum(['email', 'in_app'])
  type: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

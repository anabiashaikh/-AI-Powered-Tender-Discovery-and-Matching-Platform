import { IsString, IsOptional, IsDateString, IsUrl, MaxLength } from 'class-validator';

export class CreateTenderDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsUrl()
  @IsOptional()
  source_url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  organization?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  budget_range?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @IsString()
  @IsOptional()
  source_id?: string;
}

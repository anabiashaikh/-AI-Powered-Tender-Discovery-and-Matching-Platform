import { IsString, IsOptional, IsBoolean, IsUrl, IsObject, MaxLength } from 'class-validator';

export class CreateScrapingSourceDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsUrl()
  url: string;

  @IsObject()
  @IsOptional()
  selector_config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  scraping_frequency?: string;
}

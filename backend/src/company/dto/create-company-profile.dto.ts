import { IsString, IsArray, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateCompanyProfileDto {
  @IsString()
  @MaxLength(255)
  company_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  services?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @IsUrl()
  @IsOptional()
  website_url?: string;
}

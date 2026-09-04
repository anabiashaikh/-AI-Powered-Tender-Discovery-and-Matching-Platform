import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  company_id: string;

  @IsString()
  tender_id: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  match_score: number;

  @IsString()
  @IsOptional()
  match_explanation?: string;
}

import { PartialType } from '@nestjs/mapped-types';
import { CreateScrapingSourceDto } from './create-scraping-source.dto';

export class UpdateScrapingSourceDto extends PartialType(CreateScrapingSourceDto) {}

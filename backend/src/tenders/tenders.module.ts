import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TendersService } from './tenders.service';
import { TendersController } from './tenders.controller';
import { ScrapingService } from './scraping.service';
import { TenderSearchService } from './tender-search.service';
import { TenderSearchController } from './tender-search.controller';
import { Tender } from './entities/tender.entity';
import { ScrapingSource } from './entities/scraping-source.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tender, ScrapingSource])],
  controllers: [TendersController, TenderSearchController],
  providers: [TendersService, ScrapingService, TenderSearchService],
  exports: [TendersService, ScrapingService, TenderSearchService],
})
export class TendersModule {}

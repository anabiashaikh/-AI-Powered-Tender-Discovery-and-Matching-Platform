import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TenderMatch } from '../matching/entities/tender-match.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { Tender } from '../tenders/entities/tender.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TenderMatch, CompanyProfile, Tender])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

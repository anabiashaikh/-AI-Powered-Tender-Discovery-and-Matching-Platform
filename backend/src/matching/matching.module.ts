import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { TenderMatch } from './entities/tender-match.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { Tender } from '../tenders/entities/tender.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TenderMatch, CompanyProfile, Tender])],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}

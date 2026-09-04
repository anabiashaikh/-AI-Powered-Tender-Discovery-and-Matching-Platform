import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../auth/entities/user.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { ScrapingSource } from '../tenders/entities/scraping-source.entity';
import { SystemLog } from './entities/system-log.entity';

import { Tender } from '../tenders/entities/tender.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { InviteCode } from '../auth/entities/invite-code.entity';
import { UserSession } from '../auth/entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      CompanyProfile,
      ScrapingSource,
      SystemLog,
      Tender,
      AuditLog,
      InviteCode,
      UserSession,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

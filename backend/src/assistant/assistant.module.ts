import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { AssistantGateway } from './assistant.gateway';
import { AIConversation } from './entities/ai-conversation.entity';
import { AIMemory } from './entities/ai-memory.entity';
import { TenderProposal } from './entities/tender-proposal.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { TenderMatch } from '../matching/entities/tender-match.entity';
import { Tender } from '../tenders/entities/tender.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIConversation,
      AIMemory,
      TenderProposal,
      CompanyProfile,
      TenderMatch,
      Tender,
    ]),
  ],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantGateway],
  exports: [AssistantService],
})
export class AssistantModule {}

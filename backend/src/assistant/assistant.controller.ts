import { Controller, Post, Body, Get, UseGuards, Param, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssistantService } from './assistant.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/user.decorator';

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('ask')
  async askQuestion(
    @GetUser('id') userId: string,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.assistantService.askQuestion(userId, createConversationDto);
  }

  @Get('history')
  async getConversationHistory(
    @GetUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.assistantService.getConversationHistory(
      userId,
      limit ? parseInt(limit) : undefined,
    );
  }

  // Opportunity Ranking
  @Get('rank/:companyId')
  async rankOpportunities(@Param('companyId') companyId: string) {
    return this.assistantService.rankOpportunities(companyId);
  }

  // RFP Proposal Suggestions
  @Post('proposal/generate')
  async generateProposal(
    @Body() body: { company_id: string; tender_id: string },
  ) {
    return this.assistantService.generateProposalDraft(body.company_id, body.tender_id);
  }

  @Get('proposal/:companyId/:tenderId')
  async getProposal(
    @Param('companyId') companyId: string,
    @Param('tenderId') tenderId: string,
  ) {
    return this.assistantService.getProposalDraft(companyId, tenderId);
  }

  // Company AI Memory
  @Post('memory')
  async saveMemory(
    @Body() body: { company_id: string; key: string; value: string },
  ) {
    return this.assistantService.saveMemory(body.company_id, body.key, body.value);
  }

  @Get('memory/:companyId')
  async getMemories(@Param('companyId') companyId: string) {
    return this.assistantService.getAllMemories(companyId);
  }

  // Voice Interaction (HTTP fallback endpoint)
  @Post('voice')
  @UseInterceptors(FileInterceptor('audio'))
  async handleVoiceFile(
    @GetUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const transcription = await this.assistantService.transcribeAudio(file.buffer);
    if (!transcription) {
      return { textResponse: 'Could not transcribe audio' };
    }
    const response = await this.assistantService.processVoiceCommand(userId, transcription);
    const audioBuffer = await this.assistantService.synthesizeSpeech(response.textResponse);
    
    return {
      transcription,
      textResponse: response.textResponse,
      actionData: response.actionData,
      audioBase64: audioBuffer.toString('base64'),
    };
  }
}

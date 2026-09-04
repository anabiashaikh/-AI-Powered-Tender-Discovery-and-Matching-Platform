import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIConversation } from './entities/ai-conversation.entity';
import { AIMemory } from './entities/ai-memory.entity';
import { TenderProposal } from './entities/tender-proposal.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { TenderMatch } from '../matching/entities/tender-match.entity';
import { Tender } from '../tenders/entities/tender.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(AIConversation)
    private aiConversationRepository: Repository<AIConversation>,
    @InjectRepository(AIMemory)
    private aiMemoryRepository: Repository<AIMemory>,
    @InjectRepository(TenderProposal)
    private tenderProposalRepository: Repository<TenderProposal>,
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
    @InjectRepository(TenderMatch)
    private tenderMatchRepository: Repository<TenderMatch>,
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  // Ask Question (Classic Non-Streaming)
  async askQuestion(userId: string, createConversationDto: CreateConversationDto): Promise<AIConversation> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const context = await this.buildContext(userId, companyProfile, createConversationDto.question);
    const answer = await this.getAIAnswer(createConversationDto.question, context);

    const conversation = this.aiConversationRepository.create({
      user_id: userId,
      question: createConversationDto.question,
      answer,
      context: {
        ...createConversationDto.context,
        companyProfile: {
          company_name: companyProfile.company_name,
          industry: companyProfile.industry,
          services: companyProfile.services,
          keywords: companyProfile.keywords,
        },
      },
    });

    return this.aiConversationRepository.save(conversation);
  }

  // Ask Question Stream (WebSockets and Streaming)
  async askQuestionStream(
    userId: string,
    question: string,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found. Please create one.');
    }

    const context = await this.buildContext(userId, companyProfile, question);
    const memories = await this.getAllMemories(companyProfile.id);
    const memoryString = memories.map(m => `${m.key}: ${m.value}`).join('\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for a tender discovery platform. Help users find relevant tenders and understand their matches. 
            Use the provided context and company memory to give accurate answers.
            
            Company Memory Context:\n${memoryString}\n\nTender Platform Context:\n${context}`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
        stream: true,
      });

      let fullAnswer = '';
      for await (const chunk of completion) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullAnswer += token;
          onChunk(token);
        }
      }

      // Log conversation to history
      await this.aiConversationRepository.save({
        user_id: userId,
        question,
        answer: fullAnswer,
        context: { streaming: true },
      });

      return fullAnswer;
    } catch (error) {
      this.logger.error(`Error in streaming chat: ${error.message}`);
      throw error;
    }
  }

  // Company AI Memory Operations
  async saveMemory(companyId: string, key: string, value: string): Promise<AIMemory> {
    const existing = await this.aiMemoryRepository.findOne({
      where: { company_id: companyId, key },
    });

    if (existing) {
      existing.value = value;
      return this.aiMemoryRepository.save(existing);
    }

    const memory = this.aiMemoryRepository.create({
      company_id: companyId,
      key,
      value,
    });
    return this.aiMemoryRepository.save(memory);
  }

  async getMemory(companyId: string, key: string): Promise<AIMemory | null> {
    return this.aiMemoryRepository.findOne({
      where: { company_id: companyId, key },
    });
  }

  async getAllMemories(companyId: string): Promise<AIMemory[]> {
    return this.aiMemoryRepository.find({
      where: { company_id: companyId },
    });
  }

  // Rank Opportunities for Company
  async rankOpportunities(companyId: string): Promise<TenderMatch[]> {
    return this.tenderMatchRepository.find({
      where: { company_id: companyId },
      relations: ['tender'],
      order: { match_score: 'DESC', confidence_score: 'DESC' },
      take: 20,
    });
  }

  // Generate Tender Proposal Draft
  async generateProposalDraft(companyId: string, tenderId: string): Promise<TenderProposal> {
    const company = await this.companyProfileRepository.findOne({ where: { id: companyId } });
    const tender = await this.tenderRepository.findOne({ where: { id: tenderId } });

    if (!company || !tender) {
      throw new NotFoundException('Company or Tender not found');
    }

    const existing = await this.tenderProposalRepository.findOne({
      where: { company_id: companyId, tender_id: tenderId },
    });

    if (existing) {
      return existing;
    }

    try {
      const prompt = `
Generate a professional executive bid proposal response for the following tender:

Tender Title: ${tender.title}
Tender Description: ${tender.description}
Tender Category: ${tender.category || 'N/A'}
Issuing Organization: ${tender.organization || 'N/A'}

Our Company Profile:
Company Name: ${company.company_name}
Industry: ${company.industry}
Key Services Offered: ${company.services?.join(', ')}
Our Description: ${company.description}
Certifications: ${company.certifications?.join(', ')}

Structure the draft response with the following sections:
1. Executive Summary
2. Alignment with Tender Requirements
3. Proposed Solution & Scope of Work
4. Qualifications & Past Experience
5. Pricing Methodology & Contact Details
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert procurement consultant specializing in winning RFP responses.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      });

      const draftText = response.choices[0].message.content || 'Draft creation failed.';

      const proposal = this.tenderProposalRepository.create({
        company_id: companyId,
        tender_id: tenderId,
        proposal_draft: draftText,
      });

      return this.tenderProposalRepository.save(proposal);
    } catch (err) {
      this.logger.error(`Failed to generate proposal draft: ${err.message}`);
      throw err;
    }
  }

  async getProposalDraft(companyId: string, tenderId: string): Promise<TenderProposal> {
    const proposal = await this.tenderProposalRepository.findOne({
      where: { company_id: companyId, tender_id: tenderId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal draft not found. Please generate it first.');
    }

    return proposal;
  }

  // Voice Speech-To-Text (Whisper)
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Create a temporary file to send to OpenAI API
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempPath = path.join(tempDir, `voice_${Date.now()}.wav`);
      fs.writeFileSync(tempPath, audioBuffer);

      const fileStream = fs.createReadStream(tempPath);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
      });

      // Cleanup
      fs.unlinkSync(tempPath);

      return transcription.text;
    } catch (err) {
      this.logger.error(`STT Transcription error: ${err.message}`);
      return '';
    }
  }

  // Voice Text-To-Speech (TTS)
  async synthesizeSpeech(text: string): Promise<Buffer> {
    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      this.logger.error(`TTS Synthesis error: ${err.message}`);
      throw err;
    }
  }

  // Process Voice Command
  async processVoiceCommand(userId: string, transcription: string): Promise<{ textResponse: string; actionData?: any }> {
    const text = transcription.toLowerCase();
    
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      return { textResponse: 'Please configure your company profile before running voice commands.' };
    }

    // Voice Command: Find Tenders / Search Opportunities
    if (text.includes('find') || text.includes('search') || text.includes('opportunities')) {
      const matches = await this.tenderMatchRepository.find({
        where: { company_id: companyProfile.id },
        relations: ['tender'],
        order: { match_score: 'DESC' },
        take: 3,
      });

      if (matches.length === 0) {
        return { textResponse: 'I did not find any matched opportunities for your company at this time.' };
      }

      const listStr = matches.map((m, i) => `${i + 1}. "${m.tender.title}" with a match score of ${m.match_score} percent.`).join(' ');
      return {
        textResponse: `Here are your top 3 matching opportunities: ${listStr}`,
        actionData: { type: 'find_tenders', matches },
      };
    }

    // Voice Command: Explain Tender
    if (text.includes('explain') || text.includes('why')) {
      const topMatch = await this.tenderMatchRepository.findOne({
        where: { company_id: companyProfile.id },
        relations: ['tender'],
        order: { match_score: 'DESC' },
      });

      if (!topMatch) {
        return { textResponse: 'You do not have any matched tenders yet. Please run discovery first.' };
      }

      const explanationShort = topMatch.match_explanation?.slice(0, 200) || 'No explanation report compiled.';
      return {
        textResponse: `Explaining match for "${topMatch.tender.title}": ${explanationShort}...`,
        actionData: { type: 'explain_tender', match: topMatch },
      };
    }

    // Voice Command: Show Deadlines
    if (text.includes('deadline') || text.includes('due') || text.includes('date')) {
      const matches = await this.tenderMatchRepository.find({
        where: { company_id: companyProfile.id },
        relations: ['tender'],
        order: { match_score: 'DESC' },
        take: 3,
      });

      const deadlineStr = matches
        .filter(m => m.tender.deadline)
        .map(m => `"${m.tender.title}" is due on ${new Date(m.tender.deadline).toLocaleDateString()}.`)
        .join(' ');

      return {
        textResponse: deadlineStr ? `Here are upcoming deadlines: ${deadlineStr}` : 'No upcoming deadlines registered.',
        actionData: { type: 'show_deadlines', matches },
      };
    }

    // General AI chat backup if no command matches
    const context = await this.buildContext(userId, companyProfile, transcription);
    const answer = await this.getAIAnswer(transcription, context);
    return { textResponse: answer };
  }

  // Classic Context Builder
  private async buildContext(userId: string, companyProfile: CompanyProfile, question: string): Promise<string> {
    let context = `Company Profile:\n- Name: ${companyProfile.company_name}\n- Industry: ${companyProfile.industry}\n- Services: ${companyProfile.services?.join(', ')}\n- Keywords: ${companyProfile.keywords?.join(', ')}\n\n`;

    if (question.toLowerCase().includes('tender') || question.toLowerCase().includes('match') || question.toLowerCase().includes('proposal')) {
      const matches = await this.tenderMatchRepository.find({
        where: { company_id: companyProfile.id },
        relations: ['tender'],
        order: { match_score: 'DESC' },
        take: 5,
      });

      context += `Top Matched Tenders:\n`;
      matches.forEach((match, index) => {
        context += `${index + 1}. Title: ${match.tender.title}\n- Category: ${match.tender.category}\n- Score: ${match.match_score}%\n- Explanation: ${match.match_explanation?.slice(0, 150)}...\n\n`;
      });
    }

    return context;
  }

  private async getAIAnswer(question: string, context: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const isDevKey = !apiKey || apiKey.includes('placeholder') || apiKey.startsWith('sk-test');

    if (isDevKey) {
      const tenderCount = await this.tenderRepository.count();
      return `Based on your company profile and our tender database (${tenderCount} active tenders from sources including World Bank, TED, CanadaBuys, and UNGM), I can help you find relevant opportunities. Your question was: "${question}". Configure a valid OPENAI_API_KEY for full AI-powered responses. Context summary: ${context.slice(0, 500)}...`;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant for a tender discovery platform. Help users find relevant tenders and understand their matches. Use the provided context to give accurate answers.',
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      return completion.choices[0].message.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      this.logger.error(`Error getting AI answer: ${error.message}`);
      return 'I apologize, but I encountered an error processing your question. Please try again.';
    }
  }

  async getConversationHistory(userId: string, limit: number = 20): Promise<AIConversation[]> {
    return this.aiConversationRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getConversation(id: string, userId: string): Promise<AIConversation> {
    const conversation = await this.aiConversationRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}

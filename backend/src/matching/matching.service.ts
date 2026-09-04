import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { TenderMatch } from './entities/tender-match.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { Tender } from '../tenders/entities/tender.entity';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(TenderMatch)
    private tenderMatchRepository: Repository<TenderMatch>,
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  // Generate OpenAI Embedding
  async getEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
      return new Array(1536).fill(0);
    }
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Error generating embedding: ${error.message}`);
      // Return a 1536-size zero array as fallback
      return new Array(1536).fill(0);
    }
  }

  // Ensure Company profile has embedding
  async ensureCompanyEmbedding(company: CompanyProfile): Promise<CompanyProfile> {
    if (company.embedding && company.embedding.length === 1536) {
      return company;
    }

    const textToEmbed = [
      company.company_name,
      company.industry,
      company.description,
      company.services?.join(' '),
      company.keywords?.join(' '),
    ].filter(Boolean).join('. ');

    this.logger.log(`Generating embedding for company: ${company.company_name}`);
    const embedding = await this.getEmbedding(textToEmbed);
    company.embedding = embedding;
    return this.companyProfileRepository.save(company);
  }

  // Ensure Tender has embedding
  async ensureTenderEmbedding(tender: Tender): Promise<Tender> {
    if (tender.embedding && tender.embedding.length === 1536) {
      return tender;
    }

    const textToEmbed = [
      tender.title,
      tender.description,
      tender.category,
      tender.organization,
    ].filter(Boolean).join('. ');

    this.logger.log(`Generating embedding for tender: ${tender.title}`);
    const embedding = await this.getEmbedding(textToEmbed);
    tender.embedding = embedding;
    return this.tenderRepository.save(tender);
  }

  // Calculate Match Score and Report
  async calculateMatch(companyId: string, tenderId: string): Promise<TenderMatch> {
    let company = await this.companyProfileRepository.findOne({
      where: { id: companyId },
    });

    let tender = await this.tenderRepository.findOne({
      where: { id: tenderId },
    });

    if (!company) {
      throw new NotFoundException('Company profile not found');
    }

    if (!tender) {
      throw new NotFoundException('Tender not found');
    }

    // Ensure embeddings exist
    company = await this.ensureCompanyEmbedding(company);
    tender = await this.ensureTenderEmbedding(tender);

    // Calculate semantic dot product similarity (cosine similarity)
    let semanticScore = 50;
    if (company.embedding && tender.embedding) {
      const dotProduct = company.embedding.reduce((sum, val, idx) => sum + val * tender.embedding[idx], 0);
      // Cosine similarity for normalized vectors is simply dot product. Map it from [-1, 1] to [0, 100]
      semanticScore = Math.round(((dotProduct + 1) / 2) * 100);
    }

    // Call GPT-4 to generate match details, explainability report, and final scores
    const { matchScore, confidenceScore, explanation } = await this.getAIScoreAndReport(company, tender, semanticScore);

    const existingMatch = await this.tenderMatchRepository.findOne({
      where: { company_id: companyId, tender_id: tenderId },
    });

    if (existingMatch) {
      existingMatch.match_score = matchScore;
      existingMatch.confidence_score = confidenceScore;
      existingMatch.match_explanation = explanation;
      return this.tenderMatchRepository.save(existingMatch);
    }

    const match = this.tenderMatchRepository.create({
      company_id: companyId,
      tender_id: tenderId,
      match_score: matchScore,
      confidence_score: confidenceScore,
      match_explanation: explanation,
    });

    return this.tenderMatchRepository.save(match);
  }

  private async getAIScoreAndReport(
    company: CompanyProfile,
    tender: Tender,
    semanticScore: number,
  ): Promise<{ matchScore: number; confidenceScore: number; explanation: string }> {
    try {
      const prompt = `
Company Profile:
- Company Name: ${company.company_name}
- Industry: ${company.industry || 'Not specified'}
- Services: ${company.services?.join(', ') || 'Not specified'}
- Keywords: ${company.keywords?.join(', ') || 'Not specified'}
- Country: ${company.country || 'Not specified'}
- Description: ${company.description || 'Not specified'}
- Certifications: ${company.certifications?.join(', ') || 'Not specified'}

Tender Details:
- Title: ${tender.title}
- Description: ${tender.description || 'Not specified'}
- Organization: ${tender.organization || 'Not specified'}
- Category: ${tender.category || 'Not specified'}
- Budget Range: ${tender.budget_range || 'Not specified'}
- Location: ${tender.location || 'Not specified'}

Computed Semantic Embedding Similarity Score: ${semanticScore}/100

Perform a principal capability assessment. Provide:
1. A finalized match score from 0-100 (where 100 is a perfect capability match).
2. A confidence score from 0-100 indicating how certain we are of this match based on the data provided.
3. A detailed explainability report detailing match alignment strengths, capability gaps, and key bid recommendation points.

Format your response exactly as:
Match Score: [number]
Confidence Score: [number]
Explanation: [detailed text]
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an enterprise AI matching engine. Rate compatibility between company profiles and government/private tenders.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
      });

      const response = completion.choices[0].message.content || '';
      
      const scoreMatch = response.match(/Match Score:\s*(\d+)/i);
      const matchScore = scoreMatch ? parseInt(scoreMatch[1]) : semanticScore;

      const confidenceMatch = response.match(/Confidence Score:\s*(\d+)/i);
      const confidenceScore = confidenceMatch ? parseInt(confidenceMatch[1]) : 70;
      
      const explanationMatch = response.match(/Explanation:\s*(.*)/is);
      const explanation = explanationMatch ? explanationMatch[1].trim() : response;

      return {
        matchScore: Math.min(100, Math.max(0, matchScore)),
        confidenceScore: Math.min(100, Math.max(0, confidenceScore)),
        explanation,
      };
    } catch (error) {
      this.logger.error(`Error getting AI scoring report: ${error.message}`);
      return {
        matchScore: semanticScore,
        confidenceScore: 60,
        explanation: 'AI report generation fell back to semantic embedding computation due to an external API interruption.',
      };
    }
  }

  // Similar Opportunity Detection using pgvector Cosine distance
  async findSimilarTenders(tenderId: string, limit: number = 5): Promise<Tender[]> {
    const tender = await this.tenderRepository.findOne({ where: { id: tenderId } });
    if (!tender) {
      throw new NotFoundException('Tender not found');
    }

    const resolvedTender = await this.ensureTenderEmbedding(tender);

    if (resolvedTender.embedding?.length) {
      const similar = await this.tenderRepository
        .createQueryBuilder('t')
        .where('t.id != :id', { id: tenderId })
        .andWhere('t.embedding IS NOT NULL')
        .orderBy('t.created_at', 'DESC')
        .take(limit * 3)
        .getMany();

      return similar
        .map((t) => ({
          tender: t,
          score: this.cosineSimilarity(resolvedTender.embedding!, t.embedding || []),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.tender);
    }

    return this.tenderRepository.find({
      where: { category: tender.category || undefined },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    const dot = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  async findMatchesByCompany(companyId: string, minScore?: number): Promise<TenderMatch[]> {
    const queryBuilder = this.tenderMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.tender', 'tender')
      .where('match.company_id = :companyId', { companyId });

    if (minScore !== undefined) {
      queryBuilder.andWhere('match.match_score >= :minScore', { minScore });
    }

    return queryBuilder
      .orderBy('match.match_score', 'DESC')
      .getMany();
  }

  async findMatchesByTender(tenderId: string): Promise<TenderMatch[]> {
    return this.tenderMatchRepository.find({
      where: { tender_id: tenderId },
      relations: ['company'],
      order: { match_score: 'DESC' },
    });
  }

  async findOneMatch(id: string): Promise<TenderMatch> {
    const match = await this.tenderMatchRepository.findOne({
      where: { id },
      relations: ['company', 'tender'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async calculateAllMatchesForCompany(companyId: string): Promise<void> {
    const company = await this.companyProfileRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company profile not found');
    }

    const tenders = await this.tenderRepository.find();

    this.logger.log(`Calculating matches for ${tenders.length} tenders`);

    for (const tender of tenders) {
      try {
        await this.calculateMatch(companyId, tender.id);
      } catch (error) {
        this.logger.error(`Error calculating match for tender ${tender.id}: ${error.message}`);
      }
    }
  }

  async calculateAllMatchesForTender(tenderId: string): Promise<void> {
    const tender = await this.tenderRepository.findOne({
      where: { id: tenderId },
    });

    if (!tender) {
      throw new NotFoundException('Tender not found');
    }

    const companies = await this.companyProfileRepository.find();

    this.logger.log(`Calculating matches for ${companies.length} companies`);

    for (const company of companies) {
      try {
        await this.calculateMatch(company.id, tenderId);
      } catch (error) {
        this.logger.error(`Error calculating match for company ${company.id}: ${error.message}`);
      }
    }
  }
}

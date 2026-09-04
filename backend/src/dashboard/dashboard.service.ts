import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenderMatch } from '../matching/entities/tender-match.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { Tender } from '../tenders/entities/tender.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(TenderMatch)
    private tenderMatchRepository: Repository<TenderMatch>,
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
  ) {}

  async getDashboardStats(userId: string) {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const totalMatches = await this.tenderMatchRepository.count({
      where: { company_id: companyProfile.id },
    });

    const highScoreMatches = await this.tenderMatchRepository.count({
      where: { company_id: companyProfile.id, match_score: 80 },
    });

    const recentMatches = await this.tenderMatchRepository.find({
      where: { company_id: companyProfile.id },
      relations: ['tender'],
      order: { created_at: 'DESC' },
      take: 5,
    });

    return {
      totalMatches,
      highScoreMatches,
      recentMatches,
    };
  }

  async getMatchedTenders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    minScore?: number,
    maxScore?: number,
    category?: string,
    search?: string,
  ) {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const queryBuilder = this.tenderMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.tender', 'tender')
      .where('match.company_id = :companyId', { companyId: companyProfile.id });

    if (minScore !== undefined) {
      queryBuilder.andWhere('match.match_score >= :minScore', { minScore });
    }

    if (maxScore !== undefined) {
      queryBuilder.andWhere('match.match_score <= :maxScore', { maxScore });
    }

    if (category) {
      queryBuilder.andWhere('tender.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(tender.title ILIKE :search OR tender.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [matches, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('match.match_score', 'DESC')
      .getManyAndCount();

    return { matches, total };
  }

  async getTenderDetails(tenderId: string, userId: string) {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const match = await this.tenderMatchRepository.findOne({
      where: { company_id: companyProfile.id, tender_id: tenderId },
      relations: ['tender', 'tender.source'],
    });

    if (!match) {
      throw new NotFoundException('Tender match not found');
    }

    return match;
  }

  async getTopMatches(userId: string, limit: number = 10) {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    return this.tenderMatchRepository.find({
      where: { company_id: companyProfile.id },
      relations: ['tender'],
      order: { match_score: 'DESC' },
      take: limit,
    });
  }

  async getCategories(userId: string) {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const result = await this.tenderMatchRepository
      .createQueryBuilder('match')
      .leftJoin('match.tender', 'tender')
      .select('tender.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('match.company_id = :companyId', { companyId: companyProfile.id })
      .andWhere('tender.category IS NOT NULL')
      .groupBy('tender.category')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map(item => ({
      category: item.category,
      count: parseInt(item.count),
    }));
  }
}

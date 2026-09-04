import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, IsNull } from 'typeorm';
import { Tender } from './entities/tender.entity';
import { ScrapingSource } from './entities/scraping-source.entity';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface TenderSearchFilters {
  keyword?: string;
  industry?: string;
  country?: string;
  category?: string;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  sourceId?: string;
  status?: string;
  region?: 'canada' | 'worldwide';
}

export interface TenderSearchResult {
  tenders: Tender[];
  total: number;
  page: number;
  limit: number;
  sources: string[];
  cached: boolean;
}

@Injectable()
export class TenderSearchService {
  private readonly logger = new Logger(TenderSearchService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
    @InjectRepository(ScrapingSource)
    private scrapingSourceRepository: Repository<ScrapingSource>,
    @Optional() @InjectRedis() private readonly redis?: Redis,
  ) {
    if (!this.redis) {
      this.logger.warn('Redis not available - caching disabled');
    }
  }

  private async cacheGet(key: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async cacheSet(key: string, value: string, ttl: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttl, value);
    } catch {
      // Ignore cache write failures
    }
  }

  async searchTenders(
    filters: TenderSearchFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<TenderSearchResult> {
    const cacheKey = this.generateCacheKey(filters, page, limit, sortBy, sortOrder);

    // Try to get from cache
    const cached = await this.cacheGet(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for search: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // Build query
    const queryBuilder = this.tenderRepository
      .createQueryBuilder('tender')
      .leftJoinAndSelect('tender.source', 'source');

    // Apply filters
    if (filters.keyword) {
      queryBuilder.andWhere(
        '(tender.title ILIKE :keyword OR tender.description ILIKE :keyword OR tender.organization ILIKE :keyword)',
        { keyword: `%${filters.keyword}%` },
      );
    }

    if (filters.industry) {
      queryBuilder.andWhere('tender.category ILIKE :industry', {
        industry: `%${filters.industry}%`,
      });
    }

    if (filters.country) {
      queryBuilder.andWhere('tender.country = :country', { country: filters.country });
    }

    if (filters.category) {
      queryBuilder.andWhere('tender.category = :category', { category: filters.category });
    }

    if (filters.deadlineFrom || filters.deadlineTo) {
      if (filters.deadlineFrom && filters.deadlineTo) {
        queryBuilder.andWhere('tender.deadline BETWEEN :deadlineFrom AND :deadlineTo', {
          deadlineFrom: filters.deadlineFrom,
          deadlineTo: filters.deadlineTo,
        });
      } else if (filters.deadlineFrom) {
        queryBuilder.andWhere('tender.deadline >= :deadlineFrom', {
          deadlineFrom: filters.deadlineFrom,
        });
      } else if (filters.deadlineTo) {
        queryBuilder.andWhere('tender.deadline <= :deadlineTo', {
          deadlineTo: filters.deadlineTo,
        });
      }
    }

    if (filters.sourceId) {
      queryBuilder.andWhere('tender.source_id = :sourceId', { sourceId: filters.sourceId });
    }

    if (filters.status) {
      queryBuilder.andWhere('tender.status = :status', { status: filters.status });
    }

    if (filters.region) {
      queryBuilder.andWhere('source.region = :region', { region: filters.region });
    }

    // Only show open tenders by default
    if (!filters.status) {
      queryBuilder.andWhere('tender.status = :status', { status: 'open' });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and sorting
    const validSortColumns = ['created_at', 'deadline', 'published_date', 'title'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const tenders = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`tender.${sortColumn}`, sortOrder)
      .getMany();

    // Get unique source names
    const sources = [...new Set(tenders.map((t) => t.source?.name).filter(Boolean))];

    const result: TenderSearchResult = {
      tenders,
      total,
      page,
      limit,
      sources,
      cached: false,
    };

    // Cache the result
    await this.cacheSet(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    this.logger.log(`Search completed: ${total} results, page ${page}`);

    return result;
  }

  async getActiveSources(): Promise<ScrapingSource[]> {
    return this.scrapingSourceRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async getSourceStatistics(): Promise<any> {
    const sources = await this.scrapingSourceRepository.find({
      where: { is_active: true },
    });

    const stats = await Promise.all(
      sources.map(async (source) => {
        const tenderCount = await this.tenderRepository.count({
          where: { source_id: source.id },
        });

        return {
          id: source.id,
          name: source.name,
          url: source.url,
          region: source.region,
          is_active: source.is_active,
          tender_count: tenderCount,
          last_scraped_at: source.last_scraped_at,
          last_success_at: source.last_success_at,
          health_score: source.health_score,
        };
      }),
    );

    return stats;
  }

  async getTenderById(id: string): Promise<Tender> {
    return this.tenderRepository.findOne({
      where: { id },
      relations: ['source'],
    });
  }

  async getCategories(): Promise<string[]> {
    const result = await this.tenderRepository
      .createQueryBuilder('tender')
      .select('DISTINCT tender.category', 'category')
      .where('tender.category IS NOT NULL')
      .orderBy('tender.category', 'ASC')
      .getRawMany();

    return result.map((r) => r.category);
  }

  async getCountries(): Promise<string[]> {
    const result = await this.tenderRepository
      .createQueryBuilder('tender')
      .select('DISTINCT tender.country', 'country')
      .where('tender.country IS NOT NULL')
      .orderBy('tender.country', 'ASC')
      .getRawMany();

    return result.map((r) => r.country);
  }

  async getRecentTenders(limit: number = 10): Promise<Tender[]> {
    return this.tenderRepository.find({
      where: { status: 'open' },
      relations: ['source'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getTendersClosingSoon(limit: number = 10): Promise<Tender[]> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.tenderRepository.find({
      where: {
        status: 'open',
        deadline: Between(now, weekFromNow),
      },
      relations: ['source'],
      order: { deadline: 'ASC' },
      take: limit,
    });
  }

  private generateCacheKey(
    filters: TenderSearchFilters,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
  ): string {
    const filterString = JSON.stringify({
      keyword: filters.keyword,
      industry: filters.industry,
      country: filters.country,
      category: filters.category,
      deadlineFrom: filters.deadlineFrom?.toISOString(),
      deadlineTo: filters.deadlineTo?.toISOString(),
      sourceId: filters.sourceId,
      status: filters.status,
      region: filters.region,
    });

    return `tender_search:${Buffer.from(filterString).toString('base64')}:${page}:${limit}:${sortBy}:${sortOrder}`;
  }

  async clearCache(): Promise<void> {
    if (!this.redis) return;
    const keys = await this.redis.keys('tender_search:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Cleared ${keys.length} cached search results`);
    }
  }
}

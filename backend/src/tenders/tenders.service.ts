import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tender } from './entities/tender.entity';
import { ScrapingSource } from './entities/scraping-source.entity';
import { CreateTenderDto } from './dto/create-tender.dto';
import { UpdateTenderDto } from './dto/update-tender.dto';
import { CreateScrapingSourceDto } from './dto/create-scraping-source.dto';
import { UpdateScrapingSourceDto } from './dto/update-scraping-source.dto';
import * as crypto from 'crypto';

@Injectable()
export class TendersService {
  private readonly logger = new Logger(TendersService.name);

  constructor(
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
    @InjectRepository(ScrapingSource)
    private scrapingSourceRepository: Repository<ScrapingSource>,
  ) {}

  // Tender CRUD operations with Duplicate Detection
  async createTender(createTenderDto: CreateTenderDto): Promise<Tender> {
    // Generate deduplication hash
    const textToHash = `${createTenderDto.title || ''}-${createTenderDto.description || ''}`;
    const hash = crypto.createHash('sha256').update(textToHash).digest('hex');

    // Check if tender exists
    const existing = await this.tenderRepository.findOne({ where: { hash } });
    if (existing) {
      this.logger.log(`Tender already exists (duplicate skipped): "${createTenderDto.title}"`);
      // Update values if changed (e.g. deadline)
      Object.assign(existing, createTenderDto);
      return this.tenderRepository.save(existing);
    }

    const tender = this.tenderRepository.create({
      ...createTenderDto,
      hash,
    });
    return this.tenderRepository.save(tender);
  }

  async findAllTenders(
    page: number = 1,
    limit: number = 10,
    category?: string,
    minScore?: number,
    search?: string,
  ): Promise<{ tenders: Tender[]; total: number }> {
    const queryBuilder = this.tenderRepository.createQueryBuilder('tender');

    if (category) {
      queryBuilder.andWhere('tender.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(tender.title ILIKE :search OR tender.description ILIKE :search OR tender.organization ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [tenders, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('tender.created_at', 'DESC')
      .getManyAndCount();

    return { tenders, total };
  }

  async findOneTender(id: string): Promise<Tender> {
    const tender = await this.tenderRepository.findOne({
      where: { id },
      relations: ['source'],
    });

    if (!tender) {
      throw new NotFoundException('Tender not found');
    }

    return tender;
  }

  async updateTender(id: string, updateTenderDto: UpdateTenderDto): Promise<Tender> {
    const tender = await this.findOneTender(id);
    Object.assign(tender, updateTenderDto);
    
    // Recompute hash if title or description changes
    if (updateTenderDto.title || updateTenderDto.description) {
      const textToHash = `${tender.title || ''}-${tender.description || ''}`;
      tender.hash = crypto.createHash('sha256').update(textToHash).digest('hex');
    }

    return this.tenderRepository.save(tender);
  }

  async removeTender(id: string): Promise<void> {
    const tender = await this.findOneTender(id);
    await this.tenderRepository.remove(tender);
  }

  // Scraping Source CRUD operations
  async createScrapingSource(createScrapingSourceDto: CreateScrapingSourceDto): Promise<ScrapingSource> {
    const source = this.scrapingSourceRepository.create(createScrapingSourceDto);
    return this.scrapingSourceRepository.save(source);
  }

  async findAllScrapingSources(): Promise<ScrapingSource[]> {
    return this.scrapingSourceRepository.find({
      where: { is_active: true },
    });
  }

  async findOneScrapingSource(id: string): Promise<ScrapingSource> {
    const source = await this.scrapingSourceRepository.findOne({
      where: { id },
      relations: ['tenders'],
    });

    if (!source) {
      throw new NotFoundException('Scraping source not found');
    }

    return source;
  }

  async updateScrapingSource(id: string, updateScrapingSourceDto: UpdateScrapingSourceDto): Promise<ScrapingSource> {
    const source = await this.findOneScrapingSource(id);
    Object.assign(source, updateScrapingSourceDto);
    return this.scrapingSourceRepository.save(source);
  }

  async removeScrapingSource(id: string): Promise<void> {
    const source = await this.findOneScrapingSource(id);
    await this.scrapingSourceRepository.remove(source);
  }

  async updateLastScraped(id: string): Promise<void> {
    await this.scrapingSourceRepository.update(id, { last_scraped_at: new Date() });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapingSource } from '../tenders/entities/scraping-source.entity';
import { Tender } from '../tenders/entities/tender.entity';
import { BaseScraper, TenderData, ScrapingResult } from './base/base-scraper.interface';
import { CanadaBuysScraper } from './scrapers/canada-buys.scraper';
import { TedScraper } from './scrapers/ted.scraper';
import { UngmScraper } from './scrapers/ungm.scraper';
import { WorldBankScraper } from './scrapers/world-bank.scraper';
import { AdBankScraper } from './scrapers/adb.scraper';
import { AfdbScraper } from './scrapers/afdb.scraper';
import { IdbScraper } from './scrapers/idb.scraper';
import { MerxScraper } from './scrapers/merx.scraper';
import { BiddingoScraper } from './scrapers/biddingo.scraper';
import { MatchingService } from '../matching/matching.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);
  private scrapers: Map<string, BaseScraper> = new Map();

  constructor(
    @InjectRepository(ScrapingSource)
    private readonly sourceRepository: Repository<ScrapingSource>,
    @InjectRepository(Tender)
    private readonly tenderRepository: Repository<Tender>,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.initializeScrapers();
  }

  private getScraperKey(sourceName: string): string {
    const normalized = sourceName.toLowerCase().replace(/[\s_-]/g, '');
    const aliases: Record<string, string> = {
      canadabuys: 'canadabuys',
      canada: 'canadabuys',
      ted: 'ted',
      ungm: 'ungm',
      worldbank: 'worldbank',
      adb: 'adb',
      afdb: 'afdb',
      idb: 'idb',
      merx: 'merx',
      biddingo: 'biddingo',
    };
    return aliases[normalized] || normalized;
  }

  private initializeScrapers(): void {
    this.scrapers.set('canadabuys', new CanadaBuysScraper());
    this.scrapers.set('ted', new TedScraper());
    this.scrapers.set('ungm', new UngmScraper());
    this.scrapers.set('worldbank', new WorldBankScraper());
    this.scrapers.set('adb', new AdBankScraper());
    this.scrapers.set('afdb', new AfdbScraper());
    this.scrapers.set('idb', new IdbScraper());
    this.scrapers.set('merx', new MerxScraper());
    this.scrapers.set('biddingo', new BiddingoScraper());
  }

  async scrapeSource(sourceId: string): Promise<ScrapingResult> {
    const source = await this.sourceRepository.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    if (!source.is_active) {
      this.logger.warn(`Source ${source.name} is disabled, skipping`);
      return {
        success: false,
        tenders: [],
        errors: ['Source is disabled'],
        metadata: { totalScanned: 0, scrapedAt: new Date() },
      };
    }

    const scraper = this.scrapers.get(this.getScraperKey(source.name));
    if (!scraper) {
      throw new Error(`No scraper found for source: ${source.name}`);
    }

    this.logger.log(`Starting to scrape source: ${source.name}`);

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      const result = await scraper.scrape(page);

      await browser.close();

      // Process results
      const processed = await this.processTenders(result.tenders, sourceId);

      // Update source health
      await this.updateSourceHealth(sourceId, true, result.tenders.length);

      this.logger.log(
        `Successfully scraped ${source.name}: ${processed.newTenders} new, ${processed.duplicates} duplicates, ${processed.errors} errors`
      );

      return {
        ...result,
        tenders: processed.tenders,
      };
    } catch (error) {
      this.logger.error(`Error scraping source ${source.name}: ${error.message}`);
      await this.updateSourceHealth(sourceId, false, 0, error.message);
      throw error;
    }
  }

  async scrapeAllActiveSources(): Promise<{ source: string; result: ScrapingResult }[]> {
    const sources = await this.sourceRepository.find({ where: { is_active: true } });
    this.logger.log(`Found ${sources.length} active scraping sources`);

    const results: { source: string; result: ScrapingResult }[] = [];

    for (const source of sources) {
      try {
        const result = await this.scrapeSource(source.id);
        results.push({ source: source.name, result });
      } catch (error) {
        this.logger.error(`Failed to scrape source ${source.name}: ${error.message}`);
        results.push({
          source: source.name,
          result: {
            success: false,
            tenders: [],
            errors: [error.message],
            metadata: { totalScanned: 0, scrapedAt: new Date() },
          },
        });
      }
    }

    return results;
  }

  private async processTenders(tenders: TenderData[], sourceId: string): Promise<{
    newTenders: number;
    duplicates: number;
    errors: number;
    tenders: TenderData[];
  }> {
    let newTenders = 0;
    let duplicates = 0;
    let errors = 0;
    const processedTenders: TenderData[] = [];

    for (const tender of tenders) {
      try {
        // Check for duplicates
        const hash = this.generateHash(tender);
        const existing = await this.tenderRepository.findOne({ where: { hash } });

        if (existing) {
          duplicates++;
          continue;
        }

        // Save new tender
        const tenderEntity = this.tenderRepository.create({
          ...tender,
          source_id: sourceId,
          hash,
          scraped_at: new Date(),
        });

        const savedTender = await this.tenderRepository.save(tenderEntity);
        newTenders++;
        processedTenders.push(tender);

        // Trigger AI matching for new tender
        this.triggerAIMatching(savedTender.id).catch(error => {
          this.logger.error(`AI matching failed for tender ${savedTender.id}: ${error.message}`);
        });
      } catch (error) {
        this.logger.error(`Error processing tender: ${error.message}`);
        errors++;
      }
    }

    return { newTenders, duplicates, errors, tenders: processedTenders };
  }

  private async triggerAIMatching(tenderId: string): Promise<void> {
    try {
      this.logger.log(`Triggering AI matching for tender: ${tenderId}`);
      
      // Calculate matches for all companies
      await this.matchingService.calculateAllMatchesForTender(tenderId);
      
      this.logger.log(`AI matching completed for tender: ${tenderId}`);

      // Notify companies with high-score matches (80%+)
      await this.notifyHighScoreMatches(tenderId);
    } catch (error) {
      this.logger.error(`Error triggering AI matching: ${error.message}`);
      throw error;
    }
  }

  private async notifyHighScoreMatches(tenderId: string): Promise<void> {
    try {
      const { TenderMatch } = await import('../matching/entities/tender-match.entity');
      const { CompanyProfile } = await import('../company/entities/company-profile.entity');
      const { User } = await import('../auth/entities/user.entity');

      const tenderMatchRepository = this.tenderRepository.manager.getRepository(TenderMatch);
      const companyProfileRepository = this.tenderRepository.manager.getRepository(CompanyProfile);
      const userRepository = this.tenderRepository.manager.getRepository(User);

      // Get high-score matches for this tender
      const highScoreMatches = await tenderMatchRepository
        .createQueryBuilder('match')
        .leftJoinAndSelect('match.company', 'company')
        .leftJoinAndSelect('company.user', 'user')
        .where('match.tender_id = :tenderId', { tenderId })
        .andWhere('match.match_score >= :threshold', { threshold: 80 })
        .getMany();

      this.logger.log(`Found ${highScoreMatches.length} high-score matches for tender ${tenderId}`);

      // Queue email notifications for each match
      for (const match of highScoreMatches) {
        try {
          const user = match.company.user;
          if (user) {
            await this.notificationsService.queueMatchEmail(user.id, tenderId, match.id);
            this.logger.log(`Queued notification for user ${user.email} (match score: ${match.match_score}%)`);
          }
        } catch (error) {
          this.logger.error(`Error queuing notification for match ${match.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error notifying high-score matches: ${error.message}`);
      // Don't throw error - notifications shouldn't fail the scraping process
    }
  }

  private generateHash(tender: TenderData): string {
    const crypto = require('crypto');
    const data = `${tender.title}|${tender.tender_number}|${tender.organization}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async updateSourceHealth(
    sourceId: string,
    success: boolean,
    tenderCount: number,
    errorMessage?: string
  ): Promise<void> {
    const source = await this.sourceRepository.findOne({ where: { id: sourceId } });
    if (!source) return;

    const now = new Date();
    
    if (success) {
      source.last_success_at = now;
      source.last_scraped_at = now;
      source.total_scraped = (source.total_scraped || 0) + tenderCount;
      
      // Calculate health score (simple algorithm)
      const recentSuccess = source.last_error_at 
        ? (now.getTime() - source.last_error_at.getTime()) < 86400000 // 24 hours
        : true;
      
      source.health_score = recentSuccess 
        ? Math.min(100, source.health_score + 5)
        : Math.max(0, source.health_score - 10);
    } else {
      source.last_error_at = now;
      source.last_error_message = errorMessage;
      source.total_failed = (source.total_failed || 0) + 1;
      source.health_score = Math.max(0, source.health_score - 20);
    }

    source.updated_at = now;
    await this.sourceRepository.save(source);
  }

  async getSourceStatistics(): Promise<any> {
    const sources = await this.sourceRepository.find();
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      region: source.region,
      is_active: source.is_active,
      last_scraped_at: source.last_scraped_at,
      last_success_at: source.last_success_at,
      last_error_at: source.last_error_at,
      last_error_message: source.last_error_message,
      total_scraped: source.total_scraped || 0,
      total_failed: source.total_failed || 0,
      health_score: source.health_score || 100,
    }));
  }

  async toggleSource(sourceId: string, isActive: boolean): Promise<void> {
    const source = await this.sourceRepository.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    source.is_active = isActive;
    source.updated_at = new Date();
    await this.sourceRepository.save(source);

    this.logger.log(`Source ${source.name} ${isActive ? 'enabled' : 'disabled'}`);
  }

  async getSourceHealth(): Promise<{ healthy: number; degraded: number; unhealthy: number }> {
    const sources = await this.sourceRepository.find();
    
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const source of sources) {
      const score = source.health_score || 100;
      if (score >= 80) healthy++;
      else if (score >= 50) degraded++;
      else unhealthy++;
    }

    return { healthy, degraded, unhealthy };
  }
}

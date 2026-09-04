import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MatchingService } from '../matching/matching.service';

@Processor('matching')
export class MatchingJob {
  private readonly logger = new Logger(MatchingJob.name);

  constructor(private readonly matchingService: MatchingService) {}

  @Process('calculate-match')
  async handleCalculateMatch(job: Job) {
    this.logger.log(`Processing calculate match job: ${job.id}`);
    const { companyId, tenderId } = job.data;
    
    try {
      const match = await this.matchingService.calculateMatch(companyId, tenderId);
      this.logger.log(`Successfully calculated match for company ${companyId} and tender ${tenderId}`);
      return match;
    } catch (error) {
      this.logger.error(`Error calculating match: ${error.message}`);
      throw error;
    }
  }

  @Process('calculate-all-matches-company')
  async handleCalculateAllMatchesForCompany(job: Job) {
    this.logger.log(`Processing calculate all matches for company job: ${job.id}`);
    const { companyId } = job.data;
    
    try {
      await this.matchingService.calculateAllMatchesForCompany(companyId);
      this.logger.log(`Successfully calculated all matches for company ${companyId}`);
    } catch (error) {
      this.logger.error(`Error calculating all matches for company: ${error.message}`);
      throw error;
    }
  }

  @Process('calculate-all-matches-tender')
  async handleCalculateAllMatchesForTender(job: Job) {
    this.logger.log(`Processing calculate all matches for tender job: ${job.id}`);
    const { tenderId } = job.data;
    
    try {
      await this.matchingService.calculateAllMatchesForTender(tenderId);
      this.logger.log(`Successfully calculated all matches for tender ${tenderId}`);
    } catch (error) {
      this.logger.error(`Error calculating all matches for tender: ${error.message}`);
      throw error;
    }
  }
}

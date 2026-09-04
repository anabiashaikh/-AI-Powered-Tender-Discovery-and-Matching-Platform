import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/user.decorator';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('calculate')
  async calculateMatch(
    @Body() body: { company_id: string; tender_id: string },
    @GetUser('id') userId: string,
  ) {
    return this.matchingService.calculateMatch(body.company_id, body.tender_id);
  }

  @Get('similar/:tenderId')
  async findSimilarTenders(
    @Param('tenderId') tenderId: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchingService.findSimilarTenders(tenderId, limit ? parseInt(limit) : 5);
  }

  @Get('company/:companyId')
  async findMatchesByCompany(
    @Param('companyId') companyId: string,
    @Query('minScore') minScore?: string,
  ) {
    return this.matchingService.findMatchesByCompany(
      companyId,
      minScore ? parseInt(minScore) : undefined,
    );
  }

  @Get('tender/:tenderId')
  async findMatchesByTender(@Param('tenderId') tenderId: string) {
    return this.matchingService.findMatchesByTender(tenderId);
  }

  @Get(':id')
  async findOneMatch(@Param('id') id: string) {
    return this.matchingService.findOneMatch(id);
  }

  @Post('calculate-all/company/:companyId')
  async calculateAllMatchesForCompany(@Param('companyId') companyId: string) {
    await this.matchingService.calculateAllMatchesForCompany(companyId);
    return { message: 'Match calculation started' };
  }

  @Post('calculate-all/tender/:tenderId')
  async calculateAllMatchesForTender(@Param('tenderId') tenderId: string) {
    await this.matchingService.calculateAllMatchesForTender(tenderId);
    return { message: 'Match calculation started' };
  }
}

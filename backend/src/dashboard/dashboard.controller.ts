import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@GetUser('id') userId: string) {
    return this.dashboardService.getDashboardStats(userId);
  }

  @Get('tenders')
  async getMatchedTenders(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.dashboardService.getMatchedTenders(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      minScore ? parseInt(minScore) : undefined,
      maxScore ? parseInt(maxScore) : undefined,
      category,
      search,
    );
  }

  @Get('tenders/:tenderId')
  async getTenderDetails(
    @GetUser('id') userId: string,
    @Query('tenderId') tenderId: string,
  ) {
    return this.dashboardService.getTenderDetails(tenderId, userId);
  }

  @Get('top-matches')
  async getTopMatches(
    @GetUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getTopMatches(
      userId,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('categories')
  async getCategories(@GetUser('id') userId: string) {
    return this.dashboardService.getCategories(userId);
  }
}

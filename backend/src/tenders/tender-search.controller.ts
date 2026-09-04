import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenderSearchService, TenderSearchFilters } from './tender-search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('tender-search')
export class TenderSearchController {
  constructor(private readonly tenderSearchService: TenderSearchService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async searchTenders(
    @Query('keyword') keyword?: string,
    @Query('industry') industry?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('deadlineFrom') deadlineFrom?: string,
    @Query('deadlineTo') deadlineTo?: string,
    @Query('sourceId') sourceId?: string,
    @Query('status') status?: string,
    @Query('region') region?: 'canada' | 'worldwide',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filters: TenderSearchFilters = {
      keyword,
      industry,
      country,
      category,
      deadlineFrom: deadlineFrom ? new Date(deadlineFrom) : undefined,
      deadlineTo: deadlineTo ? new Date(deadlineTo) : undefined,
      sourceId,
      status,
      region,
    };

    return this.tenderSearchService.searchTenders(
      filters,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      sortBy || 'created_at',
      sortOrder || 'DESC',
    );
  }

  @Get('sources')
  @UseGuards(JwtAuthGuard)
  async getActiveSources() {
    return this.tenderSearchService.getActiveSources();
  }

  @Get('sources/statistics')
  @UseGuards(JwtAuthGuard)
  async getSourceStatistics() {
    return this.tenderSearchService.getSourceStatistics();
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    return this.tenderSearchService.getCategories();
  }

  @Get('countries')
  @UseGuards(JwtAuthGuard)
  async getCountries() {
    return this.tenderSearchService.getCountries();
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  async getRecentTenders(@Query('limit') limit?: string) {
    return this.tenderSearchService.getRecentTenders(limit ? parseInt(limit) : 10);
  }

  @Get('closing-soon')
  @UseGuards(JwtAuthGuard)
  async getTendersClosingSoon(@Query('limit') limit?: string) {
    return this.tenderSearchService.getTendersClosingSoon(limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTenderById(@Query('id') id: string) {
    return this.tenderSearchService.getTenderById(id);
  }
}

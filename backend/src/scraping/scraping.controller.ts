import { Controller, Get, Post, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get('sources/statistics')
  async getSourceStatistics() {
    try {
      return await this.scrapingService.getSourceStatistics();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get source statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sources/health')
  async getSourceHealth() {
    try {
      return await this.scrapingService.getSourceHealth();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get source health',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('sources/:id/toggle')
  async toggleSource(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    try {
      await this.scrapingService.toggleSource(id, isActive);
      return { message: `Source ${isActive ? 'enabled' : 'disabled'} successfully` };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to toggle source',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('sources/:id/scrape')
  async scrapeSource(@Param('id') id: string) {
    try {
      const result = await this.scrapingService.scrapeSource(id);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to scrape source',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('sources/scrape-all')
  async scrapeAllSources() {
    try {
      const results = await this.scrapingService.scrapeAllActiveSources();
      return {
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.result.success).length,
          failed: results.filter(r => !r.result.success).length,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to scrape all sources',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

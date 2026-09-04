import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TendersService } from './tenders.service';
import { CreateTenderDto } from './dto/create-tender.dto';
import { UpdateTenderDto } from './dto/update-tender.dto';
import { CreateScrapingSourceDto } from './dto/create-scraping-source.dto';
import { UpdateScrapingSourceDto } from './dto/update-scraping-source.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('tenders')
export class TendersController {
  constructor(private readonly tendersService: TendersService) {}

  // Tender endpoints
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createTender(@Body() createTenderDto: CreateTenderDto) {
    return this.tendersService.createTender(createTenderDto);
  }

  @Get()
  async findAllTenders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.tendersService.findAllTenders(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      category,
      undefined,
      search,
    );
  }

  @Get('all')
  async getAllTenders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tendersService.findAllTenders(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get(':id')
  async findOneTender(@Param('id') id: string) {
    return this.tendersService.findOneTender(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateTender(@Param('id') id: string, @Body() updateTenderDto: UpdateTenderDto) {
    return this.tendersService.updateTender(id, updateTenderDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async removeTender(@Param('id') id: string) {
    return this.tendersService.removeTender(id);
  }

  // Scraping Source endpoints
  @Post('scraping-sources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createScrapingSource(@Body() createScrapingSourceDto: CreateScrapingSourceDto) {
    return this.tendersService.createScrapingSource(createScrapingSourceDto);
  }

  @Get('scraping-sources/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAllScrapingSources() {
    return this.tendersService.findAllScrapingSources();
  }

  @Get('scraping-sources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findOneScrapingSource(@Param('id') id: string) {
    return this.tendersService.findOneScrapingSource(id);
  }

  @Put('scraping-sources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateScrapingSource(@Param('id') id: string, @Body() updateScrapingSourceDto: UpdateScrapingSourceDto) {
    return this.tendersService.updateScrapingSource(id, updateScrapingSourceDto);
  }

  @Delete('scraping-sources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async removeScrapingSource(@Param('id') id: string) {
    return this.tendersService.removeScrapingSource(id);
  }
}

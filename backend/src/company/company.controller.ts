import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyProfileDto } from './dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/user.decorator';

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async create(
    @GetUser('id') userId: string,
    @Body() createCompanyProfileDto: CreateCompanyProfileDto,
  ) {
    return this.companyService.create(userId, createCompanyProfileDto);
  }

  @Get('my-profile')
  async findByUser(@GetUser('id') userId: string) {
    return this.companyService.findByUser(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.companyService.findOne(id, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateCompanyProfileDto: UpdateCompanyProfileDto,
  ) {
    return this.companyService.update(id, userId, updateCompanyProfileDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.companyService.remove(id, userId);
  }
}

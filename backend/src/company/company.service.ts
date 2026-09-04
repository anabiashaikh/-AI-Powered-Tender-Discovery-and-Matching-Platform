import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyProfile } from './entities/company-profile.entity';
import { CreateCompanyProfileDto } from './dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
  ) {}

  async create(userId: string, createCompanyProfileDto: CreateCompanyProfileDto): Promise<CompanyProfile> {
    const existingProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (existingProfile) {
      throw new ForbiddenException('Company profile already exists for this user');
    }

    const companyProfile = this.companyProfileRepository.create({
      ...createCompanyProfileDto,
      user_id: userId,
    });

    return this.companyProfileRepository.save(companyProfile);
  }

  async findOne(id: string, userId: string): Promise<CompanyProfile> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    if (companyProfile.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this profile');
    }

    return companyProfile;
  }

  async findByUser(userId: string): Promise<CompanyProfile> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    return companyProfile;
  }

  async update(id: string, userId: string, updateCompanyProfileDto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    const companyProfile = await this.findOne(id, userId);

    Object.assign(companyProfile, updateCompanyProfileDto);

    return this.companyProfileRepository.save(companyProfile);
  }

  async remove(id: string, userId: string): Promise<void> {
    const companyProfile = await this.findOne(id, userId);
    await this.companyProfileRepository.remove(companyProfile);
  }
}

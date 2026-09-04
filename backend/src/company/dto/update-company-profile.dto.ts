import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyProfileDto } from './create-company-profile.dto';

export class UpdateCompanyProfileDto extends PartialType(CreateCompanyProfileDto) {}

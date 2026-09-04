import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../auth/entities/user.entity';
import { CompanyProfile } from '../company/entities/company-profile.entity';
import { ScrapingSource } from '../tenders/entities/scraping-source.entity';
import { SystemLog } from './entities/system-log.entity';
import { Tender } from '../tenders/entities/tender.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { InviteCode } from '../auth/entities/invite-code.entity';
import { UserSession } from '../auth/entities/user-session.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
    @InjectRepository(ScrapingSource)
    private scrapingSourceRepository: Repository<ScrapingSource>,
    @InjectRepository(SystemLog)
    private systemLogRepository: Repository<SystemLog>,
    @InjectRepository(Tender)
    private tenderRepository: Repository<Tender>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(InviteCode)
    private inviteCodeRepository: Repository<InviteCode>,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
  ) {}

  async getUsers(page: number = 1, limit: number = 100) {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
      select: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at'],
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      email: u.email,
      role: u.role,
      status: u.is_active ? 'active' : 'inactive',
      created_at: u.created_at,
    }));

    return { users: formattedUsers, total };
  }

  async getUser(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company_profiles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(id: string, role: string) {
    const user = await this.getUser(id);
    user.role = role;
    return this.userRepository.save(user);
  }

  async setUserActiveStatus(id: string, isActive: boolean) {
    const user = await this.getUser(id);
    user.is_active = isActive;
    return this.userRepository.save(user);
  }

  async toggleUserStatus(id: string) {
    const user = await this.getUser(id);
    user.is_active = !user.is_active;
    return this.userRepository.save(user);
  }

  async deleteUser(id: string) {
    const user = await this.getUser(id);
    return this.userRepository.remove(user);
  }

  async getSystemStats() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { is_active: true } });
    const totalCompanies = await this.companyProfileRepository.count();
    const totalTenders = await this.tenderRepository.count();
    const totalSources = await this.scrapingSourceRepository.count();
    const activeSources = await this.scrapingSourceRepository.count({ where: { is_active: true } });
    const activeSessions = await this.userSessionRepository.count();

    return {
      total_users: totalUsers,
      total_companies: totalCompanies,
      total_tenders: totalTenders,
      active_sessions: activeSessions || 1,
      totalUsers,
      activeUsers,
      totalCompanies,
      totalTenders,
      totalSources,
      activeSources,
      activeSessions: activeSessions || 1,
    };
  }

  async getAuditLogs(page: number = 1, limit: number = 50) {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
      relations: ['user'],
    });

    const formattedLogs = logs.map((l) => ({
      id: l.id,
      action: l.action,
      user: l.user ? `${l.user.first_name || ''} ${l.user.last_name || ''}`.trim() || l.user.email : 'System',
      timestamp: l.created_at,
      ip: l.ip_address || '127.0.0.1',
    }));

    return { logs: formattedLogs, total };
  }

  async getInviteCodes() {
    const codes = await this.inviteCodeRepository.find({
      order: { created_at: 'DESC' },
      relations: ['creator'],
    });

    const formattedCodes = codes.map((c) => ({
      id: c.id,
      code: c.code,
      created_by: c.creator ? c.creator.email : 'Admin',
      expires_at: c.expires_at,
      max_uses: c.max_uses,
      uses: c.uses,
      status: c.uses >= c.max_uses ? 'used' : (c.expires_at && new Date() > c.expires_at ? 'expired' : 'active'),
    }));

    return { codes: formattedCodes };
  }

  async generateInviteCode(maxUses: number = 1, expiresInDays: number = 7, userId?: string) {
    const code = 'INV-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const invite = this.inviteCodeRepository.create({
      code,
      role: 'company',
      max_uses: maxUses || 1,
      uses: 0,
      created_by: userId,
      expires_at: expiresAt,
    });

    const saved = await this.inviteCodeRepository.save(invite);
    return {
      code: saved.code,
      invite_code: saved.code,
      id: saved.id,
      expires_at: saved.expires_at,
    };
  }

  async getLogs(level?: string, page: number = 1, limit: number = 50) {
    const queryBuilder = this.systemLogRepository.createQueryBuilder('log');

    if (level) {
      queryBuilder.andWhere('log.level = :level', { level });
    }

    const [logs, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('log.created_at', 'DESC')
      .getManyAndCount();

    return { logs, total };
  }

  async createLog(level: string, message: string, module?: string, metadata?: Record<string, any>) {
    const log = this.systemLogRepository.create({
      level,
      message,
      module,
      metadata,
    });
    return this.systemLogRepository.save(log);
  }
}

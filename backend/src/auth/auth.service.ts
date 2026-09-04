import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserSession } from './entities/user-session.entity';
import { AuditLog } from './entities/audit-log.entity';
import { InviteCode } from './entities/invite-code.entity';
import { InviteUsage } from './entities/invite-usage.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private resend: Resend | null = null;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    @InjectRepository(UserSession)
    private sessionsRepository: Repository<UserSession>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(InviteCode)
    private inviteCodesRepository: Repository<InviteCode>,
    @InjectRepository(InviteUsage)
    private inviteUsagesRepository: Repository<InviteUsage>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendKey) {
      this.resend = new Resend(resendKey);
    }
  }

  // Auditing Helper
  async logAuditEvent(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    details: any,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const log = this.auditLogsRepository.create({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: ip,
        user_agent: userAgent,
      });
      await this.auditLogsRepository.save(log);
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  // Register User
  async register(registerDto: RegisterDto, ip?: string, userAgent?: string): Promise<AuthResponseDto> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    let role = 'company_user';
    let invite: InviteCode | null = null;

    // Validate invite code if supplied
    if (registerDto.invite_code) {
      invite = await this.inviteCodesRepository.findOne({
        where: { code: registerDto.invite_code },
      });

      if (!invite) {
        throw new BadRequestException('Invalid invite code');
      }

      if (invite.expires_at && invite.expires_at < new Date()) {
        throw new BadRequestException('Invite code has expired');
      }

      if (invite.uses >= invite.max_uses) {
        throw new BadRequestException('Invite code usage limit reached');
      }

      role = invite.role;
    } else {
      // If invite system is strictly active, we can reject registration without it
      const enforceInvite = this.configService.get<string>('ENFORCE_INVITE_CODES') === 'true';
      if (enforceInvite) {
        throw new BadRequestException('Registration requires an invite code');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = this.usersRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      first_name: registerDto.first_name,
      last_name: registerDto.last_name,
      role,
      verification_token: verificationToken,
      email_verified: false,
    });

    const savedUser = await this.usersRepository.save(user);

    // Track invite usage
    if (invite) {
      invite.uses += 1;
      await this.inviteCodesRepository.save(invite);

      const usage = this.inviteUsagesRepository.create({
        invite_code_id: invite.id,
        registered_user_id: savedUser.id,
      });
      await this.inviteUsagesRepository.save(usage);
    }

    // Write audit log
    await this.logAuditEvent(savedUser.id, 'user.register', 'users', savedUser.id, { email: savedUser.email, role }, ip, userAgent);

    // Send verification email
    await this.sendVerificationEmail(savedUser, verificationToken);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);
    await this.createSession(savedUser.id, tokens.refresh_token, ip, userAgent);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        first_name: savedUser.first_name,
        last_name: savedUser.last_name,
        role: savedUser.role,
      },
    };
  }

  // Login User
  async login(loginDto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Write audit log
    await this.logAuditEvent(user.id, 'user.login', 'users', user.id, {}, ip, userAgent);

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refresh_token, ip, userAgent);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    };
  }

  // Refresh Tokens (with Rotation & Reuse Detection)
  async refreshToken(token: string, ip?: string, userAgent?: string): Promise<{ access_token: string; refresh_token: string }> {
    const storedToken = await this.refreshTokensRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.is_revoked) {
      // Reuse detection! Revoke all tokens for this user as a security breach precaution
      await this.refreshTokensRepository.update(
        { user_id: storedToken.user_id },
        { is_revoked: true },
      );
      await this.logAuditEvent(storedToken.user_id, 'refresh_token.reuse_detected', 'refresh_tokens', storedToken.id, { token }, ip, userAgent);
      throw new UnauthorizedException('Token breach detected. Revoking all sessions.');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = storedToken.user;
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User is inactive or deleted');
    }

    // Revoke current token
    storedToken.is_revoked = true;
    await this.refreshTokensRepository.save(storedToken);

    // Generate new pair
    const tokens = await this.generateTokens(user);

    // Replace session token
    await this.sessionsRepository.update(
      { user_id: user.id, device_id: userAgent }, // Simple device pairing
      { last_activity: new Date() }
    );

    await this.logAuditEvent(user.id, 'refresh_token.refresh', 'refresh_tokens', storedToken.id, {}, ip, userAgent);

    return tokens;
  }

  // Social OAuth Login (Google / Microsoft)
  async socialLogin(
    email: string,
    firstName: string,
    lastName: string,
    provider: 'google' | 'microsoft',
    providerId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    let user = await this.usersRepository.findOne({
      where: [
        { email },
        provider === 'google' ? { google_id: providerId } : { microsoft_id: providerId },
      ],
    });

    if (!user) {
      // Create user if not exists
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = this.usersRepository.create({
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role: 'company_user',
        email_verified: true, // OAuth emails are verified
        google_id: provider === 'google' ? providerId : undefined,
        microsoft_id: provider === 'microsoft' ? providerId : undefined,
      });

      user = await this.usersRepository.save(user);
      await this.logAuditEvent(user.id, 'user.oauth_register', 'users', user.id, { provider }, ip, userAgent);
    } else {
      // Link account if necessary
      let updated = false;
      if (provider === 'google' && !user.google_id) {
        user.google_id = providerId;
        updated = true;
      } else if (provider === 'microsoft' && !user.microsoft_id) {
        user.microsoft_id = providerId;
        updated = true;
      }

      if (updated) {
        user = await this.usersRepository.save(user);
      }

      await this.logAuditEvent(user.id, 'user.oauth_login', 'users', user.id, { provider }, ip, userAgent);
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refresh_token, ip, userAgent);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    };
  }

  // Email Verification Request / Completion
  async verifyEmail(token: string, ip?: string, userAgent?: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { verification_token: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.email_verified = true;
    user.verification_token = null;
    await this.usersRepository.save(user);

    await this.logAuditEvent(user.id, 'user.verify_email', 'users', user.id, {}, ip, userAgent);
  }

  // Password Reset Request
  async requestPasswordReset(email: string, ip?: string, userAgent?: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      // Prevent user enumeration: respond success silently
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.reset_token = resetToken;
    user.reset_token_expires = new Date(Date.now() + 3600000); // 1 hour validity

    await this.usersRepository.save(user);

    await this.logAuditEvent(user.id, 'user.password_reset_request', 'users', user.id, {}, ip, userAgent);

    await this.sendResetEmail(user, resetToken);
  }

  // Password Reset Completion
  async resetPassword(dto: any, ip?: string, userAgent?: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: {
        reset_token: dto.token,
        reset_token_expires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.reset_token = null;
    user.reset_token_expires = null;
    await this.usersRepository.save(user);

    await this.logAuditEvent(user.id, 'user.password_reset_complete', 'users', user.id, {}, ip, userAgent);
  }

  // Token Generation Utilities
  private async generateTokens(user: User): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refresh_token = crypto.randomBytes(64).toString('hex');
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 30); // 30 days expiration

    const tokenRecord = this.refreshTokensRepository.create({
      user_id: user.id,
      token: refresh_token,
      expires_at,
    });

    await this.refreshTokensRepository.save(tokenRecord);

    return {
      access_token,
      refresh_token,
    };
  }

  // Session Management
  private async createSession(userId: string, refreshToken: string, ip?: string, userAgent?: string): Promise<void> {
    // Revoke old active sessions from the same device category if needed, or simply record a new active session
    const session = this.sessionsRepository.create({
      user_id: userId,
      device_id: userAgent || 'unknown',
      ip_address: ip || '0.0.0.0',
      user_agent: userAgent || 'unknown',
      is_active: true,
      last_activity: new Date(),
    });
    await this.sessionsRepository.save(session);
  }

  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionsRepository.find({
      where: { user_id: userId, is_active: true },
      order: { last_activity: 'DESC' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.is_active = false;
    await this.sessionsRepository.save(session);

    await this.logAuditEvent(userId, 'session.revoke', 'user_sessions', sessionId, { device: session.device_id });
  }

  // Admin Invite Code Generators
  async generateInviteCode(role: string, maxUses: number, expiresAtStr?: string, adminUserId?: string): Promise<InviteCode> {
    const invite = this.inviteCodesRepository.create({
      code: crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      role,
      max_uses: maxUses,
      uses: 0,
      expires_at: expiresAtStr ? new Date(expiresAtStr) : undefined,
      created_by: adminUserId,
    });

    const savedInvite = await this.inviteCodesRepository.save(invite);
    if (adminUserId) {
      await this.logAuditEvent(adminUserId, 'invite.generate', 'invite_codes', savedInvite.id, { code: invite.code, role, maxUses });
    }
    return savedInvite;
  }

  async getInviteUsage(): Promise<InviteCode[]> {
    return this.inviteCodesRepository.find({
      relations: ['usages', 'usages.registeredUser'],
      order: { created_at: 'DESC' },
    });
  }

  // Verification & Reset Emails
  private async sendVerificationEmail(user: User, token: string): Promise<void> {
    const host = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verifyLink = `${host}/auth/verify-email?token=${token}`;

    this.logger.log(`Verification Token for ${user.email}: ${verifyLink}`);

    if (!this.resend) {
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.configService.get<string>('RESEND_FROM_EMAIL') || 'noreply@tenderdiscovery.com',
        to: user.email,
        subject: 'Verify your email address - Enterprise Tender Discovery',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4f46e5; text-align: center;">Welcome to Tender Discovery</h2>
            <p>Thank you for registering. Please verify your email by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </p>
            <p style="color: #666; font-size: 14px;">If the button above does not work, copy and paste this link in your browser:</p>
            <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">${verifyLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Enterprise Tender Matching Platform</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Resend failed to send verification email: ${err.message}`);
    }
  }

  private async sendResetEmail(user: User, token: string): Promise<void> {
    const host = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${host}/auth/reset-password?token=${token}`;

    this.logger.log(`Password Reset Link for ${user.email}: ${resetLink}`);

    if (!this.resend) {
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.configService.get<string>('RESEND_FROM_EMAIL') || 'noreply@tenderdiscovery.com',
        to: user.email,
        subject: 'Reset your password - Enterprise Tender Discovery',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #dc2626; text-align: center;">Reset Your Password</h2>
            <p>You requested a password reset for your account. Click the button below to change your password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </p>
            <p style="color: #666; font-size: 14px;">This link is valid for 1 hour. If you did not make this request, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Enterprise Tender Matching Platform</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Resend failed to send reset email: ${err.message}`);
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}

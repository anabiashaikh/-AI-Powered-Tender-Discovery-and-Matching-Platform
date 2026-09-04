import { Controller, Post, Body, UseGuards, Get, Delete, Param, Req, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request
  ): Promise<AuthResponseDto> {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.register(registerDto, ip, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request
  ): Promise<AuthResponseDto> {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Req() req: Request
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    try {
      return await this.authService.refreshToken(refreshToken, ip, userAgent);
    } catch (error) {
      throw new HttpException('Refresh token failed', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body('token') token: string,
    @Req() req: Request
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    await this.authService.verifyEmail(token, ip, userAgent);
    return { message: 'Email verified successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body('email') email: string,
    @Req() req: Request
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    await this.authService.requestPasswordReset(email, ip, userAgent);
    return { message: 'If email exists, reset instructions were sent' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    await this.authService.resetPassword(dto, ip, userAgent);
    return { message: 'Password reset successfully' };
  }

  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  async socialLogin(
    @Body() dto: { email: string; firstName: string; lastName: string; provider: 'google' | 'microsoft'; providerId: string },
    @Req() req: Request
  ): Promise<AuthResponseDto> {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.socialLogin(dto.email, dto.firstName, dto.lastName, dto.provider, dto.providerId, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@GetUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // Active Sessions Management
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@GetUser() user: any) {
    return this.authService.getActiveSessions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(
    @GetUser() user: any,
    @Param('id') id: string
  ) {
    await this.authService.revokeSession(user.id, id);
    return { message: 'Session revoked successfully' };
  }

  // Invite Codes Management (Admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('invite')
  async createInvite(
    @GetUser() user: any,
    @Body() body: { role: string; maxUses: number; expiresAt?: string }
  ) {
    return this.authService.generateInviteCode(body.role, body.maxUses, body.expiresAt, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('invite/usages')
  async getInviteUsages() {
    return this.authService.getInviteUsage();
  }
}

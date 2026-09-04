import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/activate')
  async activateUser(@Param('id') id: string) {
    return this.adminService.setUserActiveStatus(id, true);
  }

  @Patch('users/:id/deactivate')
  async deactivateUser(@Param('id') id: string) {
    return this.adminService.setUserActiveStatus(id, false);
  }

  @Put('users/:id/status')
  async toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('invite-codes')
  async getInviteCodes() {
    return this.adminService.getInviteCodes();
  }

  @Post('invite-codes')
  async createInviteCode(
    @Body() body: { max_uses?: number; expires_in_days?: number },
    @Req() req: any,
  ) {
    return this.adminService.generateInviteCode(
      body.max_uses || 1,
      body.expires_in_days || 7,
      req.user?.userId || req.user?.id,
    );
  }

  @Get('logs')
  async getLogs(
    @Query('level') level?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getLogs(
      level,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('logs')
  async createLog(
    @Body() body: { level: string; message: string; module?: string; metadata?: Record<string, any> },
  ) {
    return this.adminService.createLog(body.level, body.message, body.module, body.metadata);
  }
}

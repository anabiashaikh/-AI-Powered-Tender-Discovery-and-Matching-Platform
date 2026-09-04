import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  async findAll(@GetUser('id') userId: string) {
    return this.notificationsService.findAll(userId);
  }

  @Get('history')
  async getHistory(@GetUser('id') userId: string) {
    return this.notificationsService.getNotificationHistory(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Post('queue-high-score-matches')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async queueHighScoreMatches(@Query('threshold') threshold?: string) {
    await this.notificationsService.queueHighScoreMatches(
      threshold ? parseInt(threshold) : 80,
    );
    return { message: 'High-score match emails queued' };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}

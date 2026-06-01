import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    const stats = await this.dashboardService.getStats(user.id, user.role);
    return { success: true, data: stats };
  }

  @Get('timeline')
  async getTimeline(
    @CurrentUser() user: any,
    @Query('days') days?: number,
  ) {
    const timeline = await this.dashboardService.getReviewTimeline(user.id, user.role, days || 30);
    return { success: true, data: timeline };
  }

  @Get('severity')
  async getSeverityDistribution(@CurrentUser() user: any) {
    const distribution = await this.dashboardService.getSeverityDistribution(user.id, user.role);
    return { success: true, data: distribution };
  }
}

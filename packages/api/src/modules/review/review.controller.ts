import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewService } from './review.service';
import { FeedbackService } from './feedback.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('review')
@UseGuards(AuthGuard('jwt'))
export class ReviewController {
  constructor(
    private reviewService: ReviewService,
    private feedbackService: FeedbackService,
  ) {}

  @Get('findings/:submissionId')
  async getFindings(@Param('submissionId') submissionId: string) {
    const findings = await this.reviewService.getFindingsBySubmission(submissionId);
    return { success: true, data: findings };
  }

  @Get('finding/:id')
  async getFinding(@Param('id') id: string) {
    const finding = await this.reviewService.getFindingById(id);
    return { success: true, data: finding };
  }

  @Get('jobs/:submissionId')
  async getJobStatus(@Param('submissionId') submissionId: string) {
    const jobs = await this.reviewService.getJobStatus(submissionId);
    return { success: true, data: jobs };
  }

  @Patch('finding/:id/resolve')
  async resolveFinding(@Param('id') id: string) {
    const finding = await this.reviewService.markFindingResolved(id);
    return { success: true, data: finding };
  }

  @Post('feedback')
  @UseGuards(RolesGuard)
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN')
  async createFeedback(
    @CurrentUser('id') advisorId: string,
    @Body() body: any,
  ) {
    const feedback = await this.feedbackService.createFeedback(advisorId, body);
    return { success: true, data: feedback };
  }

  @Get('feedback/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  async getFeedbackStats() {
    const stats = await this.feedbackService.getFeedbackStats();
    return { success: true, data: stats };
  }
}

import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlagiarismService } from './plagiarism.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('plagiarism')
@UseGuards(AuthGuard('jwt'))
export class PlagiarismController {
  constructor(private plagiarismService: PlagiarismService) {}

  @Get('submission/:submissionId')
  async getBySubmission(@Param('submissionId') submissionId: string) {
    const alerts = await this.plagiarismService.getAlertsBySubmission(submissionId);
    return { success: true, data: alerts };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR', 'ADVISOR')
  async getAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.plagiarismService.getAllAlerts(page, limit);
    return { success: true, ...result };
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR', 'ADVISOR')
  async review(@Param('id') id: string, @Body('comment') comment: string) {
    const alert = await this.plagiarismService.reviewAlert(id, comment);
    return { success: true, data: alert };
  }
}

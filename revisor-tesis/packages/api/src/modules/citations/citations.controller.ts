import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CitationsService } from './citations.service';

@Controller('citations')
@UseGuards(AuthGuard('jwt'))
export class CitationsController {
  constructor(private citationsService: CitationsService) {}

  @Get('submission/:submissionId')
  async getBySubmission(@Param('submissionId') submissionId: string) {
    const citations = await this.citationsService.getBySubmission(submissionId);
    return { success: true, data: citations };
  }

  @Get('stats/:submissionId')
  async getStats(@Param('submissionId') submissionId: string) {
    const stats = await this.citationsService.getStats(submissionId);
    return { success: true, data: stats };
  }
}

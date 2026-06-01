import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload/:projectId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const submission = await this.documentsService.uploadDocument(projectId, file);
    return {
      success: true,
      data: submission,
      message: 'Documento subido exitosamente. El análisis IA se ha encolado.',
    };
  }

  @Post('upload-multiple/:projectId')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadMultiple(
    @Param('projectId') projectId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      return {
        success: false,
        message: 'No se proporcionaron archivos',
      };
    }

    const submissions = await Promise.all(
      files.map(file => this.documentsService.uploadDocument(projectId, file))
    );

    return {
      success: true,
      data: submissions,
      message: `${submissions.length} documentos subidos exitosamente. El análisis IA se ha encolado para cada uno.`,
    };
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.documentsService.findByProject(projectId, page, limit);
    return { success: true, ...result };
  }

  @Get('report')
  async getReportByName(@Query('name') name: string) {
    const report = await this.documentsService.generateAuditReportByName(name);
    return { success: true, data: { report } };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const document = await this.documentsService.findById(id);
    return { success: true, data: document };
  }

  @Get(':id/download')
  async getDownloadUrl(@Param('id') id: string) {
    const url = await this.documentsService.getDownloadUrl(id);
    return { success: true, data: { url } };
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN')
  async approveReject(
    @Param('id') id: string,
    @CurrentUser('id') advisorId: string,
    @Body() body: { approved: boolean; comment?: string },
  ) {
    const result = await this.documentsService.approveReject(
      id,
      advisorId,
      body.approved,
      body.comment,
    );
    return { success: true, data: result };
  }

  @Get(':id/audit-report')
  async getAuditReport(@Param('id') id: string) {
    const report = await this.documentsService.generateAuditReport(id);
    return { success: true, data: { report } };
  }
}

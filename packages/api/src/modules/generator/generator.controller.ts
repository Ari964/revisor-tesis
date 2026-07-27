import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Res,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { GeneratorService } from './generator.service';

@Controller('generator')
@UseGuards(AuthGuard('jwt'))
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) { }

  /**
   * Recibe y procesa una plantilla de tesis o artículo (.docx o .pdf)
   * POST /api/generator/upload-template
   */
  @Post('upload-template')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadTemplate(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('El archivo de plantilla es obligatorio.');
    }
    const result = await this.generatorService.parseTemplate(file);
    return { success: true, data: result };
  }

  /**
   * Inicia la generación asíncrona de un documento académico completo.
   * POST /api/generator/generate
   */
  @Post('generate')
  async startGeneration(
    @Body() body: {
      type: 'THESIS' | 'ARTICLE' | 'FINAL_THESIS';
      tema: string;
      metadata?: any;
      templateText?: string;
      templateStyles?: any;
    }
  ) {
    const { type, tema, metadata, templateText, templateStyles } = body;
    if (!type || !tema) {
      throw new BadRequestException('Los campos type y tema son obligatorios.');
    }
    if (type !== 'THESIS' && type !== 'ARTICLE' && type !== 'FINAL_THESIS') {
      throw new BadRequestException('El tipo de documento debe ser THESIS, ARTICLE o FINAL_THESIS.');
    }

    const sessionId = this.generatorService.startGeneration(
      type,
      tema,
      metadata || {},
      templateText,
      templateStyles
    );

    return { success: true, sessionId };
  }

  /**
   * Obtiene el estado y progreso de la generación asíncrona.
   * GET /api/generator/status/:sessionId
   */
  @Get('status/:sessionId')
  async getGenerationStatus(@Param('sessionId') sessionId: string): Promise<any> {
    const status = this.generatorService.getGenerationStatus(sessionId);
    if (!status) {
      throw new BadRequestException('Sesión de generación no encontrada.');
    }
    return { success: true, data: status };
  }

  /**
   * Inicializa el proceso de la tesis basado en un tema (mantenido por compatibilidad).
   * POST /api/generator/init
   */
  @Post('init')
  async initThesis(@Body() body: { tema: string; metadata?: any }) {
    if (!body.tema) {
      throw new BadRequestException('El campo tema es obligatorio.');
    }
    const data = await this.generatorService.initThesis(body.tema, body.metadata || {});
    return { success: true, data };
  }

  /**
   * Genera un paso específico del flujo secuencial de la tesis (mantenido por compatibilidad).
   * POST /api/generator/generate-step
   */
  @Post('generate-step')
  async generateStep(
    @Body() body: { stepIndex: number; currentData: any }
  ) {
    const { stepIndex, currentData } = body;
    if (stepIndex === undefined || !currentData) {
      throw new BadRequestException('Los campos stepIndex y currentData son obligatorios.');
    }
    const data = await this.generatorService.generateStep(stepIndex, currentData);
    return { success: true, data };
  }

  /**
   * Genera la estructura y contenido de un Artículo Científico / Producto Académico (mantenido por compatibilidad).
   * POST /api/generator/academic-product
   */
  @Post('academic-product')
  async generateAcademicProduct(
    @Body() body: { tema: string; metadata?: any }
  ) {
    if (!body.tema) {
      throw new BadRequestException('El campo tema es obligatorio para generar el artículo.');
    }
    const data = await this.generatorService.generateAcademicProduct(body.tema, body.metadata || {});
    return { success: true, data };
  }

  /**
   * Exporta la tesis o documento generado en formatos docx, pdf o txt.
   * POST /api/generator/export
   */
  @Post('export')
  async exportThesis(
    @Body() body: { thesisData?: any; sessionId?: string; format: string },
    @Res() res: Response
  ) {
    const { thesisData, sessionId, format } = body;
    if (!format) {
      throw new BadRequestException('El campo format es obligatorio.');
    }

    const fmt = format.toLowerCase();
    if (!['docx', 'pdf', 'txt'].includes(fmt)) {
      throw new BadRequestException('Formato no soportado. Debe ser docx, pdf o txt.');
    }

    let docData = thesisData;
    if (sessionId) {
      const session = this.generatorService.getGenerationStatus(sessionId);
      if (!session || !session.data) {
        throw new BadRequestException('No se encontraron datos para esta sesión.');
      }
      docData = session.data;
    }

    if (!docData) {
      throw new BadRequestException('Debe proporcionar thesisData o sessionId.');
    }

    const buffer = await this.generatorService.exportThesis(docData, fmt);

    let contentType = 'text/plain';
    const fileName = `tesis_borrador.${fmt}`;

    if (fmt === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fmt === 'pdf') {
      contentType = 'application/pdf';
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  /**
   * Exporta el artículo generado en formatos docx, pdf o txt.
   * POST /api/generator/export-article
   */
  @Post('export-article')
  async exportArticle(
    @Body() body: { articleData?: any; sessionId?: string; format: string },
    @Res() res: Response
  ) {
    const { articleData, sessionId, format } = body;
    if (!format) {
      throw new BadRequestException('El campo format es obligatorio.');
    }

    const fmt = format.toLowerCase();
    if (!['docx', 'pdf', 'txt'].includes(fmt)) {
      throw new BadRequestException('Formato no soportado. Debe ser docx, pdf o txt.');
    }

    let docData = articleData;
    if (sessionId) {
      const session = this.generatorService.getGenerationStatus(sessionId);
      if (!session || !session.data) {
        throw new BadRequestException('No se encontraron datos para esta sesión.');
      }
      docData = session.data;
    }

    if (!docData) {
      throw new BadRequestException('Debe proporcionar articleData o sessionId.');
    }

    const buffer = await this.generatorService.exportThesis(docData, fmt);

    let contentType = 'text/plain';
    const fileName = `articulo_borrador.${fmt}`;

    if (fmt === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fmt === 'pdf') {
      contentType = 'application/pdf';
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  /**
   * Obtiene la lista de plantillas disponibles, opcionalmente filtrada por tipo.
   * GET /api/generator/templates
   */
  @Get('templates')
  async getTemplates(@Query('type') type?: string) {
    const templates = await this.generatorService.getTemplates(type);
    return { success: true, data: templates };
  }

  /**
   * Obtiene el detalle de una plantilla guardada por su ID.
   * GET /api/generator/templates/:id
   */
  @Get('templates/:id')
  async getTemplateById(@Param('id') id: string) {
    const template = await this.generatorService.getTemplateById(id);
    return { success: true, data: template };
  }

  /**
   * Sube una plantilla, la parsea automáticamente y la guarda en BD.
   * POST /api/generator/templates/upload
   */
  @Post('templates/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadAndSaveTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('documentType') documentType: string,
  ) {
    if (!file || !name || !documentType) {
      throw new BadRequestException('El archivo, el nombre y el tipo de documento son obligatorios.');
    }
    const template = await this.generatorService.uploadAndSaveTemplate(file, name, documentType);
    return { success: true, data: template };
  }

  /**
   * Elimina una plantilla guardada por su ID.
   * DELETE /api/generator/templates/:id
   */
  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    await this.generatorService.deleteTemplate(id);
    return { success: true, message: 'Plantilla eliminada correctamente' };
  }

  /**
   * Revisa un documento borrador comparándolo con una plantilla y pautas personalizadas.
   * POST /api/generator/review-document
   */
  @Post('review-document')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'documentFile', maxCount: 1 },
    { name: 'templateFile', maxCount: 1 }
  ], { limits: { fileSize: 15 * 1024 * 1024 } }))
  async reviewDocument(
    @UploadedFiles() files: { documentFile?: Express.Multer.File[], templateFile?: Express.Multer.File[] },
    @Body('templateId') templateId?: string,
    @Body('customPrompt') customPrompt?: string,
  ) {
    const draftFile = files?.documentFile?.[0];
    if (!draftFile) {
      throw new BadRequestException('El archivo de documento a revisar es obligatorio.');
    }
    const templateFile = files?.templateFile?.[0];
    const report = await this.generatorService.reviewDocument(
      draftFile,
      templateFile,
      templateId,
      customPrompt
    );
    return { success: true, data: report };
  }
}
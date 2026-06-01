import { Controller, Post, Body, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { GeneratorService } from './generator.service';

@Controller('generator')
@UseGuards(AuthGuard('jwt'))
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post('init')
  async initThesis(@Body() body: { tema: string; metadata?: any }) {
    if (!body.tema) {
      throw new BadRequestException('El campo tema es obligatorio.');
    }
    const data = await this.generatorService.initThesis(body.tema, body.metadata || {});
    return { success: true, data };
  }

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

  @Post('export')
  async exportThesis(
    @Body() body: { thesisData: any; format: string },
    @Res() res: Response
  ) {
    const { thesisData, format } = body;
    if (!thesisData || !format) {
      throw new BadRequestException('Los campos thesisData y format son obligatorios.');
    }

    const fmt = format.toLowerCase();
    if (!['docx', 'pdf', 'txt'].includes(fmt)) {
      throw new BadRequestException('Formato no soportado. Debe ser docx, pdf o txt.');
    }

    const buffer = await this.generatorService.exportThesis(thesisData, fmt);

    let contentType = 'text/plain';
    let fileName = `tesis_borrador.${fmt}`;

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
}

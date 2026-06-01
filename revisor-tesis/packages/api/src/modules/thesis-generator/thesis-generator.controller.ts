import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ThesisGeneratorService } from './thesis-generator.service';

@Controller('thesis-generator')
export class ThesisGeneratorController {
  constructor(private generator: ThesisGeneratorService) {}

  @Post('generate')
  async generate(@Body() body: { title?: string; sections?: string[]; length?: 'short' | 'medium' | 'long' }) {
    if (!body) throw new BadRequestException('Se requiere el cuerpo con los parámetros');
    const text = await this.generator.generateProjectDraft({
      title: body.title,
      sections: body.sections,
      length: body.length,
    });
    return { success: true, data: { text } };
  }
}

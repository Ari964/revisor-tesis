import { Module } from '@nestjs/common';
import { ThesisGeneratorController } from './thesis-generator.controller';
import { ThesisGeneratorService } from './thesis-generator.service';

@Module({
  controllers: [ThesisGeneratorController],
  providers: [ThesisGeneratorService],
  exports: [ThesisGeneratorService],
})
export class ThesisGeneratorModule {}

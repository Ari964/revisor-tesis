import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { QUEUES } from '@revisor-tesis/shared';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.EMBEDDINGS },
      { name: QUEUES.GEMINI_REVIEW },
      { name: QUEUES.PLAGIARISM },
      { name: QUEUES.CROSSREF },
      { name: QUEUES.NOTIFICATIONS },
    ),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

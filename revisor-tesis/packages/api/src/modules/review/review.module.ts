import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { FeedbackService } from './feedback.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, FeedbackService],
  exports: [ReviewService, FeedbackService],
})
export class ReviewModule {}

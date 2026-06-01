// Re-export Prisma Client and types
export { PrismaClient } from '@prisma/client';
export type {
  User,
  RefreshToken,
  OrcidProfile,
  ThesisProject,
  DocumentPattern,
  DocumentSubmission,
  AiReviewJob,
  AiReviewFinding,
  PlagiarismAlert,
  CitationValidation,
  FeedbackCorrection,
  Notification,
} from '@prisma/client';

export {
  UserRole,
  DocumentStatus,
  JobStatus,
  FindingSeverity,
  FindingCategory,
  CitationStatus,
  NotificationType,
} from '@prisma/client';

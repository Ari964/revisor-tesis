// ==============================================================
// DTOs compartidos entre API, Workers y Frontend
// ==============================================================

// ─── Auth DTOs ──────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'STUDENT' | 'ADVISOR';
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfileDto;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// ─── User DTOs ──────────────────────────────────────────────

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  orcidId?: string;
}

// ─── Thesis DTOs ────────────────────────────────────────────

export interface CreateThesisDto {
  title: string;
  description?: string;
  researchLine?: string;
  advisorId?: string;
  patternId?: string;
  nextDeadline?: string;
}

export interface UpdateThesisDto {
  title?: string;
  description?: string;
  researchLine?: string;
  advisorId?: string;
  patternId?: string;
  currentPhase?: string;
  nextDeadline?: string;
}

export interface ThesisProjectDto {
  id: string;
  title: string;
  description?: string;
  researchLine?: string;
  currentPhase?: string;
  nextDeadline?: string;
  isActive: boolean;
  student: UserProfileDto;
  advisor?: UserProfileDto;
  coordinator?: UserProfileDto;
  submissionCount: number;
  lastSubmissionDate?: string;
  createdAt: string;
}

// ─── Document DTOs ──────────────────────────────────────────

export interface DocumentSubmissionDto {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  overallScore?: number;
  advisorApproved?: boolean;
  advisorComment?: string;
  chunkCount?: number;
  findingsCount: number;
  plagiarismAlertsCount: number;
  citationsCount: number;
  submittedAt: string;
  reviewedAt?: string;
}

// ─── Pattern DTOs ───────────────────────────────────────────

export interface PatternStructureSection {
  title: string;
  required: boolean;
  minWords?: number;
  minCount?: number;
  subsections?: PatternStructureSection[];
}

export interface PatternStructureChapter {
  order: number;
  title: string;
  required: boolean;
  minWords?: number;
  minCitations?: number;
  sections: PatternStructureSection[];
}

export interface PatternStructure {
  formatRules: {
    font: string;
    fontSize: number;
    lineSpacing: number;
    margins: { top: number; bottom: number; left: number; right: number };
    pageNumbering: string;
    citationStyle: string;
  };
  chapters: PatternStructureChapter[];
  appendices?: {
    required: boolean;
    label: string;
  };
}

export interface DocumentPatternDto {
  id: string;
  name: string;
  description?: string;
  version: string;
  structure: PatternStructure;
  isDefault: boolean;
  createdAt: string;
}

export interface CreatePatternDto {
  name: string;
  description?: string;
  version?: string;
  structure: PatternStructure;
  isDefault?: boolean;
}

// ─── AI Review DTOs ─────────────────────────────────────────

export interface AiReviewFindingDto {
  id: string;
  submissionId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  instruction: string;
  affectedSection?: string;
  pageNumber?: number;
  suggestedScore?: number;
  originalText?: string;
  isResolved: boolean;
  feedbackCorrection?: FeedbackCorrectionDto;
  createdAt: string;
}

// ─── Plagiarism DTOs ────────────────────────────────────────

export interface PlagiarismAlertDto {
  id: string;
  submissionId: string;
  sourceChunkText: string;
  matchedChunkText: string;
  matchedDocumentId: string;
  matchedFileName?: string;
  similarityScore: number;
  chunkIndex: number;
  isReviewed: boolean;
  reviewerComment?: string;
  createdAt: string;
}

// ─── Citation DTOs ──────────────────────────────────────────

export interface CitationValidationDto {
  id: string;
  submissionId: string;
  rawCitation: string;
  extractedTitle?: string;
  extractedDoi?: string;
  extractedYear?: string;
  status: string;
  matchScore?: number;
  crossrefTitle?: string;
  crossrefDoi?: string;
  createdAt: string;
}

// ─── Feedback DTOs ──────────────────────────────────────────

export interface FeedbackCorrectionDto {
  id: string;
  findingId: string;
  advisorId: string;
  wasAccepted: boolean;
  correctedSeverity?: string;
  correctedDescription?: string;
  correctedInstruction?: string;
  advisorNotes?: string;
  createdAt: string;
}

export interface CreateFeedbackDto {
  findingId: string;
  wasAccepted: boolean;
  correctedSeverity?: string;
  correctedDescription?: string;
  correctedInstruction?: string;
  advisorNotes?: string;
}

// ─── Dashboard DTOs ─────────────────────────────────────────

export interface DashboardStatsDto {
  totalProjects: number;
  activeProjects: number;
  totalSubmissions: number;
  pendingReviews: number;
  completedReviews: number;
  averageScore: number;
  plagiarismAlerts: number;
  verifiedCitations: number;
}

export interface ReviewTimelineDto {
  date: string;
  submissions: number;
  reviews: number;
}

export interface SeverityDistributionDto {
  severity: string;
  count: number;
}

// ─── Notification DTOs ──────────────────────────────────────

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  sentAt?: string;
  createdAt: string;
}

// ─── API Response Wrapper ───────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

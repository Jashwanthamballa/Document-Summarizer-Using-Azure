export interface EvaluationResponse {
  readability_score: number;
  consistency_score: number;
  overall_quality_score: number;
  flesch_reading_ease: number;
  flesch_kincaid_grade: number;
  semantic_similarity_score: number;
}

export interface FileResult {
  file_id: string;
  filename: string;
  summaries: {
    short: string;
    medium: string;
    long: string;
  };
  evaluations: {
    short?: EvaluationResponse;
    medium?: EvaluationResponse;
    long?: EvaluationResponse;
  };
  status: string;
}

export interface MultiPDFResponse {
  session_id: string;
  status: string;
  total_files: number;
  processed_files: number;
  files: FileResult[];
  aggregate_summaries?: {
    short?: string;
    medium?: string;
    long?: string;
  };
}

export interface UploadSessionResponse {
  session_id: string;
  status: string;
  message: string;
}

export interface SummaryResponse {
  short: string;
  medium: string;
  long: string;
  status: string;
}

export interface ErrorResponse {
  error: string;
  status: string;
}

export interface UploadedFileWithPreview {
  file: File;
  id: string;
  name: string;
  size: number;
  preview?: string;
}

export type SummaryType = 'short' | 'medium' | 'long';

export interface SessionInfo {
  session_id: string;
  status: string;
  total_files: number;
  processed_files: number;
  created_at: string;
  file_names: string[];
}

export interface SessionsResponse {
  sessions: SessionInfo[];
  total: number;
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface EvaluationMetrics {
  readability: {
    score: number;
    grade: string;
    ease: number;
  };
  consistency: {
    score: number;
    similarity: number;
  };
  overall: {
    score: number;
    rating: string;
  };
}
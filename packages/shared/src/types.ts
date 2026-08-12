export type FailureTaxonomy = 'PASSED' | 'APP_DEFECT' | 'INFRA_ERROR' | 'RECOVERED';

export type JobPriority = 'interactive' | 'scheduled';

export interface CreateJobInput {
  url: string;
  prompt: string;
  workspaceId?: string;
  priority?: JobPriority;
  maxSteps?: number;
}

export interface JobRecord {
  id: string;
  workspaceId: string;
  url: string;
  prompt: string;
  priority: JobPriority;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  taxonomy?: FailureTaxonomy;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RunRecord {
  id: string;
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  taxonomy?: FailureTaxonomy;
  fitnessScore?: number;
  totalSteps: number;
  durationMs?: number;
  traceUrl?: string;
  screenshotUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StepLogRecord {
  id: string;
  runId: string;
  stepNumber: number;
  actionTaken: string;
  toolCallName: string;
  toolArgs: Record<string, unknown>;
  toolResult: string;
  screenshotUrl?: string;
  timestamp: string;
  summarized: boolean;
}

export interface PreflightResult {
  ok: boolean;
  category?: 'TARGET_UNREACHABLE' | 'APP_RENDER_ERROR' | 'SSRF_BLOCKED';
  detail?: string | string[];
}

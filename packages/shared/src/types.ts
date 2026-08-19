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

export interface TestTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  url: string;
  prompt: string;
  stages?: Array<{ stageNumber: number; personaName?: string; goal: string }>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  url: string;
  prompt: string;
  workspaceId?: string;
  tags?: string[];
  stages?: Array<{ stageNumber: number; personaName?: string; goal: string }>;
}

export interface RunMemory {
  id: string;
  runId: string;
  extractedData: Record<string, unknown>;
  passedAssertions: string[];
  failedAssertions: string[];
  selectorCache: Record<string, string>;
  structuredSummary: string;
  createdAt: string;
}

export interface Persona {
  id: string;
  workspaceId: string;
  name: string;
  role: string;
  username?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}


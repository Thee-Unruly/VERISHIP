export type FailureTaxonomy = 'PASSED' | 'APP_DEFECT' | 'INFRA_ERROR' | 'RECOVERED';

export type JobPriority = 'interactive' | 'scheduled';

// ==========================================
// Projects & Governance Types
// ==========================================

export type ProjectStatus = 'planning' | 'in-progress' | 'on-track' | 'at-risk' | 'blocked' | 'completed';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  healthScore?: number;
  qualityCoverage?: number;
  targetReleaseDate?: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  targetReleaseDate?: string;
  workspaceId?: string;
}

// ==========================================
// Requirements QA & AI Copilot Types
// ==========================================

export type RequirementStatus = 'draft' | 'review' | 'approved' | 'deprecated';

export interface AcceptanceCriteria {
  id: string;
  requirementId: string;
  criteria: string;
  isCovered?: boolean;
}

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: RequirementStatus;
  clarityScore?: number; // 0 - 100
  testabilityScore?: number; // 0 - 100
  ambiguities?: string[];
  missingCriteria?: string[];
  suggestedAcceptanceCriteria?: string[];
  acceptanceCriteria?: AcceptanceCriteria[];
  testCaseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequirementInput {
  projectId: string;
  title: string;
  description?: string;
  status?: RequirementStatus;
  acceptanceCriteria?: string[];
}

export interface RequirementClarityAnalysis {
  clarityScore: number;
  testabilityScore: number;
  summary: string;
  ambiguities: string[];
  missingCriteria: string[];
  suggestedAcceptanceCriteria: string[];
  suggestedTestScenarios: Array<{
    title: string;
    type: 'positive' | 'negative' | 'edge-case' | 'security';
    description: string;
    expectedResult: string;
  }>;
}

// ==========================================
// Test Cases & Test Design Types
// ==========================================

export type TestType = 'manual' | 'automated' | 'autonomous-agent' | 'load';
export type TestCaseStatus = 'draft' | 'ready' | 'passed' | 'failed' | 'blocked' | 'flaky';

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
  targetSelector?: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  requirementId?: string;
  suiteId?: string;
  title: string;
  description?: string;
  testType: TestType;
  status: TestCaseStatus;
  targetUrl?: string;
  prompt?: string;
  steps?: TestStep[];
  lastRunId?: string;
  lastRunStatus?: string;
  lastRunFitness?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestCaseInput {
  projectId: string;
  requirementId?: string;
  suiteId?: string;
  title: string;
  description?: string;
  testType?: TestType;
  targetUrl?: string;
  prompt?: string;
  steps?: TestStep[];
}

export interface TestSuite {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  testCaseCount?: number;
  passRate?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Defects & Defect Intelligence Types
// ==========================================

export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low' | 'trivial';
export type DefectStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'reopened';

export interface Defect {
  id: string;
  projectId: string;
  runId?: string;
  testCaseId?: string;
  title: string;
  description?: string;
  severity: DefectSeverity;
  status: DefectStatus;
  rootCauseAnalysis?: string;
  suggestedFix?: string;
  reproductionSteps?: string[];
  screenshotUrl?: string;
  traceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDefectInput {
  projectId: string;
  runId?: string;
  testCaseId?: string;
  title: string;
  description?: string;
  severity?: DefectSeverity;
  rootCauseAnalysis?: string;
  suggestedFix?: string;
  reproductionSteps?: string[];
  screenshotUrl?: string;
  traceUrl?: string;
}

// ==========================================
// Release Governance & Delivery Gate Types
// ==========================================

export type ReleaseStatus = 'planning' | 'in-testing' | 'ready' | 'approved' | 'released' | 'blocked' | 'rollback';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ReleaseApproval {
  id: string;
  releaseId: string;
  role: 'qa' | 'pm' | 'engineering' | 'security';
  approverName: string;
  status: ApprovalStatus;
  comments?: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  name?: string;
  description?: string;
  status: ReleaseStatus;
  readinessScore?: number; // 0 - 100
  recommendation?: 'GO' | 'NO-GO' | 'CONDITIONAL';
  targetDate?: string;
  totalTests?: number;
  passedTests?: number;
  openDefectsCount?: number;
  criticalDefectsCount?: number;
  approvals?: ReleaseApproval[];
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseReadinessAnalysis {
  readinessScore: number;
  recommendation: 'GO' | 'NO-GO' | 'CONDITIONAL';
  summary: string;
  blockingIssues: Array<{
    type: 'critical_defect' | 'coverage_gap' | 'failing_tests' | 'unapproved_gate';
    description: string;
    severity: string;
  }>;
  metrics: {
    testPassRate: number;
    requirementsCovered: number;
    openDefects: number;
    criticalDefects: number;
  };
}

// ==========================================
// Service Accounts & Integrations (n8n / MCP)
// ==========================================

export interface ServiceAccount {
  id: string;
  name: string;
  description?: string;
  role: 'agent' | 'readonly' | 'admin';
  token: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

// ==========================================
// QA Metrics & Insights
// ==========================================

export interface QualityMetrics {
  coverageRate: number;
  passRate: number;
  defectDensity: number;
  flakinessRate: number;
  totalRequirements: number;
  totalTestCases: number;
  totalDefects: number;
  openDefects: number;
}

export interface QAInsight {
  id: string;
  projectId: string;
  category: 'risk_warning' | 'coverage_gap' | 'flaky_pattern' | 'quality_trend';
  title: string;
  description: string;
  scoreImpact?: number;
  actionableRecommendation?: string;
  createdAt: string;
}

// ==========================================
// Execution Engine Types (Jobs, Runs, Steps)
// ==========================================

export interface CreateJobInput {
  url: string;
  prompt: string;
  workspaceId?: string;
  projectId?: string;
  testCaseId?: string;
  priority?: JobPriority;
  maxSteps?: number;
}

export interface JobRecord {
  id: string;
  workspaceId: string;
  projectId?: string;
  testCaseId?: string;
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
  projectId?: string;
  testCaseId?: string;
  status: 'running' | 'completed' | 'failed';
  taxonomy?: FailureTaxonomy;
  fitnessScore?: number;
  totalSteps: number;
  durationMs?: number;
  traceUrl?: string;
  videoUrl?: string;
  specUrl?: string;
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

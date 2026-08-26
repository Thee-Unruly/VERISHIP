import dotenv from 'dotenv';
import { RequirementClarityAnalysis, ReleaseReadinessAnalysis } from '@universal-qa/shared';

dotenv.config();

export class AIService {
  private static getApiKey(): { key: string; provider: string } {
    if (process.env.OPENROUTER_API_KEY) {
      return { key: process.env.OPENROUTER_API_KEY, provider: 'openrouter' };
    }
    if (process.env.GROQ_API_KEY) {
      return { key: process.env.GROQ_API_KEY, provider: 'groq' };
    }
    if (process.env.OPENAI_API_KEY) {
      return { key: process.env.OPENAI_API_KEY, provider: 'openai' };
    }
    return { key: '', provider: 'mock' };
  }

  private static async completePrompt(systemPrompt: string, userPrompt: string): Promise<string> {
    const { key, provider } = this.getApiKey();

    if (provider === 'openrouter' || provider === 'openai' || provider === 'groq') {
      const url = provider === 'openrouter' 
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

      const model = provider === 'openrouter'
        ? (process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free')
        : provider === 'groq'
        ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b')
        : 'gpt-4o-mini';

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://veriship.dev', 'X-Title': 'VeriShip QA' } : {})
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || '';
        }
      } catch (err) {
        console.warn(`[AIService] Call failed with ${provider}:`, err);
      }
    }

    return '';
  }

  static async analyzeRequirementClarity(title: string, description: string): Promise<RequirementClarityAnalysis> {
    const systemPrompt = `You are VeriShip Quality Copilot. Analyze the software requirement for testability, clarity, ambiguities, and missing acceptance criteria. Output ONLY valid JSON matching this schema:
{
  "clarityScore": 85,
  "testabilityScore": 90,
  "summary": "Detailed assessment of requirement clarity",
  "ambiguities": ["List of unclear statements"],
  "missingCriteria": ["List of missing edge cases or error scenarios"],
  "suggestedAcceptanceCriteria": ["Given/When/Then or bullet criteria"],
  "suggestedTestScenarios": [
    {
      "title": "Positive Test Scenario",
      "type": "positive",
      "description": "Step by step flow",
      "expectedResult": "Expected state"
    },
    {
      "title": "Edge Case Scenario",
      "type": "edge-case",
      "description": "Boundary testing",
      "expectedResult": "Expected error or fallback"
    }
  ]
}`;

    const userPrompt = `Requirement Title: ${title}\nRequirement Description: ${description || 'N/A'}`;
    const raw = await this.completePrompt(systemPrompt, userPrompt);

    if (raw) {
      try {
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }
        return JSON.parse(cleaned);
      } catch (err) {
        console.warn('[AIService] Failed to parse AI JSON response, using deterministic analysis fallback');
      }
    }

    // Deterministic Rule-based Analysis Fallback
    const words = `${title} ${description}`.toLowerCase();
    const hasErrorHandling = words.includes('error') || words.includes('invalid') || words.includes('fail');
    const hasPerformance = words.includes('fast') || words.includes('ms') || words.includes('second');
    const hasAuth = words.includes('auth') || words.includes('permission') || words.includes('role');

    const ambiguities: string[] = [];
    const missingCriteria: string[] = [];
    let score = 75;

    if (!hasErrorHandling) {
      ambiguities.push('No explicit error handling or invalid input behavior specified.');
      missingCriteria.push('Define behavior when input payload is malformed or empty.');
      score -= 10;
    }
    if (!description || description.length < 30) {
      ambiguities.push('Requirement description is concise and lacks boundary conditions.');
      score -= 15;
    }

    return {
      clarityScore: Math.max(50, score),
      testabilityScore: Math.max(60, score + 5),
      summary: `Automated assessment for "${title}". Requirement has clear core intent but benefits from formalized edge criteria.`,
      ambiguities,
      missingCriteria,
      suggestedAcceptanceCriteria: [
        `GIVEN a valid user request WHEN ${title} is initiated THEN system responds with 200 OK and expected state`,
        `GIVEN invalid or empty inputs WHEN operation is attempted THEN system displays a friendly validation warning`,
        `GIVEN network latency or timeouts WHEN request fails THEN client retries gracefully without data corruption`
      ],
      suggestedTestScenarios: [
        {
          title: `Verify happy path for ${title}`,
          type: 'positive',
          description: `Execute the primary workflow for ${title} under nominal conditions.`,
          expectedResult: `Workflow completes and UI updates cleanly.`
        },
        {
          title: `Verify invalid inputs and validation boundaries`,
          type: 'edge-case',
          description: `Submit invalid, boundary, or null data to test input validation.`,
          expectedResult: `Graceful validation message without application crash.`
        }
      ]
    };
  }

  static async analyzeReleaseReadiness(
    projectName: string,
    passRate: number,
    criticalDefects: number,
    openDefects: number,
    coverage: number
  ): Promise<ReleaseReadinessAnalysis> {
    const blockingIssues: ReleaseReadinessAnalysis['blockingIssues'] = [];
    let readinessScore = 100;

    if (criticalDefects > 0) {
      blockingIssues.push({
        type: 'critical_defect',
        description: `${criticalDefects} critical defect(s) unresolved in current release candidate.`,
        severity: 'critical'
      });
      readinessScore -= criticalDefects * 30;
    }

    if (passRate < 90) {
      blockingIssues.push({
        type: 'failing_tests',
        description: `Test pass rate is ${passRate.toFixed(1)}%, below the 90% release gate threshold.`,
        severity: 'high'
      });
      readinessScore -= (90 - passRate) * 1.5;
    }

    if (coverage < 70) {
      blockingIssues.push({
        type: 'coverage_gap',
        description: `Requirement test coverage is ${coverage.toFixed(1)}%, below the 70% threshold.`,
        severity: 'medium'
      });
      readinessScore -= (70 - coverage) * 0.8;
    }

    readinessScore = Math.max(0, Math.min(100, Math.round(readinessScore)));
    const recommendation = readinessScore >= 85 && criticalDefects === 0 ? 'GO' 
                         : readinessScore >= 65 && criticalDefects === 0 ? 'CONDITIONAL' 
                         : 'NO-GO';

    return {
      readinessScore,
      recommendation,
      summary: recommendation === 'GO'
        ? `Release candidate for ${projectName} meets all automated governance criteria.`
        : `Release candidate has ${blockingIssues.length} governance warnings/blockers requiring sign-off.`,
      blockingIssues,
      metrics: {
        testPassRate: passRate,
        requirementsCovered: coverage,
        openDefects,
        criticalDefects
      }
    };
  }

  static async analyzeDefectRootCause(title: string, failureReason: string, stepAction?: string): Promise<{ rootCause: string; suggestedFix: string }> {
    return {
      rootCause: `Autonomous agent encountered failure during "${stepAction || 'execution'}": ${failureReason}. The DOM element locator or application state failed assertions.`,
      suggestedFix: `Inspect locator selector resiliency and verify backend API latency or authentication state prior to action.`
    };
  }

  static async chatWithQAAssistant(message: string, contextData: Record<string, any>): Promise<string> {
    const systemPrompt = `You are VeriBot, the intelligent AI Quality & Governance Assistant for VeriShip.
You have real-time access to the platform's current live state:
${JSON.stringify(contextData, null, 2)}

Provide clear, helpful, accurate, and concise markdown responses in plain English.
If the user asks about defects, test runs, requirements, health scores, or release readiness, use the provided context data to give exact figures and helpful recommendations.`;

    const raw = await this.completePrompt(systemPrompt, message);
    if (raw && raw.trim().length > 0) {
      return raw.trim();
    }

    return `Hello! I'm your VeriShip QA Assistant. We have ${contextData.projectsCount || 0} active project(s), ${contextData.testCasesCount || 0} test case(s), and ${contextData.defectsCount || 0} open defect(s). How can I assist you with your QA governance today?`;
  }
}

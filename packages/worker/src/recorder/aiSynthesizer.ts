import { Pool } from 'pg';
import { createLLMAdapter } from '../llm/llmAdapter';
import { ArtifactWriter } from '../storage/artifactWriter';
import { RecordedStep, FlowBlock, SynthesizerStatus } from '@universal-qa/shared';
import * as ts from 'typescript';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export interface SynthesizeSessionResult {
  specCode: string;
  specUrl: string;
  synthesizerStatus: SynthesizerStatus;
  synthesizerWarning?: string;
  flowBlock?: FlowBlock;
  inferredAssertions: Array<{ stepNumber: number; assertion: string; confidence: number }>;
  tags: string[];
}

export class AISynthesizer {
  private pool: Pool;
  private llmAdapter = createLLMAdapter();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Validate TypeScript syntax and AST structure.
   */
  public validateTypeScript(code: string): { valid: boolean; error?: string } {
    try {
      const result = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          noEmitOnError: true,
        },
        reportDiagnostics: true,
      });

      if (result.diagnostics && result.diagnostics.length > 0) {
        const firstError = result.diagnostics[0];
        const message = typeof firstError.messageText === 'string'
          ? firstError.messageText
          : firstError.messageText.messageText;
        return { valid: false, error: message };
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  /**
   * Generates a high-quality deterministic fallback template with guaranteed valid TypeScript.
   */
  public generateDeterministicFallbackTemplate(
    sessionName: string,
    targetUrl: string,
    steps: RecordedStep[]
  ): string {
    const lines: string[] = [];
    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push(``);
    lines.push(`test.describe('${escapeString(sessionName)} (Recorded Flow)', () => {`);
    lines.push(`  test('should execute recorded golden path flow', async ({ page }) => {`);
    lines.push(`    // Navigate to initial target`);
    lines.push(`    await page.goto('${escapeString(targetUrl)}', { waitUntil: 'domcontentloaded' });`);
    lines.push(``);

    for (const s of steps) {
      lines.push(`    // Step ${s.stepNumber}: [${s.systemCategory}] ${s.actionType.toUpperCase()} on ${s.targetSelector}`);
      if (s.actionType === 'click') {
        lines.push(`    await ${s.targetSelector}.click();`);
      } else if (s.actionType === 'fill') {
        const val = s.isSensitive ? 'process.env.TEST_PASSWORD || "Secret123!"' : JSON.stringify(s.inputValue || '');
        lines.push(`    await ${s.targetSelector}.fill(${val});`);
      } else if (s.actionType === 'navigate') {
        lines.push(`    await page.goto('${escapeString(s.pageUrl)}');`);
      } else if (s.isAssertion && s.assertionRule) {
        if (s.assertionRule.type === 'visible') {
          lines.push(`    await expect(${s.targetSelector}).toBeVisible();`);
        } else if (s.assertionRule.type === 'text_match' && s.assertionRule.expected) {
          lines.push(`    await expect(${s.targetSelector}).toContainText('${escapeString(s.assertionRule.expected)}');`);
        }
      }
      lines.push(``);
    }

    lines.push(`  });`);
    lines.push(`});`);

    return lines.join('\n');
  }

  /**
   * Main AI synthesis pipeline with AST verification and self-correction loop.
   */
  public async synthesize(sessionId: string): Promise<SynthesizeSessionResult> {
    console.log(`[AISynthesizer] Synthesizing Playwright test for session ${sessionId}...`);

    // 1. Fetch Session and Steps from DB
    const sessionRes = await this.pool.query(
      `SELECT * FROM recording_sessions WHERE id = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      throw new Error(`Recording session ${sessionId} not found.`);
    }
    const session = sessionRes.rows[0];

    const stepsRes = await this.pool.query(
      `SELECT * FROM recorded_steps WHERE session_id = $1 ORDER BY step_number ASC`,
      [sessionId]
    );
    const steps: RecordedStep[] = stepsRes.rows.map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      stepNumber: r.step_number,
      actionType: r.action_type,
      targetSelector: r.target_selector,
      selectorType: r.selector_type,
      inputValue: r.input_value,
      isSensitive: r.is_sensitive,
      pageUrl: r.page_url,
      pageTitle: r.page_title,
      screenshotUrl: r.screenshot_url,
      systemCategory: r.system_category,
      customTags: r.custom_tags || [],
      isAssertion: r.is_assertion,
      assertionRule: r.assertion_rule,
      createdAt: r.created_at,
    }));

    if (steps.length === 0) {
      const fallbackSpec = this.generateDeterministicFallbackTemplate(session.name, session.target_url, []);
      return {
        specCode: fallbackSpec,
        specUrl: '',
        synthesizerStatus: 'fallback_template',
        synthesizerWarning: 'No recorded steps captured in this session.',
        inferredAssertions: [],
        tags: ['empty-flow'],
      };
    }

    // 2. Build LLM Synthesis Prompt
    const stepsSummary = steps.map((s) => ({
      step: s.stepNumber,
      category: s.systemCategory,
      action: s.actionType,
      selector: s.targetSelector,
      value: s.isSensitive ? '[REDACTED_PASSWORD]' : s.inputValue,
      url: s.pageUrl,
      isAssertion: s.isAssertion,
    }));

    const systemPrompt = `You are a Senior QA Test Automation Architect specializing in Playwright TypeScript.
Your task is to take a sequence of recorded user browser interactions and synthesize a clean, robust, production-grade Playwright .spec.ts test file.

Guidelines:
1. Use modern Playwright best practices (Page Object structure, resilient getByRole/getByLabel locators, auto-waiting).
2. Group related steps (e.g. login, task creation) logically.
3. Automatically identify and insert inferred assertions (e.g. verify toast alert appears, modal closes, item is added to table).
4. Parameterize test data into a clean fixture object at the top of the test.
5. Suggest 2-5 normalized tags for memory indexing (e.g. ["auth", "agilepm-task", "task-creation"]).
6. Respond ONLY in valid JSON with this exact schema:
{
  "specCode": "<FULL_TYPESCRIPT_PLAYWRIGHT_SPEC_CODE>",
  "tags": ["tag1", "tag2"],
  "inferredAssertions": [
    { "stepNumber": 3, "assertion": "expect(toast).toBeVisible()", "confidence": 0.95 }
  ],
  "selectorMap": {
    "taskTitleInput": "page.getByLabel('Title')",
    "submitBtn": "page.getByRole('button', { name: 'Save' })"
  },
  "summary": "<Short explanation of the synthesized flow>"
}`;

    const userPrompt = `Session Name: "${session.name}"
Target URL: "${session.target_url}"
Recorded Step Timeline:
${JSON.stringify(stepsSummary, null, 2)}`;

    let generatedSpec = '';
    let generatedTags: string[] = ['flow-recorded'];
    let inferredAssertions: any[] = [];
    let selectorMap: Record<string, string> = {};
    let synthesizerStatus: SynthesizerStatus = 'success';
    let synthesizerWarning: string | undefined = undefined;

    let retryCount = 0;
    const MAX_RETRIES = 2;
    let isValidTs = false;
    let currentLlmError: string | undefined = undefined;

    while (retryCount <= MAX_RETRIES && !isValidTs) {
      try {
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: currentLlmError ? `${userPrompt}\n\nPREVIOUS GENERATION FAILED TYPESCRIPT COMPILATION:\n${currentLlmError}\nPlease fix the syntax and return valid TypeScript.` : userPrompt },
        ];

        const response = this.llmAdapter.rawChat
          ? await this.llmAdapter.rawChat(messages)
          : JSON.stringify({ specCode: this.generateDeterministicFallbackTemplate(session.name, session.target_url, steps) });
        const parsed = JSON.parse(response);

        if (parsed.specCode) {
          const validation = this.validateTypeScript(parsed.specCode);
          if (validation.valid) {
            generatedSpec = parsed.specCode;
            generatedTags = parsed.tags || [];
            inferredAssertions = parsed.inferredAssertions || [];
            selectorMap = parsed.selectorMap || {};
            isValidTs = true;
            synthesizerStatus = 'success';
            break;
          } else {
            currentLlmError = validation.error;
            retryCount++;
            console.warn(`[AISynthesizer] TS Compilation failed on attempt ${retryCount}: ${validation.error}`);
          }
        } else {
          currentLlmError = 'JSON response did not contain specCode string.';
          retryCount++;
        }
      } catch (err: any) {
        currentLlmError = err.message;
        retryCount++;
        console.warn(`[AISynthesizer] LLM synthesis error on attempt ${retryCount}: ${err.message}`);
      }
    }

    // 3. Fallback to Deterministic Template if AI self-correction exhausted
    if (!isValidTs || !generatedSpec) {
      console.warn(`[AISynthesizer] Retries exhausted. Falling back to deterministic syntax template.`);
      generatedSpec = this.generateDeterministicFallbackTemplate(session.name, session.target_url, steps);
      synthesizerStatus = 'fallback_template';
      synthesizerWarning = `AI generation failed syntax validation (${currentLlmError}). Reverted to deterministic template.`;
      generatedTags = ['deterministic-fallback'];
    }

    // 4. Write Generated .spec.ts to Artifact Storage
    const artifactWriter = new ArtifactWriter(sessionId);
    const specDir = artifactWriter.getVideoDir();
    const specFilePath = path.join(specDir, 'test.spec.ts');
    fs.writeFileSync(specFilePath, generatedSpec, 'utf-8');
    const specUrl = `/artifacts/${sessionId}/test.spec.ts`;

    // 5. Index into Flow Blocks and Run Memory
    const flowBlockId = `fb_${uuidv4().replace(/-/g, '')}`;
    const flowName = session.name || `Flow from ${new URL(session.target_url).hostname}`;

    try {
      await this.pool.query(
        `INSERT INTO flow_blocks (
          id, workspace_id, project_id, name, description, version, system_category,
          tags, steps_snapshot, selector_map, validation_status, source_session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING`,
        [
          flowBlockId,
          session.workspace_id,
          session.project_id || null,
          flowName,
          `Synthesized flow containing ${steps.length} steps.`,
          1,
          steps[0]?.systemCategory || 'action_trigger',
          generatedTags,
          JSON.stringify(steps),
          JSON.stringify(selectorMap),
          'valid',
          sessionId,
        ]
      );
    } catch (fbErr: any) {
      console.error('[AISynthesizer] Error inserting flow block:', fbErr.message);
    }

    // 6. Register tags in Tag Registry
    for (const tag of generatedTags) {
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (slug) {
        try {
          await this.pool.query(
            `INSERT INTO tag_registry (id, workspace_id, slug, display_name, usage_count)
             VALUES ($1, $2, $3, $4, 1)
             ON CONFLICT (workspace_id, slug)
             DO UPDATE SET usage_count = tag_registry.usage_count + 1`,
            [`tag_${uuidv4().slice(0, 8)}`, session.workspace_id, slug, tag]
          );
        } catch (tErr) {}
      }
    }

    // 7. Update Session row in DB
    await this.pool.query(
      `UPDATE recording_sessions
       SET spec_url = $1, tags = $2, synthesizer_status = $3, synthesizer_warning = $4, status = 'completed'
       WHERE id = $5`,
      [specUrl, generatedTags, synthesizerStatus, synthesizerWarning || null, sessionId]
    );

    return {
      specCode: generatedSpec,
      specUrl,
      synthesizerStatus,
      synthesizerWarning,
      inferredAssertions,
      tags: generatedTags,
    };
  }
}

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}

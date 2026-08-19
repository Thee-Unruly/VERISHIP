import { Worker, Job } from 'bullmq';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { realPreflight } from './preflight';
import { createLLMAdapter, LLMMessage } from './llm/llmAdapter';
import { trimContext } from './agent/contextManager';
import { ToolExecutor } from './agent/toolExecutor';
import { ArtifactWriter } from './storage/artifactWriter';
import { FailureTaxonomy } from '@universal-qa/shared';

import Redis from 'ioredis';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://qadevel:qapassword123@localhost:5432/qa_platform_v2',
});

// Initialize Redis pub/sub client for real-time dashboard events
const pubRedis = new Redis({
  host: connection.host,
  port: connection.port,
});

const llmAdapter = createLLMAdapter();
const MAX_STEPS = parseInt(process.env.MAX_STEPS || '15', 10);
const MAX_FULL_SNAPSHOTS = parseInt(process.env.MAX_FULL_SNAPSHOTS || '3', 10);

const worker = new Worker(
  'qa-agent-jobs',
  async (job: Job) => {
    const { jobId, runId, url, prompt } = job.data;
    console.log(`[Worker] Starting job ${jobId} (Run: ${runId}) for URL: ${url}`);

    const startTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let taxonomy: FailureTaxonomy = 'PASSED';
    let failureReason: string | undefined = undefined;
    let stepCount = 0;
    let isRecovered = false;

    const artifactWriter = new ArtifactWriter(runId);

    try {
      // 1. One job = disposable browser container/context. No cross-tenant sharing.
      const isHeadless = process.env.HEADLESS !== 'false';
      browser = await chromium.launch({ headless: isHeadless });
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: {
          dir: artifactWriter.getVideoDir(),
          size: { width: 1280, height: 800 },
        },
      });

      // Start tracing for Playwright trace file
      await context.tracing.start({ screenshots: true, snapshots: true });
      page = await context.newPage();

      // 2. Real Preflight Check (Section 6)
      console.log(`[Worker] Running preflight check on ${url}...`);
      const preflight = await realPreflight(page, url);

      if (!preflight.ok) {
        taxonomy = 'APP_DEFECT';
        failureReason = `Preflight failed (${preflight.category}): ${JSON.stringify(preflight.detail)}`;
        console.warn(`[Worker] Preflight failed for ${runId}: ${failureReason}`);
        return;
      }

      // 3. Agent Loop Execution
      const toolExecutor = new ToolExecutor(page);
      const systemPrompt = `You are an automated Web Agent QA Assistant.
Your goal is: "${prompt}"

You must execute the test step-by-step. At each step, analyze the accessible DOM state and choose one of the available tools to proceed.
Always respond in JSON format matching the schema:
{
  "thought": "Your step thought analysis explaining what you see and what you will do next",
  "toolCall": {
    "name": "one of the available tool names",
    "args": {
       // tool arguments matching the schema
    }
  }
}

AVAILABLE TOOLS:
1. "navigate_to": Navigate to a URL. Params: { "url": "string" }
2. "click_element": Click a button, link, or tab. Params: { "role": "string", "name": "string" }
3. "fill_input": Type text into an input. Params: { "label": "string", "value": "string" }
4. "select_dropdown": Choose an option. Params: { "label": "string", "option": "string" }
5. "assert_condition": Assert text exists on page. Params: { "assertion_type": "text_exists" | "body_exists", "expected_value": "string" }
6. "clear_session": Clear session cookies/storage to switch roles. Params: { "clear_cookies": boolean, "clear_storage": boolean }
7. "switch_persona": Switch user role context (e.g. employee, approver). Params: { "persona_name": "string" }
8. "finish_test": Complete test run. Params: { "summary": "string" }

Ensure the "name" property of "toolCall" matches exactly one of the tool names listed above. Do not output anything else besides valid JSON.`;

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Begin QA test run on target URL: ${url}. Initial goal: "${prompt}".`,
        },
      ];

      for (let step = 1; step <= MAX_STEPS; step++) {
        stepCount = step;
        console.log(`[Worker] Executing step ${step}/${MAX_STEPS} for run ${runId}`);

        // Capture step screenshot
        const screenshotUrl = await artifactWriter.captureStepScreenshot(page, step);

        // Fetch accessibility snapshot
        const ariaSnapshot = await page.locator('body').innerText().catch(() => 'DOM content unavailable');

        messages.push({
          role: 'user',
          content: `[Step ${step} Snapshot]\nAccessible DOM state:\n${ariaSnapshot.slice(0, 2000)}`,
          _type: 'snapshot',
          _step: step,
        });

        // Apply rolling context window trimming (Section 5)
        const prunedMessages = trimContext(messages, MAX_FULL_SNAPSHOTS);

        // Query LLM Adapter with fallback handling (Section 7)
        const llmResponse = await llmAdapter.complete(prunedMessages);
        console.log(`[Worker] LLM Thought: ${llmResponse.thought}`);

        if (!llmResponse.toolCall) {
          throw new Error('LLM did not return a valid toolCall structure');
        }

        const { name: toolName, args: toolArgs } = llmResponse.toolCall;

        // Execute tool call via contract executor (Section 4)
        const execResult = await toolExecutor.execute(toolName, toolArgs);
        if (execResult.recovered) {
          isRecovered = true;
        }

        // Record Step Log to Postgres
        const stepId = `step_${step}_${Date.now()}`;
        await pool.query(
          `INSERT INTO step_logs (id, run_id, step_number, action_taken, tool_call_name, tool_args, tool_result, screenshot_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            stepId,
            runId,
            step,
            llmResponse.thought,
            toolName,
            JSON.stringify(toolArgs),
            execResult.message,
            screenshotUrl,
          ]
        );

        // Publish real-time step update to Redis pub/sub for the API Gateway
        await pubRedis.publish('job_updates', JSON.stringify({
          event: 'step_update',
          jobId,
          step: {
            id: stepId,
            run_id: runId,
            step_number: step,
            action_taken: llmResponse.thought,
            tool_call_name: toolName,
            tool_args: toolArgs,
            tool_result: execResult.message,
            screenshot_url: screenshotUrl,
            created_at: new Date().toISOString()
          }
        })).catch(err => console.error('[Worker] Redis publish step_update error:', err));

        messages[messages.length - 1]._action_taken = `${toolName}(${JSON.stringify(toolArgs)})`;

        // Feed the assistant's decision and the tool execution outcome back to the dialog history
        messages.push({
          role: 'assistant',
          content: JSON.stringify({
            thought: llmResponse.thought,
            toolCall: llmResponse.toolCall
          })
        });

        messages.push({
          role: 'user',
          content: `[Tool Result] Tool '${toolName}' executed with status: ${execResult.success ? 'SUCCESS' : 'FAILED'}. Result details: ${execResult.message}`
        });

        if (toolName === 'finish_test') {
          console.log(`[Worker] QA Test finish_test triggered at step ${step}.`);
          break;
        }
      }

      if (isRecovered) {
        taxonomy = 'RECOVERED';
      }
    } catch (err: any) {
      taxonomy = 'INFRA_ERROR';
      failureReason = err?.message || 'Uncaught error in worker agent loop';
      console.error(`[Worker] Run ${runId} threw error:`, err);
    } finally {
      // 4. Guaranteed try/finally cleanup (Section 8)
      const durationMs = Date.now() - startTime;
      let traceUrl: string | undefined = undefined;
      let videoFile: string | null = null;

      if (page) {
        try {
          const video = page.video();
          if (video) {
            videoFile = await video.path().catch(() => null);
          }
        } catch (e) {}
      }

      if (context) {
        try {
          const tracePath = artifactWriter.getTracePath();
          await context.tracing.stop({ path: tracePath });
          traceUrl = artifactWriter.getTraceUrl();
        } catch (tracingErr) {
          console.error('[Worker] Error stopping trace:', tracingErr);
        }
      }

      if (browser) {
        await browser.close().catch(() => {});
      }

      let videoUrl: string | undefined = undefined;
      if (videoFile) {
        try {
          const fs = require('fs');
          const path = require('path');
          const targetPath = path.join(artifactWriter.getVideoDir(), 'video.webm');
          if (fs.existsSync(videoFile)) {
            fs.copyFileSync(videoFile, targetPath);
            videoUrl = `/artifacts/${runId}/video.webm`;
          }
        } catch (videoErr) {
          console.error('[Worker] Error copying video:', videoErr);
        }
      }

      // Generate copy-pasteable Playwright spec file from step history logs
      let specUrl: string | undefined = undefined;
      try {
        const stepsRes = await pool.query(
          `SELECT step_number as "stepNumber", action_taken as "actionTaken", tool_call_name as "toolCallName", tool_args as "toolArgs"
           FROM step_logs WHERE run_id = $1 ORDER BY step_number ASC`,
          [runId]
        );
        if (stepsRes.rows.length > 0) {
          specUrl = await artifactWriter.writeSpecFile(stepsRes.rows, url, prompt);
        }
      } catch (specErr) {
        console.error('[Worker] Error generating spec file:', specErr);
      }

      // Persist structured Run Memory for history / prompt memory retrieval
      try {
        const memoryRes = await pool.query(
          `SELECT step_number, tool_call_name, tool_args, tool_result FROM step_logs WHERE run_id = $1 ORDER BY step_number ASC`,
          [runId]
        );
        const passedAssertions: string[] = [];
        const failedAssertions: string[] = [];
        const selectorCache: Record<string, string> = {};
        const extractedData: Record<string, unknown> = {};

        for (const row of memoryRes.rows) {
          if (row.tool_call_name === 'assert_condition') {
            const expected = row.tool_args?.expected_value || '';
            if (row.tool_result.includes('Asserted condition') || row.tool_result.includes('Verified')) {
              passedAssertions.push(expected);
            } else {
              failedAssertions.push(expected);
            }
          }
          if (row.tool_call_name === 'click_element' || row.tool_call_name === 'fill_input' || row.tool_call_name === 'select_dropdown') {
            const key = `${row.tool_call_name}:${row.tool_args?.role || row.tool_args?.label || ''}`;
            selectorCache[key] = row.tool_result;
          }
        }

        const memoryId = `mem_${runId}`;
        await pool.query(
          `INSERT INTO run_memories (id, run_id, extracted_data, passed_assertions, failed_assertions, selector_cache, structured_summary)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            memoryId,
            runId,
            JSON.stringify(extractedData),
            JSON.stringify(passedAssertions),
            JSON.stringify(failedAssertions),
            JSON.stringify(selectorCache),
            `Run ${runId} completed with ${passedAssertions.length} assertions passed and ${failedAssertions.length} failed.`,
          ]
        );
      } catch (memErr) {
        console.error('[Worker] Error writing run memory:', memErr);
      }

      // Calculate Fitness Score (Percentage of successful steps vs total)
      const fitnessScore = taxonomy === 'PASSED' ? 100 : taxonomy === 'RECOVERED' ? 85 : taxonomy === 'APP_DEFECT' ? 30 : 0;

      // Update Run & Job in Postgres
      const finalStatus = taxonomy === 'PASSED' || taxonomy === 'RECOVERED' ? 'completed' : 'failed';

      await pool.query(
        `UPDATE runs SET status = $1, taxonomy = $2, fitness_score = $3, total_steps = $4, duration_ms = $5, trace_url = $6, video_url = $7, spec_url = $8, completed_at = CURRENT_TIMESTAMP WHERE id = $9`,
        [finalStatus, taxonomy, fitnessScore, stepCount, durationMs, traceUrl, videoUrl || null, specUrl || null, runId]
      );

      await pool.query(
        `UPDATE jobs SET status = $1, taxonomy = $2, failure_reason = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [finalStatus, taxonomy, failureReason || null, jobId]
      );

      // Publish real-time job completion update to Redis pub/sub for the API Gateway
      await pubRedis.publish('job_updates', JSON.stringify({
        event: 'job_completed',
        jobId
      })).catch(err => console.error('[Worker] Redis publish job_completed error:', err));

      console.log(`[Worker] Finished processing job ${jobId} with status ${finalStatus} (${taxonomy}) in ${durationMs}ms`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

console.log('[Worker Engine] BullMQ Worker started and waiting for QA jobs...');

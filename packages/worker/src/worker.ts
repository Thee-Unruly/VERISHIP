import { Worker, Job } from 'bullmq';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
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

pool.on('error', (err) => {
  console.error('[Worker DB Pool Error] Unexpected error on idle client:', err.message);
});

// Initialize Redis pub/sub client for real-time dashboard events
const pubRedis = new Redis({
  host: connection.host,
  port: connection.port,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 3000);
    return delay;
  },
});

pubRedis.on('error', (err) => {
  console.error('[Worker PubRedis Error]:', err.message);
});

const llmAdapter = createLLMAdapter();
const MAX_STEPS = parseInt(process.env.MAX_STEPS || '15', 10);
const MAX_FULL_SNAPSHOTS = parseInt(process.env.MAX_FULL_SNAPSHOTS || '3', 10);

const worker = new Worker(
  'qa-agent-jobs',
  async (job: Job) => {
    const { jobId, runId, url, prompt, projectId, testCaseId } = job.data;
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

      // 2. Real Preflight Check
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
5. "assert_condition": Assert visual presence or text. Params: { "assertion_type": "string", "expected_value": "string" }
6. "finish_test": Complete the test when goal is satisfied. Params: { "summary": "string" }`;

      const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }];

      for (let step = 1; step <= MAX_STEPS; step++) {
        stepCount = step;
        console.log(`[Worker] Executing step ${step}/${MAX_STEPS} for run ${runId}...`);

        // Capture ARIA Snapshot from accessible tree
        let snapshotText = '';
        try {
          snapshotText = await (page as any).accessibility?.snapshot({ interestingOnly: true })
            ? JSON.stringify(await (page as any).accessibility.snapshot({ interestingOnly: true }))
            : await page.evaluate(() => document.body.innerText.slice(0, 1000));
        } catch (e) {
          snapshotText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
        }

        messages.push({
          role: 'user',
          content: `[Current Page URL: ${page.url()}]\n[DOM Snapshot]:\n${snapshotText}`,
          _type: 'snapshot',
          _step: step,
        });

        // Apply rolling snapshot window to prevent unbounded context growth
        const trimmedMessages = trimContext(messages, MAX_FULL_SNAPSHOTS);

        // Call LLM through multi-provider adapter
        const llmResponse = await llmAdapter.complete(trimmedMessages);

        if (!llmResponse.toolCall) {
          console.warn(`[Worker] Step ${step}: LLM provided no tool call. Defaulting to finish.`);
          break;
        }

        const toolName = llmResponse.toolCall.name;
        const toolArgs = llmResponse.toolCall.args;
        const thought = llmResponse.thought;

        // Execute tool action with selector recovery & fallback
        const execResult = await toolExecutor.execute(toolName, toolArgs);

        if (execResult.recovered) {
          isRecovered = true;
        }

        // Capture Step Screenshot
        let stepScreenshotUrl: string | undefined = undefined;
        try {
          stepScreenshotUrl = await artifactWriter.captureStepScreenshot(page, step);
        } catch (screenshotErr) {
          console.error('[Worker] Error capturing step screenshot:', screenshotErr);
        }

        // Record Step in Postgres
        const stepId = `step_${runId}_${step}`;
        await pool.query(
          `INSERT INTO step_logs (id, run_id, step_number, action_taken, tool_call_name, tool_args, tool_result, screenshot_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            stepId,
            runId,
            step,
            thought,
            toolName,
            JSON.stringify(toolArgs),
            execResult.message,
            stepScreenshotUrl || null,
          ]
        );

        // Publish live SSE step update via Redis pub/sub
        await pubRedis.publish('job_updates', JSON.stringify({
          event: 'step_update',
          jobId,
          runId,
          stepNumber: step,
          thought,
          toolName,
          toolArgs,
          toolResult: execResult.message,
          screenshotUrl: stepScreenshotUrl,
          success: execResult.success,
        })).catch(err => console.error('[Worker] Redis publish error:', err));

        if (!execResult.success && !execResult.recovered) {
          taxonomy = 'APP_DEFECT';
          failureReason = `Action '${toolName}' failed at step ${step}: ${execResult.message}`;
          console.warn(`[Worker] App defect detected: ${failureReason}`);
          break;
        }

        messages.push({
          role: 'assistant',
          content: JSON.stringify(llmResponse),
          _type: 'step',
          _step: step,
          _action_taken: thought,
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
      taxonomy = 'APP_DEFECT';
      failureReason = err?.message || 'Verification or interaction step failed during test execution';
      console.error(`[Worker] Step error during run ${runId}:`, err?.message || err);
    } finally {
      // 4. Guaranteed try/finally cleanup
      const durationMs = Date.now() - startTime;
      let traceUrl: string | undefined = undefined;
      let videoUrl: string | undefined = undefined;

      let videoRef: any = null;
      if (page) {
        try {
          videoRef = page.video();
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

      // Close page and context first so Playwright finalizes writing the WebM video
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }

      if (videoRef) {
        try {
          const videoFile = await videoRef.path().catch(() => null);
          if (videoFile) {
            const fs = require('fs');
            const path = require('path');
            const targetPath = path.join(artifactWriter.getVideoDir(), 'video.webm');
            if (fs.existsSync(videoFile) && videoFile !== targetPath) {
              fs.copyFileSync(videoFile, targetPath);
            }
            videoUrl = `/artifacts/${runId}/video.webm`;
          }
        } catch (videoErr) {
          console.error('[Worker] Error saving video:', videoErr);
        }
      }

      // Fallback: search artifact directory for any generated .webm file
      if (!videoUrl) {
        try {
          const fs = require('fs');
          const path = require('path');
          const videoDir = artifactWriter.getVideoDir();
          if (fs.existsSync(videoDir)) {
            const files = fs.readdirSync(videoDir);
            const webm = files.find((f: string) => f.endsWith('.webm'));
            if (webm) {
              const fullWebmPath = path.join(videoDir, webm);
              const targetPath = path.join(videoDir, 'video.webm');
              if (fullWebmPath !== targetPath) {
                fs.copyFileSync(fullWebmPath, targetPath);
              }
              videoUrl = `/artifacts/${runId}/video.webm`;
            }
          }
        } catch (e) {}
      }

      if (browser) {
        await browser.close().catch(() => {});
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

      // Persist structured Run Memory
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

      // Calculate Fitness Score
      const fitnessScore = taxonomy === 'PASSED' ? 100 : taxonomy === 'RECOVERED' ? 85 : taxonomy === 'APP_DEFECT' ? 30 : 0;
      const finalStatus = taxonomy === 'PASSED' || taxonomy === 'RECOVERED' ? 'completed' : 'failed';

      // Update Run & Job in Postgres
      await pool.query(
        `UPDATE runs SET status = $1, taxonomy = $2, fitness_score = $3, total_steps = $4, duration_ms = $5, trace_url = $6, video_url = $7, spec_url = $8, completed_at = CURRENT_TIMESTAMP WHERE id = $9`,
        [finalStatus, taxonomy, fitnessScore, stepCount, durationMs, traceUrl, videoUrl || null, specUrl || null, runId]
      );

      await pool.query(
        `UPDATE jobs SET status = $1, taxonomy = $2, failure_reason = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [finalStatus, taxonomy, failureReason || null, jobId]
      );

      // 5. Test Case & Defect Synchronization
      let resolvedProjectId = projectId;
      let testCaseTitle = '';
      let requirementId: string | null = null;
      let testPriority = 1;

      if (testCaseId) {
        try {
          const tcRes = await pool.query(`SELECT * FROM test_cases WHERE id = $1`, [testCaseId]);
          if (tcRes.rows.length > 0) {
            const tc = tcRes.rows[0];
            resolvedProjectId = resolvedProjectId || tc.project_id;
            requirementId = tc.requirement_id || null;
            testCaseTitle = tc.title || '';
            testPriority = tc.priority || 1;
          }

          const tcStatus = (finalStatus === 'completed' || taxonomy === 'PASSED') ? 'pass' : 'fail';
          await pool.query(
            `UPDATE test_cases SET status = $1, last_run_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [tcStatus, runId, testCaseId]
          );
        } catch (tcErr) {
          console.error('[Worker] Error updating test case status:', tcErr);
        }
      }

      // Auto-create Defect if test run failed (taxonomy !== 'PASSED' or finalStatus === 'failed')
      if ((finalStatus === 'failed' || taxonomy !== 'PASSED') && resolvedProjectId) {
        try {
          const defectId = `def_${crypto.randomUUID().slice(0, 8)}`;
          const defectTitle = testCaseTitle 
            ? `[Automated QA Failure] ${testCaseTitle}` 
            : `Autonomous Verification Failed: ${prompt.slice(0, 80)}`;
          
          const reasonText = failureReason || 'Visual assertion or element interaction failed during Playwright autonomous execution.';
          const rootCause = `Taxonomy: ${taxonomy}.\n${reasonText}`;
          const suggestedFix = `Review target page selectors on ${url}, check network responses, and ensure application DOM state satisfies test preconditions.`;

          // Grab the latest screenshot from step_logs if any
          let lastScreenshot: string | null = null;
          let stepsReproduction: any[] = [];
          try {
            const screenRes = await pool.query(
              `SELECT screenshot_url FROM step_logs WHERE run_id = $1 AND screenshot_url IS NOT NULL ORDER BY step_number DESC LIMIT 1`,
              [runId]
            );
            if (screenRes.rows.length > 0) {
              lastScreenshot = screenRes.rows[0].screenshot_url;
            }

            const stepsRes = await pool.query(
              `SELECT step_number as "step", action_taken as "action", tool_call_name as "tool", tool_result as "result"
               FROM step_logs WHERE run_id = $1 ORDER BY step_number ASC`,
              [runId]
            );
            stepsReproduction = stepsRes.rows;
          } catch (logFetchErr) {}

          let severity = 'HIGH';
          if (testPriority >= 3) severity = 'CRITICAL';
          else if (testPriority === 2) severity = 'HIGH';
          else if (testPriority === 1) severity = 'MEDIUM';
          else severity = 'LOW';

          await pool.query(
            `INSERT INTO defects (
              id, project_id, run_id, test_case_id, title, description,
              severity, status, root_cause_analysis, suggested_fix,
              reproduction_steps, screenshot_url, trace_url
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9, $10, $11, $12)`,
            [
              defectId,
              resolvedProjectId,
              runId,
              testCaseId || null,
              defectTitle,
              `Autonomous Playwright test failed at URL: ${url}.\n\nFailure Details:\n${reasonText}\n\nExecution Prompt:\n${prompt}`,
              severity,
              rootCause,
              suggestedFix,
              JSON.stringify(stepsReproduction),
              lastScreenshot,
              traceUrl || null,
            ]
          );
          console.log(`[Worker] Auto-logged defect ${defectId} (Severity: ${severity}) for project ${resolvedProjectId} linked to test case ${testCaseId}.`);
        } catch (defectErr) {
          console.error('[Worker] Error auto-logging defect:', defectErr);
        }
      }

      // Update Project Health & Coverage
      if (resolvedProjectId) {
        await pool.query(
          `UPDATE projects
           SET quality_coverage = (
             SELECT COALESCE(ROUND((COUNT(CASE WHEN tc.status = 'pass' THEN 1 END)::numeric / NULLIF(COUNT(tc.id), 0)) * 100, 1), 0)
             FROM test_cases tc WHERE tc.project_id = $1
           ),
           updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [resolvedProjectId]
        );
      }

      // Publish real-time job completion update to Redis pub/sub for the API Gateway
      await pubRedis.publish('job_updates', JSON.stringify({
        event: 'job_completed',
        jobId,
        runId,
        finalStatus,
        taxonomy,
        fitnessScore,
      })).catch(err => console.error('[Worker] Redis publish job_completed error:', err));

      console.log(`[Worker] Finished processing job ${jobId} with status ${finalStatus} (${taxonomy}) in ${durationMs}ms`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

import { SessionCapturer } from './recorder/sessionCapturer';
import { AISynthesizer } from './recorder/aiSynthesizer';

// Active in-memory interactive recording sessions
const activeCapturers = new Map<string, SessionCapturer>();

// Redis subscriber for Interactive Screen Recording Studio
const subRedis = new Redis({
  host: connection.host,
  port: connection.port,
  maxRetriesPerRequest: null,
});

subRedis.subscribe('recording_events').then(() => {
  console.log('[Worker Engine] Subscribed to recording_events channel.');
}).catch((err) => {
  console.error('[Worker Engine] Failed to subscribe to recording_events:', err.message);
});

subRedis.on('message', async (channel, message) => {
  if (channel !== 'recording_events') return;

  try {
    const payload = JSON.parse(message);

    // 1. Spin up browser and start recording
    if (payload.event === 'start_session_capturer') {
      const { sessionId, targetUrl, workspaceId, projectId, authMode } = payload;
      console.log(`[Worker Engine] Spawning interactive browser capturer for session: ${sessionId} -> ${targetUrl}`);

      const capturer = new SessionCapturer({
        sessionId,
        targetUrl,
        workspaceId,
        projectId,
        authMode,
        pool,
        pubRedis,
      });

      activeCapturers.set(sessionId, capturer);

      try {
        await capturer.start();
        console.log(`[Worker Engine] Interactive browser launched & capturing for session ${sessionId}`);
      } catch (startErr: any) {
        console.error(`[Worker Engine] Error launching browser capturer:`, startErr.message);
        await capturer.abort(`Failed to launch browser: ${startErr.message}`);
        activeCapturers.delete(sessionId);
      }
    }

    // 2. Stop browser recording & synthesize Playwright test
    if (payload.event === 'stop_session_capturer') {
      const { sessionId } = payload;
      console.log(`[Worker Engine] Stopping browser capturer & synthesizing test for session: ${sessionId}`);

      const capturer = activeCapturers.get(sessionId);
      if (capturer) {
        try {
          await capturer.stop();
          activeCapturers.delete(sessionId);
        } catch (stopErr: any) {
          console.error(`[Worker Engine] Error stopping capturer:`, stopErr.message);
        }
      }

      // Run AI Test Synthesizer
      try {
        const synthesizer = new AISynthesizer(pool);
        const result = await synthesizer.synthesize(sessionId);

        // Notify dashboard of completion
        await pubRedis.publish(
          'recording_events',
          JSON.stringify({
            event: 'recording_synthesized',
            sessionId,
            specCode: result.specCode,
            specUrl: result.specUrl,
            status: result.synthesizerStatus,
            warning: result.synthesizerWarning,
            tags: result.tags,
            inferredAssertions: result.inferredAssertions,
          })
        );
      } catch (synthErr: any) {
        console.error(`[Worker Engine] Error during AI test synthesis:`, synthErr.message);
      }
    }
  } catch (err: any) {
    console.error('[Worker Engine] Error parsing recording_events message:', err.message);
  }
});

console.log('[VeriShip Worker Engine] BullMQ Worker & Interactive Screen Capturer started and waiting for QA jobs...');

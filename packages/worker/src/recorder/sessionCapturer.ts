import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Pool } from 'pg';
import { RedactionEngine } from './redactionEngine';
import { RawRecordedEvent, EventFilter } from './eventFilter';
import { ArtifactWriter } from '../storage/artifactWriter';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

export interface SessionCapturerOptions {
  sessionId: string;
  targetUrl: string;
  workspaceId: string;
  projectId?: string;
  authMode?: 'standard' | 'clean' | 'incognito';
  pool: Pool;
  pubRedis: Redis;
}

export class SessionCapturer {
  private sessionId: string;
  private targetUrl: string;
  private workspaceId: string;
  private projectId?: string;
  private pool: Pool;
  private pubRedis: Redis;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private redactionEngine: RedactionEngine;
  private artifactWriter: ArtifactWriter;
  private rawEvents: RawRecordedEvent[] = [];
  private stepNumber = 1;
  private isRecording = false;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private readonly WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

  constructor(options: SessionCapturerOptions) {
    this.sessionId = options.sessionId;
    this.targetUrl = options.targetUrl;
    this.workspaceId = options.workspaceId;
    this.projectId = options.projectId;
    this.pool = options.pool;
    this.pubRedis = options.pubRedis;
    this.redactionEngine = new RedactionEngine();
    this.artifactWriter = new ArtifactWriter(this.sessionId);
  }

  public async start(): Promise<void> {
    console.log(`[SessionCapturer] Starting interactive capture for session ${this.sessionId} at ${this.targetUrl}`);
    this.isRecording = true;

    // Launch Chromium browser instance
    const isHeadless = process.env.HEADLESS !== 'false';
    this.browser = await chromium.launch({
      headless: isHeadless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const videoDir = this.artifactWriter.getVideoDir();
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      recordVideo: {
        dir: videoDir,
        size: { width: 1280, height: 800 },
      },
    });

    // Start tracing
    await this.context.tracing.start({ screenshots: true, snapshots: true });

    this.page = await this.context.newPage();

    // Expose Node event binding to the browser context
    await this.page.exposeFunction('__veriship_record_event', async (rawEventPayload: string) => {
      try {
        const eventData = JSON.parse(rawEventPayload);
        await this.handleBrowserEvent(eventData);
      } catch (err: any) {
        console.error(`[SessionCapturer] Error processing DOM event:`, err.message);
      }
    });

    // Injected client probe script for DOM event capture & MutationObserver
    await this.page.addInitScript(() => {
      const getAccessibleInfo = (el: HTMLElement) => {
        const role = el.getAttribute('role') || el.tagName.toLowerCase();
        const accessibleName =
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.innerText?.slice(0, 100) ||
          el.getAttribute('title') ||
          '';
        const label =
          el.getAttribute('aria-label') ||
          (el as any).labels?.[0]?.innerText ||
          el.closest('label')?.innerText ||
          '';
        const placeholder = el.getAttribute('placeholder') || '';
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || '';

        return { role, accessibleName: accessibleName.trim(), label: label.trim(), placeholder, testId };
      };

      // Listen to click events
      document.addEventListener(
        'click',
        (e) => {
          const target = e.target as HTMLElement;
          if (!target) return;
          const info = getAccessibleInfo(target);
          const isModal = Boolean(target.closest('[role="dialog"], dialog, .modal, .modal-backdrop'));

          (window as any).__veriship_record_event(
            JSON.stringify({
              actionType: 'click',
              tagName: target.tagName.toLowerCase(),
              role: info.role,
              accessibleName: info.accessibleName,
              label: info.label,
              placeholder: info.placeholder,
              testId: info.testId,
              id: target.id || undefined,
              text: target.innerText?.slice(0, 80) || undefined,
              pageUrl: window.location.href,
              pageTitle: document.title,
              isModal,
              timestamp: Date.now(),
            })
          );
        },
        true
      );

      // Listen to input and change events
      document.addEventListener(
        'input',
        (e) => {
          const target = e.target as HTMLInputElement;
          if (!target) return;
          const info = getAccessibleInfo(target);

          (window as any).__veriship_record_event(
            JSON.stringify({
              actionType: 'fill',
              tagName: target.tagName.toLowerCase(),
              inputType: target.type || 'text',
              autocomplete: target.autocomplete || '',
              role: info.role,
              accessibleName: info.accessibleName,
              label: info.label,
              placeholder: info.placeholder,
              testId: info.testId,
              id: target.id || undefined,
              value: target.value || '',
              pageUrl: window.location.href,
              pageTitle: document.title,
              timestamp: Date.now(),
            })
          );
        },
        true
      );

      // MutationObserver to detect dynamic Toasts and Alerts
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of Array.from(m.addedNodes)) {
            if (node.nodeType === 1) {
              const el = node as HTMLElement;
              const isAlert =
                el.getAttribute('role') === 'alert' ||
                el.getAttribute('role') === 'status' ||
                el.classList.contains('toast') ||
                el.classList.contains('sonner-toast') ||
                el.classList.contains('ant-message-notice');

              if (isAlert && el.innerText?.trim()) {
                (window as any).__veriship_record_event(
                  JSON.stringify({
                    actionType: 'assert',
                    tagName: el.tagName.toLowerCase(),
                    role: el.getAttribute('role') || 'status',
                    accessibleName: el.innerText.trim().slice(0, 120),
                    text: el.innerText.trim(),
                    pageUrl: window.location.href,
                    pageTitle: document.title,
                    isToast: true,
                    isAssertion: true,
                    assertionRule: {
                      type: 'visible',
                      expected: el.innerText.trim(),
                      confidence: 0.95,
                    },
                    timestamp: Date.now(),
                  })
                );
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Start watchdog timer
    this.resetWatchdog();

    // Navigate to initial target URL
    await this.page.goto(this.targetUrl, { waitUntil: 'domcontentloaded' });
  }

  public resetWatchdog(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(async () => {
      console.warn(`[SessionCapturer] Watchdog timeout triggered for session ${this.sessionId}. Auto-reclaiming.`);
      await this.abort('Watchdog timeout: Abandoned session (no activity for 5 minutes)');
    }, this.WATCHDOG_TIMEOUT_MS);
  }

  private async handleBrowserEvent(rawEvent: RawRecordedEvent): Promise<void> {
    if (!this.isRecording) return;
    this.resetWatchdog();

    // Apply PII & Credential Redaction
    const redaction = this.redactionEngine.checkAndRedact(
      rawEvent.accessibleName || rawEvent.label || rawEvent.id || '',
      rawEvent.inputType || 'text',
      rawEvent.autocomplete || '',
      rawEvent.value || ''
    );

    const isSensitive = redaction.isSensitive;
    const finalValue = isSensitive ? redaction.value : rawEvent.value;

    const eventWithRedaction = { ...rawEvent, value: finalValue };
    this.rawEvents.push(eventWithRedaction);

    // Normalize and extract discrete step info
    const locatorInfo = EventFilter.buildPlaywrightLocator(rawEvent);
    const systemCategory = EventFilter.inferSystemCategory(rawEvent);
    const stepId = `step_${uuidv4().replace(/-/g, '')}`;

    // Capture milestone screenshot with sensitive inputs masked
    let screenshotUrl: string | undefined = undefined;
    if (this.page && (rawEvent.actionType === 'click' || rawEvent.isToast || rawEvent.isAssertion)) {
      try {
        const screenshotFilename = `step_${this.stepNumber}.png`;
        const screenshotPath = path.join(this.artifactWriter.getVideoDir(), screenshotFilename);
        await this.page.screenshot({
          path: screenshotPath,
          mask: this.redactionEngine
            .getScreenshotMaskSelectors()
            .map((sel) => this.page!.locator(sel)),
        });
        screenshotUrl = `/artifacts/${this.sessionId}/${screenshotFilename}`;
      } catch (e) {}
    }

    // Persist step log to database
    try {
      await this.pool.query(
        `INSERT INTO recorded_steps (
          id, session_id, step_number, action_type, target_selector, selector_type,
          input_value, is_sensitive, page_url, page_title, screenshot_url, system_category,
          is_assertion, assertion_rule
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          stepId,
          this.sessionId,
          this.stepNumber,
          rawEvent.actionType,
          locatorInfo.locator,
          locatorInfo.type,
          finalValue || null,
          isSensitive,
          rawEvent.pageUrl,
          rawEvent.pageTitle || '',
          screenshotUrl || null,
          systemCategory,
          rawEvent.isAssertion || false,
          rawEvent.assertionRule ? JSON.stringify(rawEvent.assertionRule) : null,
        ]
      );

      // Increment step count on session
      await this.pool.query(
        `UPDATE recording_sessions SET step_count = $1, last_heartbeat = CURRENT_TIMESTAMP WHERE id = $2`,
        [this.stepNumber, this.sessionId]
      );

      // Publish live event to Redis pubsub for dashboard SSE stream
      await this.pubRedis.publish(
        'recording_events',
        JSON.stringify({
          event: 'recording_step_captured',
          sessionId: this.sessionId,
          step: {
            id: stepId,
            stepNumber: this.stepNumber,
            actionType: rawEvent.actionType,
            targetSelector: locatorInfo.locator,
            selectorType: locatorInfo.type,
            inputValue: finalValue,
            isSensitive,
            pageUrl: rawEvent.pageUrl,
            pageTitle: rawEvent.pageTitle,
            screenshotUrl,
            systemCategory,
            isAssertion: rawEvent.isAssertion || false,
            assertionRule: rawEvent.assertionRule,
          },
        })
      );

      this.stepNumber++;
    } catch (err: any) {
      console.error(`[SessionCapturer] Error writing recorded step:`, err.message);
    }
  }

  public async stop(): Promise<{ rawEventsUrl: string; videoUrl?: string; traceUrl?: string }> {
    console.log(`[SessionCapturer] Stopping session ${this.sessionId}...`);
    this.isRecording = false;
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);

    let traceUrl: string | undefined = undefined;
    let videoUrl: string | undefined = undefined;

    // Finalize tracing
    if (this.context) {
      try {
        const tracePath = this.artifactWriter.getTracePath();
        await this.context.tracing.stop({ path: tracePath });
        traceUrl = this.artifactWriter.getTraceUrl();
      } catch (e) {}
    }

    // Close page & context
    if (this.page) await this.page.close().catch(() => {});
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});

    // Save Raw Events JSON to Artifact Directory
    const rawEventsDir = this.artifactWriter.getVideoDir();
    const rawEventsFilePath = path.join(rawEventsDir, 'raw_events.json');
    fs.writeFileSync(rawEventsFilePath, JSON.stringify(this.rawEvents, null, 2), 'utf-8');
    const rawEventsUrl = `/artifacts/${this.sessionId}/raw_events.json`;

    // Look for video
    const videoFiles = fs.readdirSync(rawEventsDir).filter((f) => f.endsWith('.webm'));
    if (videoFiles.length > 0) {
      videoUrl = `/artifacts/${this.sessionId}/${videoFiles[0]}`;
    }

    // Update session record in DB
    await this.pool.query(
      `UPDATE recording_sessions SET status = 'processing', raw_events_url = $1, trace_url = $2, video_url = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [rawEventsUrl, traceUrl || null, videoUrl || null, this.sessionId]
    );

    return { rawEventsUrl, videoUrl, traceUrl };
  }

  public async abort(reason: string): Promise<void> {
    this.isRecording = false;
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    if (this.page) await this.page.close().catch(() => {});
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});

    await this.pool.query(
      `UPDATE recording_sessions SET status = 'abandoned', synthesizer_status = 'failed', synthesizer_warning = $1 WHERE id = $2`,
      [reason, this.sessionId]
    );
  }
}

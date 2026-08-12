import { Page } from 'playwright';
import { PreflightResult } from '@universal-qa/shared';

export async function realPreflight(page: Page, url: string): Promise<PreflightResult> {
  const consoleErrors: string[] = [];

  // Register listener for uncaught browser JS/Console errors before loading
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`Page Unhandled Error: ${err.message}`);
  });

  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    if (!response || response.status() >= 400) {
      return {
        ok: false,
        category: 'TARGET_UNREACHABLE',
        detail: `HTTP response status ${response ? response.status() : 'No response'}`,
      };
    }

    if (consoleErrors.length > 0) {
      console.warn('[Preflight] Warning: Non-fatal console errors detected on page load:', consoleErrors);
    }

    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (bodyText.trim().length < 20) {
      return {
        ok: false,
        category: 'APP_RENDER_ERROR',
        detail: 'Page rendered an empty or near-empty body element',
      };
    }

    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      category: 'TARGET_UNREACHABLE',
      detail: `Preflight navigation error: ${err?.message || 'Timeout/Network error'}`,
    };
  }
}

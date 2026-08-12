import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';

export class ArtifactWriter {
  private runId: string;
  private localDir: string;

  constructor(runId: string) {
    this.runId = runId;
    this.localDir = path.join(process.cwd(), 'artifacts', runId);
    if (!fs.existsSync(this.localDir)) {
      fs.mkdirSync(this.localDir, { recursive: true });
    }
  }

  async captureStepScreenshot(page: Page, stepNumber: number): Promise<string> {
    const filename = `step_${stepNumber}_${Date.now()}.png`;
    const filepath = path.join(this.localDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    return `/artifacts/${this.runId}/${filename}`;
  }

  getTracePath(): string {
    return path.join(this.localDir, 'trace.zip');
  }

  getTraceUrl(): string {
    return `/artifacts/${this.runId}/trace.zip`;
  }

  getVideoDir(): string {
    return this.localDir;
  }

  async saveVideo(page: Page): Promise<string | undefined> {
    try {
      const video = page.video();
      if (!video) return undefined;
      const originalPath = await video.path();
      const targetPath = path.join(this.localDir, 'video.webm');
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, targetPath);
        return `/artifacts/${this.runId}/video.webm`;
      }
    } catch (err) {
      console.error('[ArtifactWriter] Error saving video file:', err);
    }
    return undefined;
  }

  async writeSpecFile(steps: any[], targetUrl: string, prompt: string): Promise<string> {
    let specCode = `import { test, expect } from '@playwright/test';\n\n`;
    specCode += `test('Autonomous Verification: ${prompt.replace(/'/g, "\\'")}', async ({ page }) => {\n`;
    specCode += `  // Target App URL: ${targetUrl}\n`;
    
    for (const step of steps) {
      specCode += `\n  // Step ${step.stepNumber}: ${step.actionTaken}\n`;
      const args = step.toolArgs;
      
      switch (step.toolCallName) {
        case 'navigate_to':
          specCode += `  await page.goto('${args.url}', { waitUntil: 'networkidle' });\n`;
          break;
        case 'click_element':
          specCode += `  await page.getByRole('${args.role}', { name: '${args.name}', exact: false }).click().catch(async () => {\n`;
          specCode += `    await page.getByText('${args.name}', { exact: false }).click();\n`;
          specCode += `  });\n`;
          break;
        case 'fill_input':
          specCode += `  await page.getByLabel('${args.label}', { exact: false }).fill('${args.value}').catch(async () => {\n`;
          specCode += `    await page.getByPlaceholder('${args.label}', { exact: false }).fill('${args.value}');\n`;
          specCode += `  });\n`;
          break;
        case 'select_dropdown':
          specCode += `  try {\n`;
          specCode += `    const locator = page.getByLabel('${args.label}', { exact: false });\n`;
          specCode += `    const tagName = await locator.evaluate(el => el.tagName);\n`;
          specCode += `    if (tagName === 'SELECT') {\n`;
          specCode += `      await locator.selectOption({ label: '${args.option}' });\n`;
          specCode += `    } else {\n`;
          specCode += `      await locator.click();\n`;
          specCode += `      await page.getByRole('option', { name: '${args.option}' }).click();\n`;
          specCode += `    }\n`;
          specCode += `  } catch (err) {\n`;
          specCode += `    await page.getByLabel('${args.label}', { exact: false }).click().catch(() => {});\n`;
          specCode += `    await page.getByRole('option', { name: '${args.option}' }).click();\n`;
          specCode += `  }\n`;
          break;
        case 'assert_condition':
          if (args.assertion_type === 'body_exists') {
            specCode += `  await expect(page.locator('body')).toBeVisible();\n`;
          } else {
            specCode += `  await expect(page.getByText('${args.expected_value}', { exact: false })).toBeVisible();\n`;
          }
          break;
        case 'finish_test':
          specCode += `  // Completed: ${args.summary}\n`;
          break;
      }
    }
    
    specCode += `});\n`;
    
    const filepath = path.join(this.localDir, 'test.spec.ts');
    fs.writeFileSync(filepath, specCode);
    return `/artifacts/${this.runId}/test.spec.ts`;
  }
}

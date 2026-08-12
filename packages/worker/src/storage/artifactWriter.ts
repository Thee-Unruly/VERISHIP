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
}

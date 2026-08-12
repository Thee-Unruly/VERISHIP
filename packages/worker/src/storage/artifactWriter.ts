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
}

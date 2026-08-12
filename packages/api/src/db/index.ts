import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://qadevel:qapassword123@localhost:5432/qa_platform_v2';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
        url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'interactive',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        taxonomy VARCHAR(30),
        failure_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS runs (
        id VARCHAR(64) PRIMARY KEY,
        job_id VARCHAR(64) REFERENCES jobs(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        taxonomy VARCHAR(30),
        fitness_score NUMERIC(5, 2),
        total_steps INT DEFAULT 0,
        duration_ms INT,
        trace_url TEXT,
        video_url TEXT,
        spec_url TEXT,
        screenshot_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );

      ALTER TABLE runs ADD COLUMN IF NOT EXISTS video_url TEXT;
      ALTER TABLE runs ADD COLUMN IF NOT EXISTS spec_url TEXT;

      CREATE TABLE IF NOT EXISTS step_logs (
        id VARCHAR(64) PRIMARY KEY,
        run_id VARCHAR(64) REFERENCES runs(id) ON DELETE CASCADE,
        step_number INT NOT NULL,
        action_taken TEXT NOT NULL,
        tool_call_name VARCHAR(50) NOT NULL,
        tool_args JSONB NOT NULL,
        tool_result TEXT NOT NULL,
        screenshot_url TEXT,
        summarized BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] Database tables initialized successfully.');
  } finally {
    client.release();
  }
}

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://qadevel:qapassword123@localhost:5432/qa_platform_v2';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error] Unexpected error on idle PostgreSQL client:', err.message);
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initDb(maxRetries = 10, retryDelayMs = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    let client;
    try {
      console.log(`[DB] Connecting to PostgreSQL (attempt ${attempt}/${maxRetries})...`);
      client = await pool.connect();
      await client.query(`
      -- Users & Authentication
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS user_project_assignment (
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        PRIMARY KEY (user_id, project_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(64) PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Core Projects & Workspaces
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'on-track',
        health_score NUMERIC(5, 2) DEFAULT 100.0,
        quality_coverage NUMERIC(5, 2) DEFAULT 0.0,
        target_release_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Requirements QA & Clarity Analysis
      CREATE TABLE IF NOT EXISTS requirements (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        clarity_score NUMERIC(5, 2),
        testability_score NUMERIC(5, 2),
        ambiguities JSONB DEFAULT '[]'::jsonb,
        missing_criteria JSONB DEFAULT '[]'::jsonb,
        suggested_acceptance_criteria JSONB DEFAULT '[]'::jsonb,
        clarity_history JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acceptance_criteria (
        id VARCHAR(64) PRIMARY KEY,
        requirement_id VARCHAR(64) REFERENCES requirements(id) ON DELETE CASCADE,
        criteria TEXT NOT NULL,
        is_covered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Test Suites & Test Cases
      CREATE TABLE IF NOT EXISTS test_suites (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_cases (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        requirement_id VARCHAR(64) REFERENCES requirements(id) ON DELETE SET NULL,
        suite_id VARCHAR(64) REFERENCES test_suites(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        test_type VARCHAR(50) NOT NULL DEFAULT 'autonomous-agent',
        status VARCHAR(50) NOT NULL DEFAULT 'ready',
        priority INT DEFAULT 1,
        is_automated BOOLEAN DEFAULT FALSE,
        target_url TEXT,
        prompt TEXT,
        steps JSONB DEFAULT '[]'::jsonb,
        last_run_id VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Jobs & Autonomous Runs
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE SET NULL,
        test_case_id VARCHAR(64) REFERENCES test_cases(id) ON DELETE SET NULL,
        url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'interactive',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        taxonomy VARCHAR(30),
        failure_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS project_id VARCHAR(64);
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS test_case_id VARCHAR(64);

      CREATE TABLE IF NOT EXISTS runs (
        id VARCHAR(64) PRIMARY KEY,
        job_id VARCHAR(64) REFERENCES jobs(id) ON DELETE CASCADE,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE SET NULL,
        test_case_id VARCHAR(64) REFERENCES test_cases(id) ON DELETE SET NULL,
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

      ALTER TABLE runs ADD COLUMN IF NOT EXISTS project_id VARCHAR(64);
      ALTER TABLE runs ADD COLUMN IF NOT EXISTS test_case_id VARCHAR(64);
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

      -- Defect Intelligence & Bug Tracking
      CREATE TABLE IF NOT EXISTS defects (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        run_id VARCHAR(64) REFERENCES runs(id) ON DELETE SET NULL,
        test_case_id VARCHAR(64) REFERENCES test_cases(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        severity VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        root_cause_analysis TEXT,
        suggested_fix TEXT,
        reproduction_steps JSONB DEFAULT '[]'::jsonb,
        screenshot_url TEXT,
        trace_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Release Governance & Release Gate
      CREATE TABLE IF NOT EXISTS releases (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        version VARCHAR(100) NOT NULL,
        name VARCHAR(255),
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'planning',
        readiness_score NUMERIC(5, 2) DEFAULT 0.0,
        recommendation VARCHAR(50) DEFAULT 'NO-GO',
        target_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS release_approvals (
        id VARCHAR(64) PRIMARY KEY,
        release_id VARCHAR(64) REFERENCES releases(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        approver_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        comments TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Service Accounts for n8n & External AI Agents
      CREATE TABLE IF NOT EXISTS service_accounts (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        role VARCHAR(50) NOT NULL DEFAULT 'agent',
        token VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE
      );

      -- Quality Insights & AI Suggestions
      CREATE TABLE IF NOT EXISTS qa_insights (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        score_impact NUMERIC(5, 2) DEFAULT 0.0,
        actionable_recommendation TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_templates (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
        name VARCHAR(255) NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        stages JSONB,
        tags TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Load & Performance Testing Jobs
      CREATE TABLE IF NOT EXISTS load_test_jobs (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE SET NULL,
        base_url TEXT NOT NULL,
        users INT NOT NULL DEFAULT 100,
        spawn_rate INT NOT NULL DEFAULT 10,
        run_time VARCHAR(20) NOT NULL DEFAULT '1m',
        endpoints JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        logs JSONB DEFAULT '[]'::jsonb,
        summary JSONB DEFAULT '{}'::jsonb,
        report_path TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS run_memories (
        id VARCHAR(64) PRIMARY KEY,
        run_id VARCHAR(64) REFERENCES runs(id) ON DELETE CASCADE,
        extracted_data JSONB,
        passed_assertions JSONB,
        failed_assertions JSONB,
        selector_cache JSONB,
        structured_summary TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS personas (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        username VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
      console.log('[DB] Unified VeriShip Quality Governance database schema initialized.');
      return;
    } catch (err: any) {
      console.warn(`[DB] Connection attempt ${attempt}/${maxRetries} failed: ${err?.message || err}`);
      if (attempt >= maxRetries) {
        throw new Error(`[DB] Could not establish connection to PostgreSQL after ${maxRetries} attempts: ${err?.message || err}`);
      }
      await sleep(retryDelayMs);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

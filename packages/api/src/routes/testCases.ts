import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';
import { CreateTestCaseInput } from '@universal-qa/shared';
import { AIService } from '../services/aiService';

export async function testCaseRoutes(fastify: FastifyInstance) {
  // List test cases for a project or requirement
  fastify.get('/api/test-cases', async (request, reply) => {
    const { projectId, requirementId, suiteId } = request.query as {
      projectId?: string;
      requirementId?: string;
      suiteId?: string;
    };
    const client = await pool.connect();
    try {
      let query = `
        SELECT tc.*,
               r.status as last_run_status,
               r.fitness_score as last_run_fitness
        FROM test_cases tc
        LEFT JOIN runs r ON tc.last_run_id = r.id
      `;
      const conditions: string[] = [];
      const params: any[] = [];

      if (projectId) {
        params.push(projectId);
        conditions.push(`tc.project_id = $${params.length}`);
      }
      if (requirementId) {
        params.push(requirementId);
        conditions.push(`tc.requirement_id = $${params.length}`);
      }
      if (suiteId) {
        params.push(suiteId);
        conditions.push(`tc.suite_id = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      query += ` ORDER BY tc.created_at DESC`;

      const res = await client.query(query, params);
      return reply.send(res.rows.map(mapTestCaseRow));
    } finally {
      client.release();
    }
  });

  // Get test case by ID (or project test cases fallback)
  fastify.get('/api/test-cases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.query as { status?: string };
    const client = await pool.connect();
    try {
      // First check if id is a test case ID
      const res = await client.query(
        `SELECT tc.*,
                r.status as last_run_status,
                r.fitness_score as last_run_fitness
         FROM test_cases tc
         LEFT JOIN runs r ON tc.last_run_id = r.id
         WHERE tc.id = $1`,
        [id]
      );
      if (res.rows.length > 0) {
        return reply.send(mapTestCaseRow(res.rows[0]));
      }

      // Fallback: check if id is a project_id
      let query = `
        SELECT tc.*,
               r.status as last_run_status,
               r.fitness_score as last_run_fitness
        FROM test_cases tc
        LEFT JOIN runs r ON tc.last_run_id = r.id
        WHERE tc.project_id = $1
      `;
      const params: any[] = [id];
      if (status && status !== 'all') {
        if (status === 'ongoing' || status === 'ready') {
          query += ` AND (tc.status IN ('ongoing', 'ready', 'draft', 'active') OR tc.status IS NULL)`;
        } else if (status === 'retest') {
          query += ` AND (tc.status IN ('retest', 'needs-review') OR r.status = 'retest')`;
        } else if (status === 'pass' || status === 'passed') {
          query += ` AND (tc.status IN ('pass', 'passed', 'completed') OR r.status = 'passed')`;
        } else if (status === 'fail' || status === 'failed') {
          query += ` AND (tc.status IN ('fail', 'failed') OR r.status = 'failed')`;
        } else {
          params.push(status);
          query += ` AND tc.status = $${params.length}`;
        }
      }
      query += ` ORDER BY tc.created_at DESC`;

      const projRes = await client.query(query, params);
      return reply.send(projRes.rows.map(mapTestCaseRow));
    } finally {
      client.release();
    }
  });

  // Create test case
  fastify.post('/api/test-cases', async (request, reply) => {
    const body = request.body as any;
    const projectId = body.projectId || body.project_id;
    const title = body.title;
    if (!projectId || !title) {
      return reply.status(400).send({ error: 'projectId and title are required' });
    }

    const id = `tc_${crypto.randomUUID().slice(0, 8)}`;
    const testType = body.testType || body.test_type || 'autonomous-agent';
    const status = body.status || 'ready';
    const requirementId = body.requirementId || body.requirement_id || null;
    const suiteId = body.suiteId || body.suite_id || null;
    const targetUrl = body.targetUrl || body.target_url || null;
    const prompt = body.prompt || null;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO test_cases (
          id, project_id, requirement_id, suite_id, title, description,
          test_type, status, target_url, prompt, steps
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id,
          projectId,
          requirementId,
          suiteId,
          title,
          body.description || null,
          testType,
          status,
          targetUrl,
          prompt,
          JSON.stringify(body.steps || []),
        ]
      );
      return reply.status(201).send(mapTestCaseRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Batch add test cases (e.g. from Copilot generation)
  fastify.post('/api/test-cases/batch-add', async (request, reply) => {
    const body = request.body as {
      project_id?: string;
      projectId?: string;
      requirement_id?: string;
      requirementId?: string;
      test_cases?: Array<{
        title: string;
        description?: string;
        test_type?: string;
        status?: string;
        priority?: number;
        test_steps?: string[];
        expected_result?: string;
      }>;
    };

    const projectId = body.projectId || body.project_id;
    const requirementId = body.requirementId || body.requirement_id;
    const testCases = body.test_cases || [];

    if (!projectId || testCases.length === 0) {
      return reply.status(400).send({ error: 'projectId and test_cases are required' });
    }

    const client = await pool.connect();
    try {
      const inserted = [];
      for (const tc of testCases) {
        const id = `tc_${crypto.randomUUID().slice(0, 8)}`;
        const testType = tc.test_type === 'Negative' ? 'autonomous-agent' : 'autonomous-agent';
        const steps = (tc.test_steps || []).map((step, idx) => ({
          stepNumber: idx + 1,
          action: step,
          expectedResult: tc.expected_result || 'Expected assertion succeeds'
        }));

        const res = await client.query(
          `INSERT INTO test_cases (
            id, project_id, requirement_id, title, description,
            test_type, status, target_url, prompt, steps
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            id,
            projectId,
            requirementId || null,
            tc.title,
            tc.description || null,
            testType,
            tc.status || 'ongoing',
            'https://demo.playwright.dev/todomvc',
            `Verify ${tc.title}: ${tc.description || ''}`,
            JSON.stringify(steps)
          ]
        );
        inserted.push(mapTestCaseRow(res.rows[0]));
      }

      return reply.status(201).send({ success: true, count: inserted.length, testCases: inserted });
    } finally {
      client.release();
    }
  });

  // Auto-generate test cases from requirement using Quality Copilot
  fastify.post('/api/requirements/:id/generate-tests', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { targetUrl } = (request.body as { targetUrl?: string }) || {};

    const client = await pool.connect();
    try {
      const reqRes = await client.query(`SELECT * FROM requirements WHERE id = $1`, [id]);
      if (reqRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Requirement not found' });
      }

      const req = reqRes.rows[0];
      const analysis = await AIService.analyzeRequirementClarity(req.title, req.description || '');
      const createdTestCases = [];

      for (const scenario of analysis.suggestedTestScenarios) {
        const tcId = `tc_${crypto.randomUUID().slice(0, 8)}`;
        const prompt = `Navigate to application and verify ${scenario.title}: ${scenario.description}. Expected outcome: ${scenario.expectedResult}`;

        const insertRes = await client.query(
          `INSERT INTO test_cases (
            id, project_id, requirement_id, title, description, test_type, status, target_url, prompt, steps
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            tcId,
            req.project_id,
            req.id,
            scenario.title,
            scenario.description,
            'autonomous-agent',
            'ready',
            targetUrl || 'https://demo.playwright.dev/todomvc',
            prompt,
            JSON.stringify([
              { stepNumber: 1, action: scenario.description, expectedResult: scenario.expectedResult }
            ])
          ]
        );
        createdTestCases.push(mapTestCaseRow(insertRes.rows[0]));
      }

      return reply.status(201).send(createdTestCases);
    } finally {
      client.release();
    }
  });

  // Delete test case
  fastify.delete('/api/test-cases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM test_cases WHERE id = $1`, [id]);
      return reply.send({ success: true, message: `Test case ${id} deleted` });
    } finally {
      client.release();
    }
  });
}

function mapTestCaseRow(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    project_id: row.project_id,
    requirementId: row.requirement_id,
    requirement_id: row.requirement_id,
    suiteId: row.suite_id,
    suite_id: row.suite_id,
    title: row.title,
    description: row.description,
    testType: row.test_type,
    test_type: row.test_type,
    status: row.status,
    priority: row.priority || 1,
    targetUrl: row.target_url,
    target_url: row.target_url,
    prompt: row.prompt,
    steps: row.steps || [],
    lastRunId: row.last_run_id,
    last_run_id: row.last_run_id,
    lastRunStatus: row.last_run_status,
    last_run_status: row.last_run_status,
    lastRunFitness: row.last_run_fitness ? parseFloat(row.last_run_fitness) : undefined,
    last_run_fitness: row.last_run_fitness ? parseFloat(row.last_run_fitness) : undefined,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

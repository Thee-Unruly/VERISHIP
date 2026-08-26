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

  // Get test case by ID
  fastify.get('/api/test-cases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT tc.*,
                r.status as last_run_status,
                r.fitness_score as last_run_fitness
         FROM test_cases tc
         LEFT JOIN runs r ON tc.last_run_id = r.id
         WHERE tc.id = $1`,
        [id]
      );
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Test case not found' });
      }
      return reply.send(mapTestCaseRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Create test case
  fastify.post('/api/test-cases', async (request, reply) => {
    const body = request.body as CreateTestCaseInput;
    if (!body.projectId || !body.title) {
      return reply.status(400).send({ error: 'projectId and title are required' });
    }

    const id = `tc_${crypto.randomUUID().slice(0, 8)}`;
    const testType = body.testType || 'autonomous-agent';
    const status = 'ready';

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
          body.projectId,
          body.requirementId || null,
          body.suiteId || null,
          body.title,
          body.description || null,
          testType,
          status,
          body.targetUrl || null,
          body.prompt || null,
          JSON.stringify(body.steps || []),
        ]
      );
      return reply.status(201).send(mapTestCaseRow(res.rows[0]));
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
    requirementId: row.requirement_id,
    suiteId: row.suite_id,
    title: row.title,
    description: row.description,
    testType: row.test_type,
    status: row.status,
    targetUrl: row.target_url,
    prompt: row.prompt,
    steps: row.steps || [],
    lastRunId: row.last_run_id,
    lastRunStatus: row.last_run_status,
    lastRunFitness: row.last_run_fitness ? parseFloat(row.last_run_fitness) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

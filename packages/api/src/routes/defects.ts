import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';
import { CreateDefectInput } from '@universal-qa/shared';
import { AIService } from '../services/aiService';

export async function defectRoutes(fastify: FastifyInstance) {
  // List defects
  fastify.get('/api/defects', async (request, reply) => {
    const { projectId, status, severity } = request.query as {
      projectId?: string;
      status?: string;
      severity?: string;
    };
    const client = await pool.connect();
    try {
      let query = `SELECT * FROM defects`;
      const conditions: string[] = [];
      const params: any[] = [];

      if (projectId) {
        params.push(projectId);
        conditions.push(`project_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }
      if (severity) {
        params.push(severity);
        conditions.push(`severity = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      query += ` ORDER BY created_at DESC`;

      const res = await client.query(query, params);
      return reply.send(res.rows.map(mapDefectRow));
    } finally {
      client.release();
    }
  });

  // Get defect by ID (or project defects fallback)
  fastify.get('/api/defects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      // First check if id is a defect ID
      const res = await client.query(`SELECT * FROM defects WHERE id = $1`, [id]);
      if (res.rows.length > 0) {
        return reply.send(mapDefectRow(res.rows[0]));
      }

      // Fallback: check if id is a project_id
      const projRes = await client.query(`SELECT * FROM defects WHERE project_id = $1 ORDER BY created_at DESC`, [id]);
      return reply.send(projRes.rows.map(mapDefectRow));
    } finally {
      client.release();
    }
  });

  // Create defect
  fastify.post('/api/defects', async (request, reply) => {
    const body = request.body as any;
    const projectId = body.projectId || body.project_id;
    const title = body.title;
    if (!projectId || !title) {
      return reply.status(400).send({ error: 'projectId and title are required' });
    }

    const id = `def_${crypto.randomUUID().slice(0, 8)}`;
    const severity = body.severity || 'medium';
    const status = body.status || 'open';
    const testCaseId = body.testCaseId || body.test_case_id || null;
    const runId = body.runId || body.run_id || null;

    // AI Root Cause analysis if not provided
    let rootCause = body.rootCauseAnalysis || body.root_cause_analysis;
    let suggestedFix = body.suggestedFix || body.suggested_fix;
    if (!rootCause) {
      const analysis = await AIService.analyzeDefectRootCause(title, body.description || '');
      rootCause = analysis.rootCause;
      suggestedFix = analysis.suggestedFix;
    }

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO defects (
          id, project_id, run_id, test_case_id, title, description,
          severity, status, root_cause_analysis, suggested_fix,
          reproduction_steps, screenshot_url, trace_url
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          id,
          projectId,
          runId,
          testCaseId,
          title,
          body.description || null,
          severity,
          status,
          rootCause || null,
          suggestedFix || null,
          body.reproductionSteps || body.reproduction_steps || body.steps_to_reproduce || null,
          body.screenshotUrl || body.screenshot_url || null,
          body.traceUrl || body.trace_url || null,
        ]
      );
      return reply.status(201).send(mapDefectRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Update defect status / severity
  fastify.put('/api/defects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string; severity?: string; suggestedFix?: string };

    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE defects
         SET status = COALESCE($1, status),
             severity = COALESCE($2, severity),
             suggested_fix = COALESCE($3, suggested_fix),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [body.status, body.severity, body.suggestedFix, id]
      );
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Defect not found' });
      }
      return reply.send(mapDefectRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Delete defect
  fastify.delete('/api/defects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM defects WHERE id = $1`, [id]);
      return reply.send({ success: true, message: `Defect ${id} deleted` });
    } finally {
      client.release();
    }
  });
}

function mapDefectRow(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    runId: row.run_id,
    testCaseId: row.test_case_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    rootCauseAnalysis: row.root_cause_analysis,
    suggestedFix: row.suggested_fix,
    reproductionSteps: row.reproduction_steps || [],
    screenshotUrl: row.screenshot_url,
    traceUrl: row.trace_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

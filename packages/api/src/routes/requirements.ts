import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';
import { CreateRequirementInput } from '@universal-qa/shared';
import { AIService } from '../services/aiService';

export async function requirementRoutes(fastify: FastifyInstance) {
  // List requirements for a project
  fastify.get('/api/requirements', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };
    const client = await pool.connect();
    try {
      let query = `
        SELECT r.*,
               (SELECT COUNT(*) FROM test_cases WHERE requirement_id = r.id)::int as test_case_count,
               (SELECT json_agg(json_build_object('id', ac.id, 'criteria', ac.criteria, 'isCovered', ac.is_covered))
                FROM acceptance_criteria ac WHERE ac.requirement_id = r.id) as acceptance_criteria
        FROM requirements r
      `;
      const params: any[] = [];
      if (projectId) {
        query += ` WHERE r.project_id = $1`;
        params.push(projectId);
      }
      query += ` ORDER BY r.created_at DESC`;

      const res = await client.query(query, params);
      return reply.send(res.rows.map(mapRequirementRow));
    } finally {
      client.release();
    }
  });

  // Get requirement by ID or project requirements fallback
  fastify.get('/api/requirements/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      // First check if id is a requirement ID
      const res = await client.query(
        `SELECT r.*,
                (SELECT COUNT(*) FROM test_cases WHERE requirement_id = r.id)::int as test_case_count,
                (SELECT json_agg(json_build_object('id', ac.id, 'criteria', ac.criteria, 'isCovered', ac.is_covered))
                 FROM acceptance_criteria ac WHERE ac.requirement_id = r.id) as acceptance_criteria
         FROM requirements r
         WHERE r.id = $1`,
        [id]
      );
      if (res.rows.length > 0) {
        return reply.send(mapRequirementRow(res.rows[0]));
      }

      // Fallback: check if id is a project_id (e.g. /api/requirements/1)
      const projRes = await client.query(
        `SELECT r.*,
                (SELECT COUNT(*) FROM test_cases WHERE requirement_id = r.id)::int as test_case_count,
                (SELECT json_agg(json_build_object('id', ac.id, 'criteria', ac.criteria, 'isCovered', ac.is_covered))
                 FROM acceptance_criteria ac WHERE ac.requirement_id = r.id) as acceptance_criteria
         FROM requirements r
         WHERE r.project_id = $1
         ORDER BY r.created_at DESC`,
        [id]
      );
      return reply.send(projRes.rows.map(mapRequirementRow));
    } finally {
      client.release();
    }
  });

  // Create requirement with automated AI clarity analysis
  fastify.post('/api/requirements', async (request, reply) => {
    const body = request.body as any;
    const projectId = body.projectId || body.project_id;
    const title = body.title;
    if (!projectId || !title) {
      return reply.status(400).send({ error: 'projectId and title are required' });
    }

    const id = `req_${crypto.randomUUID().slice(0, 8)}`;
    const status = body.status || 'draft';

    // Perform AI clarity analysis
    const analysis = await AIService.analyzeRequirementClarity(title, body.description || '');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO requirements (
          id, project_id, title, description, status, clarity_score, testability_score,
          ambiguities, missing_criteria, suggested_acceptance_criteria
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          projectId,
          title,
          body.description || null,
          status,
          analysis.clarityScore,
          analysis.testabilityScore,
          JSON.stringify(analysis.ambiguities),
          JSON.stringify(analysis.missingCriteria),
          JSON.stringify(analysis.suggestedAcceptanceCriteria),
        ]
      );

      // Insert custom or suggested acceptance criteria
      const acList = body.acceptanceCriteria || analysis.suggestedAcceptanceCriteria;
      for (const criteria of acList) {
        const acId = `ac_${crypto.randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO acceptance_criteria (id, requirement_id, criteria) VALUES ($1, $2, $3)`,
          [acId, id, criteria]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send(mapRequirementRow(res.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Trigger AI Clarity Analysis manually on demand
  fastify.post('/api/requirements/:id/analyze', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM requirements WHERE id = $1`, [id]);
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Requirement not found' });
      }

      const req = res.rows[0];
      const analysis = await AIService.analyzeRequirementClarity(req.title, req.description || '');

      const updated = await client.query(
        `UPDATE requirements
         SET clarity_score = $1,
             testability_score = $2,
             ambiguities = $3,
             missing_criteria = $4,
             suggested_acceptance_criteria = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [
          analysis.clarityScore,
          analysis.testabilityScore,
          JSON.stringify(analysis.ambiguities),
          JSON.stringify(analysis.missingCriteria),
          JSON.stringify(analysis.suggestedAcceptanceCriteria),
          id,
        ]
      );

      return reply.send({
        requirement: mapRequirementRow(updated.rows[0]),
        analysis,
      });
    } finally {
      client.release();
    }
  });

  // Delete requirement
  fastify.delete('/api/requirements/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM requirements WHERE id = $1`, [id]);
      return reply.send({ success: true, message: `Requirement ${id} deleted` });
    } finally {
      client.release();
    }
  });
}

function mapRequirementRow(row: any) {
  const clarityScore = row.clarity_score !== null && row.clarity_score !== undefined ? parseFloat(row.clarity_score) : undefined;
  const testabilityScore = row.testability_score !== null && row.testability_score !== undefined ? parseFloat(row.testability_score) : undefined;
  const isTestable = testabilityScore !== undefined ? testabilityScore >= 70 : true;

  return {
    id: row.id,
    projectId: row.project_id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority || 1,
    clarityScore: clarityScore,
    clarity_score: clarityScore,
    testabilityScore: testabilityScore,
    testability_score: testabilityScore,
    isTestable: isTestable,
    is_testable: isTestable,
    ambiguities: row.ambiguities || [],
    missingCriteria: row.missing_criteria || [],
    missing_criteria: row.missing_criteria || [],
    suggestedAcceptanceCriteria: row.suggested_acceptance_criteria || [],
    suggested_acceptance_criteria: row.suggested_acceptance_criteria || [],
    clarityHistory: row.clarity_history || [],
    clarity_history: row.clarity_history || [],
    acceptanceCriteria: row.acceptance_criteria || [],
    acceptance_criteria: row.acceptance_criteria || [],
    testCaseCount: row.test_case_count || 0,
    test_case_count: row.test_case_count || 0,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

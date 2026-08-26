import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';
import { AIService } from '../services/aiService';

export async function releaseRoutes(fastify: FastifyInstance) {
  // List releases for a project
  fastify.get('/api/releases', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };
    const client = await pool.connect();
    try {
      let query = `
        SELECT rel.*,
               p.name as project_name,
               (SELECT json_agg(json_build_object('id', ra.id, 'role', ra.role, 'approverName', ra.approver_name, 'status', ra.status, 'comments', ra.comments, 'updatedAt', ra.updated_at))
                FROM release_approvals ra WHERE ra.release_id = rel.id) as approvals,
               (SELECT COUNT(*)::int FROM test_cases WHERE project_id = rel.project_id) as total_tests,
               (SELECT COUNT(*)::int FROM test_cases WHERE project_id = rel.project_id AND status = 'passed') as passed_tests,
               (SELECT COUNT(*)::int FROM defects WHERE project_id = rel.project_id AND status = 'open') as open_defects_count,
               (SELECT COUNT(*)::int FROM defects WHERE project_id = rel.project_id AND status = 'open' AND severity = 'critical') as critical_defects_count
        FROM releases rel
        LEFT JOIN projects p ON rel.project_id = p.id
      `;
      const params: any[] = [];
      if (projectId) {
        query += ` WHERE rel.project_id = $1`;
        params.push(projectId);
      }
      query += ` ORDER BY rel.created_at DESC`;

      const res = await client.query(query, params);
      return reply.send(res.rows.map(mapReleaseRow));
    } finally {
      client.release();
    }
  });

  // Get release by ID with readiness evaluation
  fastify.get('/api/releases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT rel.*,
                p.name as project_name,
                (SELECT json_agg(json_build_object('id', ra.id, 'role', ra.role, 'approverName', ra.approver_name, 'status', ra.status, 'comments', ra.comments, 'updatedAt', ra.updated_at))
                 FROM release_approvals ra WHERE ra.release_id = rel.id) as approvals,
                (SELECT COUNT(*)::int FROM test_cases WHERE project_id = rel.project_id) as total_tests,
                (SELECT COUNT(*)::int FROM test_cases WHERE project_id = rel.project_id AND status = 'passed') as passed_tests,
                (SELECT COUNT(*)::int FROM defects WHERE project_id = rel.project_id AND status = 'open') as open_defects_count,
                (SELECT COUNT(*)::int FROM defects WHERE project_id = rel.project_id AND status = 'open' AND severity = 'critical') as critical_defects_count
         FROM releases rel
         LEFT JOIN projects p ON rel.project_id = p.id
         WHERE rel.id = $1`,
        [id]
      );
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Release not found' });
      }
      return reply.send(mapReleaseRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Create release
  fastify.post('/api/releases', async (request, reply) => {
    const body = request.body as {
      projectId: string;
      version: string;
      name?: string;
      description?: string;
      targetDate?: string;
    };
    if (!body.projectId || !body.version) {
      return reply.status(400).send({ error: 'projectId and version are required' });
    }

    const id = `rel_${crypto.randomUUID().slice(0, 8)}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO releases (id, project_id, version, name, description, target_date, status, readiness_score, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, 'planning', 0, 'NO-GO')
         RETURNING *`,
        [id, body.projectId, body.version, body.name || null, body.description || null, body.targetDate || null]
      );

      // Initialize standard approval gate roles
      const defaultRoles = [
        { role: 'qa', approver: 'QA Lead' },
        { role: 'engineering', approver: 'Engineering Lead' },
        { role: 'pm', approver: 'Product Manager' },
      ];
      for (const item of defaultRoles) {
        const approvalId = `appr_${crypto.randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO release_approvals (id, release_id, role, approver_name, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [approvalId, id, item.role, item.approver]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send(mapReleaseRow(res.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Calculate & evaluate Release Gate Readiness (AI Assessment)
  fastify.post('/api/releases/:id/evaluate-readiness', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const relRes = await client.query(
        `SELECT rel.*, p.name as project_name FROM releases rel JOIN projects p ON rel.project_id = p.id WHERE rel.id = $1`,
        [id]
      );
      if (relRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Release not found' });
      }

      const release = relRes.rows[0];
      const [tcRes, defRes, reqRes] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'passed' THEN 1 END)::int as passed FROM test_cases WHERE project_id = $1`,
          [release.project_id]
        ),
        client.query(
          `SELECT COUNT(*)::int as total, COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical FROM defects WHERE project_id = $1 AND status = 'open'`,
          [release.project_id]
        ),
        client.query(
          `SELECT COUNT(*)::int as total FROM requirements WHERE project_id = $1`,
          [release.project_id]
        ),
      ]);

      const totalTests = tcRes.rows[0]?.total || 0;
      const passedTests = tcRes.rows[0]?.passed || 0;
      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      const openDefects = defRes.rows[0]?.total || 0;
      const criticalDefects = defRes.rows[0]?.critical || 0;
      const totalReq = reqRes.rows[0]?.total || 0;
      const coverage = totalReq > 0 ? Math.min(100, (totalTests / totalReq) * 100) : 0;

      const analysis = await AIService.analyzeReleaseReadiness(
        release.project_name,
        passRate,
        criticalDefects,
        openDefects,
        coverage
      );

      // Update release record
      const updated = await client.query(
        `UPDATE releases
         SET readiness_score = $1,
             recommendation = $2,
             status = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
          analysis.readinessScore,
          analysis.recommendation,
          analysis.recommendation === 'GO' ? 'ready' : 'in-testing',
          id,
        ]
      );

      return reply.send({
        release: mapReleaseRow(updated.rows[0]),
        analysis,
      });
    } finally {
      client.release();
    }
  });

  // Update approval status
  fastify.put('/api/releases/:releaseId/approvals/:approvalId', async (request, reply) => {
    const { approvalId } = request.params as { approvalId: string };
    const { status, comments } = request.body as { status: string; comments?: string };

    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE release_approvals
         SET status = $1,
             comments = COALESCE($2, comments),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, comments, approvalId]
      );
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Approval not found' });
      }
      return reply.send(res.rows[0]);
    } finally {
      client.release();
    }
  });
}

function mapReleaseRow(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    version: row.version,
    name: row.name,
    description: row.description,
    status: row.status,
    readinessScore: row.readiness_score ? parseFloat(row.readiness_score) : 0,
    recommendation: row.recommendation || 'NO-GO',
    targetDate: row.target_date,
    totalTests: row.total_tests || 0,
    passedTests: row.passedTests || 0,
    openDefectsCount: row.open_defects_count || 0,
    criticalDefectsCount: row.critical_defects_count || 0,
    approvals: row.approvals || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';
import { CreateProjectInput } from '@universal-qa/shared';

export async function projectRoutes(fastify: FastifyInstance) {
  // List all projects
  fastify.get('/api/projects', async (request, reply) => {
    const { workspaceId = 'default' } = request.query as { workspaceId?: string };
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT p.*,
                (SELECT COUNT(*) FROM requirements WHERE project_id = p.id)::int as requirement_count,
                (SELECT COUNT(*) FROM test_cases WHERE project_id = p.id)::int as test_case_count,
                (SELECT COUNT(*) FROM defects WHERE project_id = p.id AND status = 'open')::int as open_defects_count,
                (SELECT COUNT(*) FROM runs WHERE project_id = p.id)::int as total_runs_count
         FROM projects p
         WHERE p.workspace_id = $1
         ORDER BY p.created_at DESC`,
        [workspaceId]
      );
      return reply.send(res.rows.map(mapProjectRow));
    } finally {
      client.release();
    }
  });

  // Get project by ID with full statistics
  fastify.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM projects WHERE id = $1`, [id]);
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return reply.send(mapProjectRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Create project
  fastify.post('/api/projects', async (request, reply) => {
    const body = request.body as CreateProjectInput;
    if (!body.name) {
      return reply.status(400).send({ error: 'Project name is required' });
    }

    const id = `prj_${crypto.randomUUID().slice(0, 8)}`;
    const workspaceId = body.workspaceId || 'default';
    const status = body.status || 'on-track';

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO projects (id, workspace_id, name, description, status, target_release_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, workspaceId, body.name, body.description || null, status, body.targetReleaseDate || null]
      );
      return reply.status(201).send(mapProjectRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Update project
  fastify.put('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<CreateProjectInput>;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE projects
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             target_release_date = COALESCE($4, target_release_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [body.name, body.description, body.status, body.targetReleaseDate, id]
      );
      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return reply.send(mapProjectRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Delete project
  fastify.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM projects WHERE id = $1`, [id]);
      return reply.send({ success: true, message: `Project ${id} deleted` });
    } finally {
      client.release();
    }
  });

  // Get project metrics
  fastify.get('/api/projects/:id/metrics', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const [reqRes, tcRes, defRes, runRes] = await Promise.all([
        client.query(`SELECT COUNT(*)::int as count FROM requirements WHERE project_id = $1`, [id]),
        client.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'passed' THEN 1 END)::int as passed FROM test_cases WHERE project_id = $1`, [id]),
        client.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open, COUNT(CASE WHEN severity = 'critical' AND status = 'open' THEN 1 END)::int as critical FROM defects WHERE project_id = $1`, [id]),
        client.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN taxonomy = 'PASSED' THEN 1 END)::int as passed FROM runs WHERE project_id = $1`, [id]),
      ]);

      const totalReq = reqRes.rows[0]?.count || 0;
      const totalTc = tcRes.rows[0]?.total || 0;
      const passedTc = tcRes.rows[0]?.passed || 0;
      const totalDef = defRes.rows[0]?.total || 0;
      const openDef = defRes.rows[0]?.open || 0;
      const critDef = defRes.rows[0]?.critical || 0;
      const totalRuns = runRes.rows[0]?.total || 0;
      const passedRuns = runRes.rows[0]?.passed || 0;

      const coverageRate = totalReq > 0 ? Math.min(100, Math.round((totalTc / totalReq) * 100)) : 0;
      const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : totalTc > 0 ? Math.round((passedTc / totalTc) * 100) : 100;
      const defectDensity = totalTc > 0 ? parseFloat((totalDef / totalTc).toFixed(2)) : 0;

      return reply.send({
        coverageRate,
        passRate,
        defectDensity,
        flakinessRate: 2.5,
        totalRequirements: totalReq,
        totalTestCases: totalTc,
        totalDefects: totalDef,
        openDefects: openDef,
        criticalDefects: critDef,
      });
    } finally {
      client.release();
    }
  });
}

function mapProjectRow(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    healthScore: row.health_score ? parseFloat(row.health_score) : 100,
    qualityCoverage: row.quality_coverage ? parseFloat(row.quality_coverage) : 0,
    targetReleaseDate: row.target_release_date,
    requirementCount: row.requirement_count,
    testCaseCount: row.test_case_count,
    openDefectsCount: row.open_defects_count,
    totalRunsCount: row.total_runs_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

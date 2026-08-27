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
    const body = request.body as any;
    if (!body?.name) {
      return reply.status(400).send({ error: 'Project name is required' });
    }

    const id = `prj_${crypto.randomUUID().slice(0, 8)}`;
    const workspaceId = body.workspaceId || body.workspace_id || 'default';
    const status = body.status || 'on-track';
    const targetReleaseDate = body.targetReleaseDate || body.target_release_date || null;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO projects (id, workspace_id, name, description, status, target_release_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, workspaceId, body.name, body.description || null, status, targetReleaseDate]
      );
      return reply.status(201).send(mapProjectRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Update project
  fastify.put('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const targetReleaseDate = body.targetReleaseDate !== undefined ? body.targetReleaseDate : body.target_release_date;

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
        [body.name, body.description, body.status, targetReleaseDate, id]
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
      return reply.send({ success: true, message: 'Project deleted' });
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

  // Team members for a project
  fastify.get('/api/projects/:id/team', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role as system_role, upa.role as project_role
         FROM user_project_assignment upa
         JOIN users u ON upa.user_id = u.id
         WHERE upa.project_id = $1`,
        [id]
      );
      return reply.send(res.rows.map(r => ({
        id: r.id,
        name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username,
        email: r.email,
        role: r.project_role || r.system_role || 'Developer',
      })));
    } finally {
      client.release();
    }
  });

  fastify.post('/api/projects/:id/team', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { userId?: string; name?: string; email?: string; role?: string };
    const client = await pool.connect();
    try {
      let userId = body.userId;
      if (!userId && (body.email || body.name)) {
        const email = body.email || `${(body.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '.')}.${Date.now()}@example.com`;
        const existing = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
        if (existing.rows.length > 0) {
          userId = existing.rows[0].id;
        } else {
          userId = `usr_${crypto.randomUUID().slice(0, 8)}`;
          const nameParts = (body.name || 'Team Member').trim().split(' ');
          const firstName = nameParts[0] || 'Team';
          const lastName = nameParts.slice(1).join(' ') || 'Member';
          const username = (body.email ? body.email.split('@')[0] : firstName.toLowerCase()) + '_' + Math.floor(Math.random() * 1000);
          await client.query(
            `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, 'hash_placeholder', $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [userId, username, email, firstName, lastName, body.role || 'Developer']
          );
        }
      } else if (!userId) {
        userId = `usr_${crypto.randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role)
           VALUES ($1, $2, $3, 'hash_placeholder', 'Team', 'Member', 'Developer')
           ON CONFLICT DO NOTHING`,
          [userId, `user_${userId}`, `${userId}@example.com`]
        );
      }

      await client.query(
        `INSERT INTO user_project_assignment (user_id, project_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, project_id) DO UPDATE SET role = $3`,
        [userId, id, body.role || 'Developer']
      );

      return reply.status(201).send({ success: true, message: 'Team member added' });
    } finally {
      client.release();
    }
  });

  fastify.put('/api/projects/:id/team/:memberId', async (request, reply) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const body = request.body as { name?: string; email?: string; role?: string };
    const client = await pool.connect();
    try {
      if (body.name || body.email) {
        const nameParts = (body.name || '').trim().split(' ');
        const firstName = nameParts[0] || null;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        await client.query(
          `UPDATE users
           SET first_name = COALESCE($1, first_name),
               last_name = COALESCE($2, last_name),
               email = COALESCE($3, email)
           WHERE id = $4`,
          [firstName, lastName, body.email || null, memberId]
        );
      }

      if (body.role) {
        await client.query(
          `UPDATE user_project_assignment
           SET role = $1
           WHERE project_id = $2 AND user_id = $3`,
          [body.role, id, memberId]
        );
      }

      return reply.send({ success: true, message: 'Team member updated' });
    } finally {
      client.release();
    }
  });

  fastify.delete('/api/projects/:id/team/:memberId', async (request, reply) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM user_project_assignment WHERE project_id = $1 AND user_id = $2`,
        [id, memberId]
      );
      return reply.send({ success: true, message: 'Team member removed' });
    } finally {
      client.release();
    }
  });
}

function mapProjectRow(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspace_id: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    healthScore: row.health_score ? parseFloat(row.health_score) : 100,
    health_score: row.health_score ? parseFloat(row.health_score) : 100,
    qualityCoverage: row.quality_coverage ? parseFloat(row.quality_coverage) : 0,
    quality_coverage: row.quality_coverage ? parseFloat(row.quality_coverage) : 0,
    targetReleaseDate: row.target_release_date,
    target_release_date: row.target_release_date,
    requirementCount: row.requirement_count || 0,
    requirement_count: row.requirement_count || 0,
    testCaseCount: row.test_case_count || 0,
    test_case_count: row.test_case_count || 0,
    openDefectsCount: row.open_defects_count || 0,
    open_defects_count: row.open_defects_count || 0,
    totalRunsCount: row.total_runs_count || 0,
    total_runs_count: row.total_runs_count || 0,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';

export async function serviceAccountRoutes(fastify: FastifyInstance) {
  // List service accounts
  fastify.get('/api/auth/service-accounts', async (request, reply) => {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT id, name, description, role, is_active, created_at, last_used_at FROM service_accounts ORDER BY created_at DESC`
      );
      return reply.send(res.rows.map(mapServiceAccountRow));
    } finally {
      client.release();
    }
  });

  // Create service account (e.g. for n8n orchestrator or CI/CD agent)
  fastify.post('/api/auth/service-account', async (request, reply) => {
    const body = request.body as { name: string; description?: string; role?: string };
    if (!body.name) {
      return reply.status(400).send({ error: 'Service account name is required' });
    }

    const id = `sa_${crypto.randomUUID().slice(0, 8)}`;
    const role = body.role || 'agent';
    const token = `vsh_${crypto.randomBytes(32).toString('hex')}`;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO service_accounts (id, name, description, role, token, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING *`,
        [id, body.name, body.description || null, role, token]
      );
      return reply.status(201).send(mapServiceAccountRow(res.rows[0], true));
    } finally {
      client.release();
    }
  });

  // Revoke service account
  fastify.delete('/api/auth/service-accounts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM service_accounts WHERE id = $1`, [id]);
      return reply.send({ success: true, message: `Service account ${id} revoked` });
    } finally {
      client.release();
    }
  });
}

function mapServiceAccountRow(row: any, includeToken = false) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.role,
    isActive: row.is_active,
    ...(includeToken ? { token: row.token } : {}),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

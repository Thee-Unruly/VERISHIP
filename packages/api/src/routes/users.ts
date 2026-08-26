import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';

export async function userRoutes(fastify: FastifyInstance) {
  // List all users
  fastify.get('/api/users', async (request, reply) => {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT id, username, email, first_name, last_name, role, is_active, created_at, last_login
         FROM users
         ORDER BY created_at ASC`
      );
      if (res.rows.length === 0) {
        // Return default admin user if none created yet
        return reply.send([
          {
            id: 'usr_admin',
            username: 'admin',
            email: 'admin@veriship.io',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      return reply.send(res.rows.map(mapUserRow));
    } finally {
      client.release();
    }
  });

  // Create user
  fastify.post('/api/users', async (request, reply) => {
    const body = request.body as {
      username: string;
      email: string;
      password?: string;
      first_name?: string;
      last_name?: string;
      role?: string;
    };

    if (!body.username || !body.email) {
      return reply.status(400).send({ detail: 'Username and email are required' });
    }

    const client = await pool.connect();
    try {
      const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
      const salt = 'veriship_salt_2026';
      const passwordHash = crypto.createHash('sha256').update((body.password || 'password123') + salt).digest('hex');

      const res = await client.query(
        `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         RETURNING *`,
        [id, body.username, body.email, passwordHash, body.first_name || null, body.last_name || null, body.role || 'member']
      );

      return reply.status(201).send(mapUserRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Delete user
  fastify.delete('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM users WHERE id = $1`, [id]);
      return reply.send({ success: true, message: `User ${id} removed` });
    } finally {
      client.release();
    }
  });

  // General Settings
  fastify.get('/api/settings/general', async (request, reply) => {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT value FROM settings WHERE key = 'general'`);
      if (res.rows.length === 0) {
        return reply.send({
          platform_name: 'VeriShip Quality Platform',
          default_ai_provider: 'Groq (Llama-3.3)',
          auto_healing: true,
          max_retries: 3,
          notification_email: 'qa-alerts@veriship.io',
        });
      }
      return reply.send(res.rows[0].value);
    } finally {
      client.release();
    }
  });

  fastify.post('/api/settings/general', async (request, reply) => {
    const body = request.body as any;
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO settings (id, key, value, updated_at)
         VALUES ('set_general', 'general', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE
         SET value = $1, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(body)]
      );
      return reply.send({ success: true, settings: body });
    } finally {
      client.release();
    }
  });

  fastify.put('/api/settings/general', async (request, reply) => {
    const body = request.body as any;
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO settings (id, key, value, updated_at)
         VALUES ('set_general', 'general', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE
         SET value = $1, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(body)]
      );
      return reply.send({ success: true, settings: body });
    } finally {
      client.release();
    }
  });
}

function mapUserRow(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username,
    role: row.role || 'member',
    isActive: row.is_active !== false,
    created_at: row.created_at,
    last_login: row.last_login,
  };
}

import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../db';

// Helper to hash password using SHA-256 with salt
function hashPassword(password: string): string {
  const salt = 'veriship_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function mapUserRow(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    role: row.role || 'admin',
    is_active: row.is_active !== false,
    created_at: row.created_at,
    last_login: row.last_login,
  };
}

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/api/auth/register', async (request, reply) => {
    const body = request.body as {
      username: string;
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
    };

    if (!body.username || !body.email || !body.password) {
      return reply.status(400).send({ detail: 'Username, email, and password are required' });
    }

    const client = await pool.connect();
    try {
      // Check if user already exists
      const existing = await client.query(
        `SELECT id FROM users WHERE username = $1 OR email = $2`,
        [body.username, body.email]
      );
      if (existing.rows.length > 0) {
        return reply.status(400).send({ detail: 'Username or email already registered' });
      }

      const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
      const passwordHash = hashPassword(body.password);
      const token = `vsh_jwt_${crypto.randomBytes(32).toString('hex')}`;

      const res = await client.query(
        `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active, last_login)
         VALUES ($1, $2, $3, $4, $5, $6, 'admin', TRUE, CURRENT_TIMESTAMP)
         RETURNING *`,
        [id, body.username, body.email, passwordHash, body.first_name || null, body.last_name || null]
      );

      const user = mapUserRow(res.rows[0]);
      return reply.status(201).send({
        token,
        user,
        message: 'Registration successful',
      });
    } finally {
      client.release();
    }
  });

  // Login user
  fastify.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { username: string; password: string };
    if (!body.username || !body.password) {
      return reply.status(400).send({ detail: 'Username and password are required' });
    }

    const client = await pool.connect();
    try {
      const passwordHash = hashPassword(body.password);
      const res = await client.query(
        `SELECT * FROM users WHERE (username = $1 OR email = $1) AND password_hash = $2`,
        [body.username, passwordHash]
      );

      if (res.rows.length === 0) {
        return reply.status(401).send({ detail: 'Invalid username or password' });
      }

      // Update last login
      await client.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [res.rows[0].id]);

      const token = `vsh_jwt_${crypto.randomBytes(32).toString('hex')}`;
      const user = mapUserRow(res.rows[0]);

      return reply.send({
        token,
        user,
        message: 'Login successful',
      });
    } finally {
      client.release();
    }
  });

  // Current user /me
  fastify.get('/api/auth/me', async (request, reply) => {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM users ORDER BY created_at ASC LIMIT 1`);
      if (res.rows.length === 0) {
        return reply.send({
          id: 'usr_admin',
          username: 'admin',
          email: 'admin@veriship.io',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
      return reply.send(mapUserRow(res.rows[0]));
    } finally {
      client.release();
    }
  });

  // Update profile
  fastify.put('/api/auth/profile', async (request, reply) => {
    const body = request.body as { first_name?: string; last_name?: string; email?: string };
    const client = await pool.connect();
    try {
      const userRes = await client.query(`SELECT * FROM users ORDER BY created_at ASC LIMIT 1`);
      if (userRes.rows.length === 0) {
        return reply.send({ success: true, message: 'Profile updated' });
      }

      const updated = await client.query(
        `UPDATE users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             email = COALESCE($3, email)
         WHERE id = $4
         RETURNING *`,
        [body.first_name, body.last_name, body.email, userRes.rows[0].id]
      );

      return reply.send(mapUserRow(updated.rows[0]));
    } finally {
      client.release();
    }
  });
}

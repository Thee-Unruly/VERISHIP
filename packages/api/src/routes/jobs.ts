import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { validateTargetUrl } from '../security/ingressGuard';
import { pool } from '../db';
import { qaJobQueue, extractDomain } from '../queue';
import { CreateJobInput } from '@universal-qa/shared';

// Simple in-memory event bus for SSE listeners
import { EventEmitter } from 'events';
import Redis from 'ioredis';

export const jobEvents = new EventEmitter();

// Initialize Redis pub/sub subscriber client to listen to worker events
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisSubscriber = new Redis({
  host: redisHost,
  port: redisPort,
});

redisSubscriber.subscribe('job_updates').catch(err => {
  console.error('[API Gateway] Redis subscribe error:', err);
});

redisSubscriber.on('message', (channel, message) => {
  if (channel === 'job_updates') {
    try {
      const data = JSON.parse(message);
      if (data.event) {
        jobEvents.emit(data.event, data);
      }
    } catch (err) {
      console.error('[API Gateway] Error parsing job update event:', err);
    }
  }
});

export async function jobRoutes(fastify: FastifyInstance) {
  // POST /api/v1/jobs - Submit a new QA test job
  fastify.post('/api/v1/jobs', async (req: FastifyRequest<{ Body: CreateJobInput }>, reply: FastifyReply) => {
    const { url, prompt, workspaceId = 'default', priority = 'interactive' } = req.body || {};

    if (!url || !prompt) {
      return reply.status(400).send({ error: 'Missing required parameters: url and prompt' });
    }

    // 1. INGRESS GUARD Check (SSRF & DNS Defense)
    const guardCheck = await validateTargetUrl(url);
    if (!guardCheck.ok) {
      return reply.status(400).send({
        error: 'Ingress Guard URL Validation Failed',
        reason: guardCheck.reason,
      });
    }

    const jobId = `job_${uuidv4().replace(/-/g, '')}`;
    const runId = `run_${uuidv4().replace(/-/g, '')}`;

    // 2. Durable Postgres Record
    await pool.query(
      `INSERT INTO jobs (id, workspace_id, url, prompt, priority, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobId, workspaceId, url, prompt, priority, 'pending']
    );

    await pool.query(
      `INSERT INTO runs (id, job_id, status) VALUES ($1, $2, $3)`,
      [runId, jobId, 'running']
    );

    // 3. Queue to BullMQ with Domain Grouping
    const domain = extractDomain(url);
    await qaJobQueue.add(
      'execute-qa-run',
      {
        jobId,
        runId,
        url,
        prompt,
        workspaceId,
        priority,
      },
      {
        jobId,
        priority: priority === 'interactive' ? 1 : 10,
      }
    );

    return reply.status(201).send({
      success: true,
      jobId,
      runId,
      status: 'pending',
      message: 'Job submitted and queued successfully.',
    });
  });

  // GET /api/v1/jobs - List recent jobs
  fastify.get('/api/v1/jobs', async (_req: FastifyRequest, reply: FastifyReply) => {
    const { rows } = await pool.query(
      `SELECT j.*, r.id as run_id, r.status as run_status, r.taxonomy, r.fitness_score, r.total_steps
       FROM jobs j
       LEFT JOIN runs r ON j.id = r.job_id
       ORDER BY j.created_at DESC LIMIT 50`
    );
    return reply.send({ jobs: rows });
  });

  // GET /api/v1/jobs/:id - Detailed job status & steps
  fastify.get('/api/v1/jobs/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const jobRes = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
    if (jobRes.rowCount === 0) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    const job = jobRes.rows[0];
    const runsRes = await pool.query(`SELECT * FROM runs WHERE job_id = $1 ORDER BY created_at DESC`, [id]);
    const latestRun = runsRes.rows[0];

    let steps = [];
    if (latestRun) {
      const stepsRes = await pool.query(
        `SELECT * FROM step_logs WHERE run_id = $1 ORDER BY step_number ASC`,
        [latestRun.id]
      );
      steps = stepsRes.rows;
    }

    return reply.send({
      job,
      run: latestRun,
      steps,
    });
  });

  // GET /api/v1/jobs/:id/stream - SSE Stream for Live Execution Steps
  fastify.get('/api/v1/jobs/:id/stream', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    reply.raw.write(`data: ${JSON.stringify({ event: 'connected', jobId: id })}\n\n`);

    const listener = (data: any) => {
      if (data.jobId === id) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    jobEvents.on('step_update', listener);
    jobEvents.on('job_completed', listener);

    req.raw.on('close', () => {
      jobEvents.removeListener('step_update', listener);
      jobEvents.removeListener('job_completed', listener);
    });
  });
}

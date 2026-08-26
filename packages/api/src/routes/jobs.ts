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
  // Handler for creating jobs
  const handleCreateJob = async (req: FastifyRequest<{ Body: CreateJobInput }>, reply: FastifyReply) => {
    const {
      url,
      prompt,
      workspaceId = 'default',
      projectId,
      testCaseId,
      priority = 'interactive',
      maxSteps = 15,
    } = req.body || {};

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
      `INSERT INTO jobs (id, workspace_id, project_id, test_case_id, url, prompt, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [jobId, workspaceId, projectId || null, testCaseId || null, url, prompt, priority, 'pending']
    );

    await pool.query(
      `INSERT INTO runs (id, job_id, project_id, test_case_id, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [runId, jobId, projectId || null, testCaseId || null, 'running']
    );

    // If testCaseId is provided, link latest run
    if (testCaseId) {
      await pool.query(
        `UPDATE test_cases SET last_run_id = $1, status = 'in-progress', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [runId, testCaseId]
      );
    }

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
        projectId,
        testCaseId,
        priority,
        maxSteps,
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
  };

  // Register both /api/jobs and /api/v1/jobs
  fastify.post('/api/jobs', handleCreateJob);
  fastify.post('/api/v1/jobs', handleCreateJob);

  // List recent jobs
  const handleListJobs = async (req: FastifyRequest<{ Querystring: { projectId?: string } }>, reply: FastifyReply) => {
    const { projectId } = req.query || {};
    let query = `
      SELECT j.*, r.id as run_id, r.status as run_status, r.taxonomy, r.fitness_score, r.total_steps,
             r.duration_ms, r.trace_url, r.video_url, r.spec_url, r.completed_at,
             p.name as project_name, tc.title as test_case_title
      FROM jobs j
      LEFT JOIN runs r ON j.id = r.job_id
      LEFT JOIN projects p ON j.project_id = p.id
      LEFT JOIN test_cases tc ON j.test_case_id = tc.id
    `;
    const params: any[] = [];
    if (projectId) {
      query += ` WHERE j.project_id = $1`;
      params.push(projectId);
    }
    query += ` ORDER BY j.created_at DESC LIMIT 100`;

    const { rows } = await pool.query(query, params);
    return reply.send(rows);
  };

  fastify.get('/api/jobs', handleListJobs);
  fastify.get('/api/v1/jobs', handleListJobs);

  // Detailed job status & steps
  const handleGetJob = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const jobRes = await pool.query(
      `SELECT j.*, p.name as project_name, tc.title as test_case_title
       FROM jobs j
       LEFT JOIN projects p ON j.project_id = p.id
       LEFT JOIN test_cases tc ON j.test_case_id = tc.id
       WHERE j.id = $1`,
      [id]
    );
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
  };

  fastify.get('/api/jobs/:id', handleGetJob);
  fastify.get('/api/v1/jobs/:id', handleGetJob);

  // SSE Stream for Live Execution Steps
  const handleStreamJob = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
  };

  fastify.get('/api/jobs/:id/stream', handleStreamJob);
  fastify.get('/api/v1/jobs/:id/stream', handleStreamJob);

  // Get structured run memory for a job
  fastify.get('/api/jobs/:id/memory', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const runsRes = await pool.query(`SELECT id FROM runs WHERE job_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);
    if (runsRes.rowCount === 0) {
      return reply.status(404).send({ error: 'No runs found for job' });
    }
    const runId = runsRes.rows[0].id;
    const memRes = await pool.query(`SELECT * FROM run_memories WHERE run_id = $1`, [runId]);
    return reply.send({
      jobId: id,
      runId,
      memory: memRes.rows[0] || null,
    });
  });
}

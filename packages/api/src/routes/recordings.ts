import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { validateTargetUrl } from '../security/ingressGuard';
import { StartRecordingInput, FlowMatchInput } from '@universal-qa/shared';
import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const pubRedis = new Redis({ host: redisHost, port: redisPort });

// Max interactive recording concurrency per workspace (configurable)
const MAX_CONCURRENCY_PER_WORKSPACE = parseInt(
  process.env.MAX_RECORDING_CONCURRENCY_PER_WORKSPACE || '3',
  10
);

export async function recordingRoutes(fastify: FastifyInstance) {
  // 1. Start an Interactive Recording Session
  fastify.post('/api/recordings/start', async (req: FastifyRequest<{ Body: StartRecordingInput }>, reply: FastifyReply) => {
    const {
      targetUrl,
      name = 'Interactive Screen Recording',
      workspaceId = 'default',
      projectId,
      testCaseId,
      tags = [],
      authMode = 'standard',
    } = req.body || {};

    if (!targetUrl) {
      return reply.status(400).send({ error: 'Missing required field: targetUrl' });
    }

    // Ingress Guard URL Check
    const guardCheck = await validateTargetUrl(targetUrl);
    if (!guardCheck.ok) {
      return reply.status(400).send({
        error: 'Ingress Guard URL Validation Failed',
        reason: guardCheck.reason,
      });
    }

    // Check workspace concurrency limit
    const activeRes = await pool.query(
      `SELECT count(*) FROM recording_sessions WHERE workspace_id = $1 AND status = 'recording'`,
      [workspaceId]
    );
    const activeCount = parseInt(activeRes.rows[0]?.count || '0', 10);
    if (activeCount >= MAX_CONCURRENCY_PER_WORKSPACE) {
      return reply.status(429).send({
        error: 'Workspace recording concurrency limit reached',
        activeSessions: activeCount,
        maxAllowed: MAX_CONCURRENCY_PER_WORKSPACE,
      });
    }

    const sessionId = `rec_${uuidv4().replace(/-/g, '')}`;

    // Insert session into DB
    await pool.query(
      `INSERT INTO recording_sessions (
        id, workspace_id, project_id, test_case_id, name, target_url, status, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, 'recording', $7)`,
      [sessionId, workspaceId, projectId || null, testCaseId || null, name, targetUrl, tags]
    );

    // Publish event for workers or local listeners to spin up session capturer
    await pubRedis.publish(
      'recording_events',
      JSON.stringify({
        event: 'start_session_capturer',
        sessionId,
        targetUrl,
        workspaceId,
        projectId,
        authMode,
      })
    );

    return reply.status(201).send({
      sessionId,
      status: 'recording',
      targetUrl,
      name,
      message: 'Interactive recording session initiated successfully.',
    });
  });

  // 2. Client Heartbeat Ping to prevent watchdog abandonment
  fastify.post('/api/recordings/:id/heartbeat', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    await pool.query(
      `UPDATE recording_sessions SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'recording'`,
      [id]
    );
    return reply.send({ success: true, timestamp: new Date().toISOString() });
  });

  // 3. Post a Manual Checkpoint or Inferred Assertion Confirmation
  fastify.post('/api/recordings/:id/checkpoint', async (req: FastifyRequest<{
    Params: { id: string };
    Body: {
      actionType?: string;
      targetSelector: string;
      assertionRule: { type: string; expected?: string; confidence?: number };
      pageUrl: string;
      pageTitle?: string;
      systemCategory?: string;
      customTags?: string[];
    };
  }>, reply: FastifyReply) => {
    const { id } = req.params;
    const {
      targetSelector,
      assertionRule,
      pageUrl,
      pageTitle = '',
      systemCategory = 'assertion',
      customTags = [],
    } = req.body || {};

    const stepId = `step_${uuidv4().replace(/-/g, '')}`;
    const stepCountRes = await pool.query(
      `SELECT count(*) FROM recorded_steps WHERE session_id = $1`,
      [id]
    );
    const nextStepNum = parseInt(stepCountRes.rows[0]?.count || '0', 10) + 1;

    await pool.query(
      `INSERT INTO recorded_steps (
        id, session_id, step_number, action_type, target_selector, selector_type,
        page_url, page_title, system_category, custom_tags, is_assertion, assertion_rule
      ) VALUES ($1, $2, $3, 'assert', $4, 'aria', $5, $6, $7, $8, true, $9)`,
      [
        stepId,
        id,
        nextStepNum,
        targetSelector,
        pageUrl,
        pageTitle,
        systemCategory,
        customTags,
        JSON.stringify(assertionRule),
      ]
    );

    await pool.query(
      `UPDATE recording_sessions SET step_count = $1, last_heartbeat = CURRENT_TIMESTAMP WHERE id = $2`,
      [nextStepNum, id]
    );

    return reply.send({ success: true, stepId, stepNumber: nextStepNum });
  });

  // 4. Ingest Event Directly (From Web Extension or Studio DOM Bridge)
  fastify.post('/api/recordings/:id/event', async (req: FastifyRequest<{
    Params: { id: string };
    Body: {
      actionType: string;
      targetSelector: string;
      selectorType?: string;
      inputValue?: string;
      isSensitive?: boolean;
      pageUrl: string;
      pageTitle?: string;
      systemCategory?: string;
      customTags?: string[];
      isAssertion?: boolean;
      assertionRule?: any;
    };
  }>, reply: FastifyReply) => {
    const { id } = req.params;
    const {
      actionType,
      targetSelector,
      selectorType = 'aria',
      inputValue,
      isSensitive = false,
      pageUrl,
      pageTitle = '',
      systemCategory = 'action_trigger',
      customTags = [],
      isAssertion = false,
      assertionRule,
    } = req.body || {};

    const stepId = `step_${uuidv4().replace(/-/g, '')}`;
    const stepCountRes = await pool.query(
      `SELECT count(*) FROM recorded_steps WHERE session_id = $1`,
      [id]
    );
    const nextStepNum = parseInt(stepCountRes.rows[0]?.count || '0', 10) + 1;

    await pool.query(
      `INSERT INTO recorded_steps (
        id, session_id, step_number, action_type, target_selector, selector_type,
        input_value, is_sensitive, page_url, page_title, system_category,
        custom_tags, is_assertion, assertion_rule
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        stepId,
        id,
        nextStepNum,
        actionType,
        targetSelector,
        selectorType,
        inputValue || null,
        isSensitive,
        pageUrl,
        pageTitle,
        systemCategory,
        customTags,
        isAssertion,
        assertionRule ? JSON.stringify(assertionRule) : null,
      ]
    );

    await pool.query(
      `UPDATE recording_sessions SET step_count = $1, last_heartbeat = CURRENT_TIMESTAMP WHERE id = $2`,
      [nextStepNum, id]
    );

    return reply.send({ success: true, stepId, stepNumber: nextStepNum });
  });

  // 5. Stop Recording and Trigger Post-Processing
  fastify.post('/api/recordings/:id/stop', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;

    await pool.query(
      `UPDATE recording_sessions SET status = 'processing', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await pubRedis.publish(
      'recording_events',
      JSON.stringify({
        event: 'stop_session_capturer',
        sessionId: id,
      })
    );

    return reply.send({
      sessionId: id,
      status: 'processing',
      message: 'Recording stopped. Processing artifacts and synthesizing test spec.',
    });
  });

  // 6. List Recording Sessions
  fastify.get('/api/recordings', async (req: FastifyRequest<{
    Querystring: {
      projectId?: string;
      status?: string;
      page?: string;
      limit?: string;
    };
  }>, reply: FastifyReply) => {
    const { projectId, status, page = '1', limit = '20' } = req.query || {};
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions: string[] = [];
    const values: any[] = [];

    if (projectId && projectId !== 'all') {
      values.push(projectId);
      conditions.push(`project_id = $${values.length}`);
    }
    if (status && status !== 'all') {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT count(*) FROM recording_sessions ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    values.push(parseInt(limit, 10), offset);
    const rowsRes = await pool.query(
      `SELECT r.*, p.name as project_name
       FROM recording_sessions r
       LEFT JOIN projects p ON r.project_id = p.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return reply.send({
      items: rowsRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  });

  // 7. Get Single Recording Session Details & Steps
  fastify.get('/api/recordings/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;

    const sessionRes = await pool.query(
      `SELECT r.*, p.name as project_name
       FROM recording_sessions r
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Recording session not found' });
    }

    const stepsRes = await pool.query(
      `SELECT * FROM recorded_steps WHERE session_id = $1 ORDER BY step_number ASC`,
      [id]
    );

    return reply.send({
      session: sessionRes.rows[0],
      steps: stepsRes.rows,
    });
  });

  // 7b. Real-time SSE Stream for Live Step Telemetry
  fastify.get('/api/recordings/:id/stream', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const redisSub = new Redis({ host: redisHost, port: redisPort });
    await redisSub.subscribe('recording_events');

    const onMessage = (channel: string, message: string) => {
      if (channel === 'recording_events') {
        try {
          const data = JSON.parse(message);
          if (data.sessionId === id) {
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
          }
        } catch (e) {}
      }
    };

    redisSub.on('message', onMessage);

    req.raw.on('close', () => {
      redisSub.unsubscribe('recording_events').catch(() => {});
      redisSub.quit().catch(() => {});
    });
  });

  // 8. Human Catalog Browse for Reusable Flow Blocks
  fastify.get('/api/recordings/flows', async (req: FastifyRequest<{
    Querystring: {
      projectId?: string;
      category?: string;
      tag?: string;
      validationStatus?: string;
      page?: string;
      limit?: string;
      search?: string;
    };
  }>, reply: FastifyReply) => {
    const { projectId, category, tag, validationStatus, page = '1', limit = '15', search } = req.query || {};
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions: string[] = [];
    const values: any[] = [];

    if (projectId && projectId !== 'all') {
      values.push(projectId);
      conditions.push(`project_id = $${values.length}`);
    }
    if (category && category !== 'all') {
      values.push(category);
      conditions.push(`system_category = $${values.length}`);
    }
    if (validationStatus && validationStatus !== 'all') {
      values.push(validationStatus);
      conditions.push(`validation_status = $${values.length}`);
    }
    if (tag) {
      values.push(`%${tag}%`);
      conditions.push(`$${values.length} = ANY(tags)`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT count(*) FROM flow_blocks ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    values.push(parseInt(limit, 10), offset);
    const rowsRes = await pool.query(
      `SELECT * FROM flow_blocks
       ${whereClause}
       ORDER BY success_rate DESC, last_contract_validated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return reply.send({
      items: rowsRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  });

  // 9. Autonomous Agent Target Match Query
  fastify.post('/api/recordings/flows/match', async (req: FastifyRequest<{ Body: FlowMatchInput }>, reply: FastifyReply) => {
    const { tags = [], workspaceId = 'default', projectId } = req.body || {};

    if (tags.length === 0) {
      return reply.send({ match: null, matchScore: 0, fallbackRequired: true, reason: 'No query tags provided' });
    }

    // Rank matching flow blocks by composite formula:
    // (Tag match proportion * 0.5) + (Success rate / 100 * 0.3) + (Freshness decay * 0.2)
    const matchQuery = `
      SELECT fb.*,
        (
          ((SELECT count(*) FROM unnest(fb.tags) t WHERE t = ANY($1::text[]))::float / GREATEST(array_length($1::text[], 1), 1)) * 0.5 +
          (fb.success_rate / 100.0) * 0.3 +
          (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - fb.last_contract_validated_at)) / 604800.0)) * 0.2
        ) as composite_rank
      FROM flow_blocks fb
      WHERE fb.workspace_id = $2
        AND fb.validation_status IN ('valid', 'degraded')
        AND fb.tags && $1::text[]
      ORDER BY composite_rank DESC
      LIMIT 1;
    `;

    const res = await pool.query(matchQuery, [tags, workspaceId]);

    if (res.rows.length === 0) {
      return reply.send({
        match: null,
        matchScore: 0,
        fallbackRequired: true,
        reason: 'No matching flow block found with valid status.',
      });
    }

    const best = res.rows[0];
    const score = parseFloat(best.composite_rank || '0');
    // Threshold validation: requires matchScore >= 0.55 and non-stale status
    const isPassing = score >= 0.55 && best.validation_status !== 'stale';

    if (isPassing) {
      // Record replay usage
      await pool.query(
        `UPDATE flow_blocks SET run_count = run_count + 1, last_replayed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [best.id]
      );
    }

    return reply.send({
      match: isPassing ? best : null,
      matchScore: Math.round(score * 100) / 100,
      fallbackRequired: !isPassing,
      reason: isPassing ? undefined : `Match score ${score.toFixed(2)} is below threshold (0.55)`,
    });
  });

  // 10. Tag Registry Autocomplete
  fastify.get('/api/recordings/tags', async (req: FastifyRequest<{ Querystring: { q?: string; workspaceId?: string } }>, reply: FastifyReply) => {
    const { q = '', workspaceId = 'default' } = req.query || {};
    const res = await pool.query(
      `SELECT * FROM tag_registry
       WHERE workspace_id = $1 AND (slug ILIKE $2 OR display_name ILIKE $2)
       ORDER BY usage_count DESC
       LIMIT 15`,
      [workspaceId, `%${q}%`]
    );
    return reply.send({ items: res.rows });
  });

  // 11. Promote Session to Permanent Test Case & Link Memory
  fastify.post('/api/recordings/:id/save-to-test-case', async (req: FastifyRequest<{
    Params: { id: string };
    Body: { title?: string; projectId?: string; suiteId?: string; description?: string };
  }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { title, projectId, suiteId, description } = req.body || {};

    const sessionRes = await pool.query(`SELECT * FROM recording_sessions WHERE id = $1`, [id]);
    if (sessionRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    const session = sessionRes.rows[0];

    const stepsRes = await pool.query(
      `SELECT * FROM recorded_steps WHERE session_id = $1 ORDER BY step_number ASC`,
      [id]
    );

    const testCaseId = `tc_${uuidv4().replace(/-/g, '')}`;
    const testCaseTitle = title || session.name || 'Recorded Golden Path Flow';

    await pool.query(
      `INSERT INTO test_cases (
        id, project_id, suite_id, title, description, test_type, status, is_automated,
        target_url, prompt, steps
      ) VALUES ($1, $2, $3, $4, $5, 'automated', 'ready', true, $6, $7, $8)`,
      [
        testCaseId,
        projectId || session.project_id || null,
        suiteId || null,
        testCaseTitle,
        description || `Auto-synthesized test case from recording session ${id}.`,
        session.target_url,
        `Execute recorded flow: ${testCaseTitle}`,
        JSON.stringify(stepsRes.rows),
      ]
    );

    // Link test case id to session
    await pool.query(`UPDATE recording_sessions SET test_case_id = $1 WHERE id = $2`, [testCaseId, id]);

    return reply.send({
      testCaseId,
      message: 'Recording session successfully saved as a verified automated Test Case.',
    });
  });
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { validateTargetUrl } from '../security/ingressGuard';
import { qaJobQueue, extractDomain } from '../queue';
import { CreateTemplateInput } from '@universal-qa/shared';

export async function templateRoutes(fastify: FastifyInstance) {
  // POST /api/v1/templates - Create a new saved test template
  fastify.post('/api/v1/templates', async (req: FastifyRequest<{ Body: CreateTemplateInput }>, reply: FastifyReply) => {
    const { name, description, url, prompt, workspaceId = 'default', tags = ['smoke-test'], stages } = req.body || {};

    if (!name || !url || !prompt) {
      return reply.status(400).send({ error: 'Missing required fields: name, url, and prompt' });
    }

    const templateId = `tmpl_${uuidv4().replace(/-/g, '')}`;

    await pool.query(
      `INSERT INTO test_templates (id, workspace_id, name, description, url, prompt, stages, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        templateId,
        workspaceId,
        name,
        description || null,
        url,
        prompt,
        JSON.stringify(stages || []),
        tags,
      ]
    );

    return reply.status(201).send({
      success: true,
      templateId,
      message: 'Test template created successfully.',
    });
  });

  // GET /api/v1/templates - List all test templates
  fastify.get('/api/v1/templates', async (_req: FastifyRequest, reply: FastifyReply) => {
    const { rows } = await pool.query(
      `SELECT * FROM test_templates ORDER BY created_at DESC LIMIT 100`
    );
    return reply.send({ templates: rows });
  });

  // GET /api/v1/templates/:id - Get a specific test template
  fastify.get('/api/v1/templates/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { rows } = await pool.query(`SELECT * FROM test_templates WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Test template not found' });
    }
    return reply.send({ template: rows[0] });
  });

  // POST /api/v1/templates/:id/run - Execute a job from a saved test template
  fastify.post('/api/v1/templates/:id/run', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { rows } = await pool.query(`SELECT * FROM test_templates WHERE id = $1`, [id]);

    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Test template not found' });
    }

    const template = rows[0];
    const guardCheck = await validateTargetUrl(template.url);
    if (!guardCheck.ok) {
      return reply.status(400).send({
        error: 'Ingress Guard URL Validation Failed',
        reason: guardCheck.reason,
      });
    }

    const jobId = `job_${uuidv4().replace(/-/g, '')}`;
    const runId = `run_${uuidv4().replace(/-/g, '')}`;

    await pool.query(
      `INSERT INTO jobs (id, workspace_id, url, prompt, priority, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobId, template.workspace_id, template.url, template.prompt, 'interactive', 'pending']
    );

    await pool.query(
      `INSERT INTO runs (id, job_id, status) VALUES ($1, $2, $3)`,
      [runId, jobId, 'running']
    );

    await qaJobQueue.add(
      'execute-qa-run',
      {
        jobId,
        runId,
        url: template.url,
        prompt: template.prompt,
        workspaceId: template.workspace_id,
        priority: 'interactive',
      },
      {
        jobId,
        priority: 1,
      }
    );

    return reply.status(201).send({
      success: true,
      jobId,
      runId,
      templateId: template.id,
      message: `QA Job triggered from template '${template.name}'.`,
    });
  });

  // DELETE /api/v1/templates/:id - Delete a test template
  fastify.delete('/api/v1/templates/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    await pool.query(`DELETE FROM test_templates WHERE id = $1`, [id]);
    return reply.send({ success: true, message: 'Test template deleted successfully' });
  });
}

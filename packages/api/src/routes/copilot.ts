import { FastifyInstance } from 'fastify';
import { AIService } from '../services/aiService';

export async function copilotRoutes(fastify: FastifyInstance) {
  // Analyze requirement clarity
  fastify.post('/api/copilot/clarity-analysis', async (request, reply) => {
    const { title, description } = request.body as { title: string; description?: string };
    if (!title) {
      return reply.status(400).send({ error: 'Title is required for clarity analysis' });
    }

    const analysis = await AIService.analyzeRequirementClarity(title, description || '');
    return reply.send(analysis);
  });

  // Generate test scenarios
  fastify.post('/api/copilot/generate-scenarios', async (request, reply) => {
    const { title, description } = request.body as { title: string; description?: string };
    if (!title) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    const analysis = await AIService.analyzeRequirementClarity(title, description || '');
    return reply.send({
      scenarios: analysis.suggestedTestScenarios,
      suggestedAcceptanceCriteria: analysis.suggestedAcceptanceCriteria,
    });
  });

  // Root cause classification for defects
  fastify.post('/api/copilot/defect-root-cause', async (request, reply) => {
    const { title, failureReason, stepAction } = request.body as {
      title: string;
      failureReason: string;
      stepAction?: string;
    };

    const analysis = await AIService.analyzeDefectRootCause(title, failureReason, stepAction);
    return reply.send(analysis);
  });

  // VeriBot QA Assistant Q&A Chat Endpoint
  fastify.post('/api/copilot/chat', async (request, reply) => {
    const { message, sessionId } = request.body as { message: string; sessionId?: string };
    if (!message) {
      return reply.status(400).send({ error: 'Message is required' });
    }

    const { pool } = require('../db');
    const client = await pool.connect();
    try {
      const [projRes, tcRes, defRes, relRes, reqRes] = await Promise.all([
        client.query(`SELECT id, name, status, health_score, quality_coverage FROM projects LIMIT 10`),
        client.query(`SELECT COUNT(*)::int as count FROM test_cases`),
        client.query(`SELECT id, title, severity, status FROM defects WHERE status != 'resolved' LIMIT 10`),
        client.query(`SELECT id, version, status, readiness_score, recommendation FROM releases LIMIT 5`),
        client.query(`SELECT COUNT(*)::int as count FROM requirements`),
      ]);

      const contextData = {
        platform: 'VeriShip Quality Intelligence & Governance Platform v2',
        projectsCount: projRes.rows.length,
        projects: projRes.rows,
        testCasesCount: tcRes.rows[0]?.count || 0,
        requirementsCount: reqRes.rows[0]?.count || 0,
        openDefectsCount: defRes.rows.length,
        openDefects: defRes.rows,
        recentReleases: relRes.rows,
      };

      const response = await AIService.chatWithQAAssistant(message, contextData);
      return reply.send({
        output: response,
        response,
        sessionId,
      });
    } finally {
      client.release();
    }
  });
}

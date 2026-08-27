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

  // Get AI Insights (dynamic and database-backed)
  fastify.get('/api/copilot/insights', async (request, reply) => {
    const { pool } = require('../db');
    const client = await pool.connect();
    try {
      const insights: Array<{
        id: string;
        type: 'warning' | 'suggestion' | 'info';
        title: string;
        description: string;
        action?: string;
        project: string;
      }> = [];

      // Query projects, defects, requirements, and recent runs
      const [projRes, defRes, reqRes, runRes, savedInsights] = await Promise.all([
        client.query(`SELECT id, name, status, health_score, quality_coverage FROM projects LIMIT 5`),
        client.query(`SELECT d.id, d.title, d.severity, d.status, p.name as project_name FROM defects d LEFT JOIN projects p ON d.project_id = p.id WHERE d.status != 'resolved' ORDER BY d.created_at DESC LIMIT 5`),
        client.query(`SELECT r.id, r.title, r.clarity_score, p.name as project_name FROM requirements r LEFT JOIN projects p ON r.project_id = p.id WHERE r.clarity_score IS NOT NULL AND r.clarity_score < 80 LIMIT 5`),
        client.query(`SELECT r.id, r.taxonomy, r.fitness_score, p.name as project_name FROM runs r LEFT JOIN projects p ON r.project_id = p.id ORDER BY r.created_at DESC LIMIT 5`),
        client.query(`SELECT qi.id, qi.category, qi.title, qi.description, qi.actionable_recommendation, p.name as project_name FROM qa_insights qi LEFT JOIN projects p ON qi.project_id = p.id ORDER BY qi.created_at DESC LIMIT 5`),
      ]);

      // 1. Saved insights from DB
      for (const row of savedInsights.rows) {
        insights.push({
          id: row.id,
          type: row.category === 'risk' ? 'warning' : row.category === 'suggestion' ? 'suggestion' : 'info',
          title: row.title,
          description: row.description,
          action: row.actionable_recommendation || 'View Insight',
          project: row.project_name || 'General',
        });
      }

      // 2. Defect-driven real-time insights
      const criticalDefects = defRes.rows.filter((d: any) => d.severity === 'critical' || d.severity === 'high');
      if (criticalDefects.length > 0) {
        insights.push({
          id: `insight_def_${Date.now()}_1`,
          type: 'warning',
          title: `${criticalDefects.length} High-Severity Defect(s) Active`,
          description: `Unresolved defects with high impact were detected on ${criticalDefects[0].project_name || 'active projects'}. Root cause analysis and mitigation recommended prior to release gate.`,
          action: 'Review Defects',
          project: criticalDefects[0].project_name || 'Quality Governance',
        });
      }

      // 3. Requirement clarity & ambiguity insights
      if (reqRes.rows.length > 0) {
        insights.push({
          id: `insight_req_${Date.now()}_2`,
          type: 'suggestion',
          title: 'Ambiguous Acceptance Criteria Detected',
          description: `Requirement "${reqRes.rows[0].title}" has a clarity score of ${reqRes.rows[0].clarity_score}%. AI Copilot recommends adding boundary test scenarios.`,
          action: 'Review Requirements',
          project: reqRes.rows[0].project_name || 'Requirement QA',
        });
      }

      // 4. Test run regression / pass rate insights
      const defectRuns = runRes.rows.filter((r: any) => r.taxonomy === 'APP_DEFECT');
      if (defectRuns.length > 0) {
        insights.push({
          id: `insight_run_${Date.now()}_3`,
          type: 'warning',
          title: 'Autonomous Verification Regressions',
          description: `Playwright agent encountered element assertion failure during automated validation on ${defectRuns[0].project_name || 'target app'}. Trace logs available.`,
          action: 'Inspect Runs',
          project: defectRuns[0].project_name || 'Automated Testing',
        });
      }

      // 5. Default baseline AI insights if fresh workspace
      if (insights.length === 0) {
        insights.push(
          {
            id: 'insight_default_1',
            type: 'suggestion',
            title: 'Automated Test Coverage Opportunity',
            description: 'Synthesize end-to-end Playwright tests directly from user story requirements to establish continuous release gate baselines.',
            action: 'Generate Tests',
            project: projRes.rows[0]?.name || 'VeriShip Workspace',
          },
          {
            id: 'insight_default_2',
            type: 'info',
            title: 'Autonomous Quality Gate Ready',
            description: 'Multi-provider AI adapter (Groq / OpenRouter) is active for DOM accessibility tree traversal and self-healing selector assertions.',
            action: 'Launch Verification',
            project: projRes.rows[0]?.name || 'Quality Governance',
          },
          {
            id: 'insight_default_3',
            type: 'warning',
            title: 'Verify Preflight Check Latency',
            description: 'Ensure target web endpoints provide HTTP status 200 within 5000ms to maintain optimal autonomous test execution speed.',
            action: 'Review Settings',
            project: projRes.rows[0]?.name || 'Infrastructure',
          }
        );
      }

      return reply.send(insights);
    } finally {
      client.release();
    }
  });

  // Apply or save an AI Insight
  fastify.post('/api/copilot/apply-insight', async (request, reply) => {
    const { id, title, description, project, type, action } = (request.body as any) || {};
    const { pool } = require('../db');
    const client = await pool.connect();
    try {
      const insightId = id || `insight_${Date.now()}`;
      let projectId: string | null = null;
      if (project) {
        const pRes = await client.query(`SELECT id FROM projects WHERE name = $1 LIMIT 1`, [project]);
        projectId = pRes.rows[0]?.id || null;
      }

      await client.query(
        `INSERT INTO qa_insights (id, project_id, category, title, description, actionable_recommendation)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET title = $4, description = $5, actionable_recommendation = $6`,
        [insightId, projectId, type || 'suggestion', title || 'QA Insight', description || '', action || null]
      );

      return reply.send({ success: true, id: insightId });
    } finally {
      client.release();
    }
  });
}

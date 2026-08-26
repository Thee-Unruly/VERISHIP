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
}

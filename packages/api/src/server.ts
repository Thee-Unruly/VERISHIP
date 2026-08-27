import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { metricRoutes } from './routes/metrics';
import { jobRoutes } from './routes/jobs';
import { templateRoutes } from './routes/templates';
import { projectRoutes } from './routes/projects';
import { requirementRoutes } from './routes/requirements';
import { testCaseRoutes } from './routes/testCases';
import { defectRoutes } from './routes/defects';
import { releaseRoutes } from './routes/releases';
import { copilotRoutes } from './routes/copilot';
import { serviceAccountRoutes } from './routes/serviceAccounts';
import { loadTestingRoutes } from './routes/loadTesting';

dotenv.config();

const fastify = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
});

fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    if (!body || (typeof body === 'string' && body.trim() === '')) {
      return done(null, {});
    }
    const json = JSON.parse(body as string);
    return done(null, json);
  } catch (err: any) {
    return done(err, undefined);
  }
});

const PORT = parseInt(process.env.PORT || '4000', 10);

async function start() {
  try {
    await fastify.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });

    await initDb();
    
    // Register Unified VeriShip Governance & Execution Routes
    await fastify.register(authRoutes);
    await fastify.register(userRoutes);
    await fastify.register(metricRoutes);
    await fastify.register(projectRoutes);
    await fastify.register(requirementRoutes);
    await fastify.register(testCaseRoutes);
    await fastify.register(defectRoutes);
    await fastify.register(releaseRoutes);
    await fastify.register(copilotRoutes);
    await fastify.register(serviceAccountRoutes);
    await fastify.register(jobRoutes);
    await fastify.register(templateRoutes);
    await fastify.register(loadTestingRoutes);

    fastify.get('/health', async () => {
      return {
        status: 'ok',
        service: 'VeriShip Quality Governance & Autonomous QA Platform v2',
        timestamp: new Date().toISOString(),
      };
    });

    fastify.get('/api/notifications', async (req, reply) => {
      return reply.send([
        {
          id: 'notif_1',
          type: 'insight',
          title: 'Quality Gate Ready',
          description: 'Autonomous QA suite passed with 98.4% fitness score',
          timestamp: new Date().toISOString(),
          link: '/playwright',
        },
      ]);
    });

    // Custom route to serve Playwright screenshots, traces, spec files, and webm session videos
    fastify.get('/artifacts/*', async (req, reply) => {
      const path = require('path');
      const fs = require('fs');
      const paramPath = (req.params as any)['*'];
      
      const localPaths = [
        path.join(process.cwd(), 'artifacts', paramPath),
        path.join(process.cwd(), 'packages/worker/artifacts', paramPath),
        path.join(process.cwd(), 'packages/api/artifacts', paramPath)
      ];

      for (const filePath of localPaths) {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const mime = filePath.endsWith('.png') ? 'image/png' 
                     : filePath.endsWith('.webm') ? 'video/webm' 
                     : filePath.endsWith('.ts') ? 'text/plain; charset=utf-8'
                     : filePath.endsWith('.zip') ? 'application/zip'
                     : 'application/octet-stream';
          reply.header('Content-Type', mime);
          return reply.send(fs.createReadStream(filePath));
        }
      }

      return reply.status(404).send({ error: 'Artifact file not found' });
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[VeriShip API Gateway] Listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

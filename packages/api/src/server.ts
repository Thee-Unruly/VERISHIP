import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import { jobRoutes } from './routes/jobs';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '4000', 10);

async function start() {
  try {
    await fastify.register(cors, {
      origin: '*',
    });

    await initDb();
    await fastify.register(jobRoutes);

    fastify.get('/health', async () => {
      return { status: 'ok', service: 'Universal Web Agent QA API Gateway v2' };
    });

    // Custom route to serve Playwright screenshots, traces, and webm session videos
    fastify.get('/artifacts/*', async (req, reply) => {
      const path = require('path');
      const fs = require('fs');
      const paramPath = (req.params as any)['*'];
      
      // Ensure we look at worker directory artifacts first or API directory artifacts
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
                     : 'application/octet-stream';
          reply.header('Content-Type', mime);
          return reply.send(fs.createReadStream(filePath));
        }
      }

      return reply.status(404).send({ error: 'Artifact file not found' });
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[API Gateway] Listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

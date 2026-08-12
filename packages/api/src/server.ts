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

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[API Gateway] Listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { initDb, pool } from './db';
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
import { recordingRoutes } from './routes/recordings';

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
    await fastify.register(recordingRoutes);

    fastify.get('/health', async () => {
      return {
        status: 'ok',
        service: 'VeriShip Quality Governance & Autonomous QA Platform v2',
        timestamp: new Date().toISOString(),
      };
    });

    fastify.get('/api/notifications', async (req, reply) => {
      try {
        const notifs: any[] = [];

        // 1. Recent Autonomous Runs (passed/failed)
        try {
          const { rows: runRows } = await pool.query(`
            SELECT r.id, r.job_id, r.status, r.fitness_score, r.taxonomy, r.created_at, j.url, j.prompt
            FROM runs r
            LEFT JOIN jobs j ON r.job_id = j.id
            ORDER BY r.created_at DESC
            LIMIT 4
          `);
          for (const r of runRows) {
            const isPassed = r.status === 'passed' || r.taxonomy === 'PASSED';
            notifs.push({
              id: `run_${r.id}`,
              type: isPassed ? 'insight' : 'defect',
              title: isPassed ? 'Autonomous QA Suite Passed' : 'Autonomous Test Run Failed',
              description: r.prompt ? `${r.prompt.slice(0, 75)}...` : `Fitness Score: ${r.fitness_score || 0}%`,
              timestamp: r.created_at,
              link: '/playwright',
            });
          }
        } catch (err) {
          // ignore
        }

        // 2. Recent Logged Defects
        try {
          const { rows: defectRows } = await pool.query(`
            SELECT id, title, severity, status, created_at
            FROM defects
            ORDER BY created_at DESC
            LIMIT 4
          `);
          for (const d of defectRows) {
            notifs.push({
              id: `defect_${d.id}`,
              type: 'defect',
              title: `Defect: ${d.title}`,
              description: `Severity: ${d.severity} • Status: ${d.status}`,
              timestamp: d.created_at,
              link: '/defects',
            });
          }
        } catch (err) {
          // ignore
        }

        // 3. Recent Releases
        try {
          const { rows: relRows } = await pool.query(`
            SELECT id, name, version, status, created_at
            FROM releases
            ORDER BY created_at DESC
            LIMIT 3
          `);
          for (const rel of relRows) {
            notifs.push({
              id: `rel_${rel.id}`,
              type: 'release',
              title: `Release ${rel.name} (${rel.version})`,
              description: `Status: ${rel.status}`,
              timestamp: rel.created_at,
              link: '/releases',
            });
          }
        } catch (err) {
          // ignore
        }

        // Sort combined notifications by timestamp descending
        notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (notifs.length === 0) {
          notifs.push({
            id: 'notif_welcome',
            type: 'insight',
            title: 'Quality Gate Ready',
            description: 'Platform active and ready for autonomous test execution',
            timestamp: new Date().toISOString(),
            link: '/playwright',
          });
        }

        return reply.send(notifs.slice(0, 8));
      } catch (e) {
        return reply.send([]);
      }
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

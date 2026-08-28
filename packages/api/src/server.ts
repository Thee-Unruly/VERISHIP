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

    // Universal In-Browser Step Recording Probe Script
    fastify.get('/recorder-probe.js', async (req, reply) => {
      reply.header('Content-Type', 'application/javascript');
      reply.header('Access-Control-Allow-Origin', '*');
      return `
(function() {
  if (window.__VERISHIP_RECORDER_ACTIVE__) return;
  window.__VERISHIP_RECORDER_ACTIVE__ = true;

  const params = new URLSearchParams(window.location.search);
  const sessionId = window.__VERISHIP_SESSION__ || params.get('veriship_session') || localStorage.getItem('veriship_session');
  const apiUrl = window.__VERISHIP_API__ || 'http://localhost:4000';

  if (!sessionId) {
    console.warn('[VeriShip Recorder] No active session ID found. Set window.__VERISHIP_SESSION__ or pass ?veriship_session=...');
    return;
  }

  // Floating recorder pill UI
  const hud = document.createElement('div');
  hud.id = 'veriship-recorder-hud';
  hud.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999999;background:rgba(15,23,42,0.95);color:#fff;border:1px solid rgba(239,68,68,0.5);border-radius:14px;padding:10px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;box-shadow:0 12px 30px rgba(0,0,0,0.6);display:flex;align-items:center;gap:12px;backdrop-filter:blur(10px);';
  hud.innerHTML = \`
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 10px #ef4444;"></span>
    <div>
      <div style="font-weight:700;color:#f87171;font-size:12px;">VeriShip Live Capturer Active</div>
      <div style="color:#94a3b8;font-size:11px;">Recorded Steps: <b id="veriship-step-count" style="color:#fff;">0</b></div>
    </div>
    <button id="veriship-stop-btn" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px;">Finish & Synthesize</button>
  \`;
  document.body.appendChild(hud);

  let count = 0;

  function sendEvent(actionType, targetSelector, inputValue, isSensitive, category) {
    count++;
    const badge = document.getElementById('veriship-step-count');
    if (badge) badge.innerText = count;

    fetch(\`\${apiUrl}/api/recordings/\${sessionId}/event\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType,
        targetSelector,
        inputValue: isSensitive ? '[REDACTED:PASSWORD]' : inputValue,
        isSensitive,
        pageUrl: window.location.href,
        pageTitle: document.title,
        systemCategory: category || 'action_trigger'
      })
    }).catch(e => console.error('[VeriShip Probe Error]:', e));
  }

  function getSelector(el) {
    const aria = el.getAttribute('aria-label');
    if (aria) return "page.getByLabel('" + aria.replace(/'/g, "\\\\'") + "')";
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return "page.getByPlaceholder('" + placeholder.replace(/'/g, "\\\\'") + "')";
    const testId = el.getAttribute('data-testid');
    if (testId) return "page.getByTestId('" + testId.replace(/'/g, "\\\\'") + "')";
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    const text = el.innerText?.trim()?.slice(0, 40);
    if (text && (role === 'button' || role === 'link' || role === 'tab' || role === 'a' || el.tagName === 'BUTTON' || el.tagName === 'A')) {
      const mappedRole = (role === 'a' || el.tagName === 'A') ? 'link' : (role === 'button' || el.tagName === 'BUTTON') ? 'button' : role;
      return "page.getByRole('" + mappedRole + "', { name: '" + text.replace(/'/g, "\\\\'") + "' })";
    }
    if (el.id) return "page.locator('#" + el.id + "')";
    if (el.name) return "page.locator('[name=\\"" + el.name + "\\"]')'";
    return "page.locator('" + el.tagName.toLowerCase() + "')";
  }

  // Intercept Clicks
  document.addEventListener('click', function(e) {
    const target = e.target;
    if (!target || target.closest('#veriship-recorder-hud')) return;
    const selector = getSelector(target);
    sendEvent('click', selector, undefined, false, 'click');
  }, true);

  // Intercept Inputs
  let debounceTimeout = null;
  document.addEventListener('input', function(e) {
    const target = e.target;
    if (!target || target.closest('#veriship-recorder-hud')) return;
    const isSensitive = target.type === 'password' || /password|secret|token/i.test(target.name || target.id || '');
    const selector = getSelector(target);
    const value = target.value;

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(function() {
      sendEvent('fill', selector, value, isSensitive, 'form_fill');
    }, 350);
  }, true);

  // Stop button handler
  document.getElementById('veriship-stop-btn')?.addEventListener('click', async function() {
    await fetch(\`\${apiUrl}/api/recordings/\${sessionId}/stop\`, { method: 'POST' });
    hud.innerHTML = '<div style="color:#10b981;font-weight:700;">✓ Recording Saved! Return to VeriShip Studio.</div>';
  });

  console.log('[VeriShip Recorder] Hooked live capture to session ' + sessionId);
})();
      `;
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://demo.playwright.dev/todomvc');
  const [prompt, setPrompt] = useState('Add two todos: "Buy groceries" and "Ship VeriShip QA", then mark the first as completed and assert 1 item remains active.');
  const [priority, setPriority] = useState('interactive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // Platform Metrics State
  const [stats, setStats] = useState({
    totalRuns: 0,
    passed: 0,
    defects: 0,
    projectsCount: 0,
    openDefects: 0,
  });

  const fetchOverviewData = async () => {
    try {
      const [jobsRes, prjRes, defRes] = await Promise.all([
        fetch('http://localhost:4000/api/jobs').catch(() => null),
        fetch('http://localhost:4000/api/projects').catch(() => null),
        fetch('http://localhost:4000/api/defects?status=open').catch(() => null),
      ]);

      let jobs = [];
      if (jobsRes && jobsRes.ok) {
        const data = await jobsRes.json();
        jobs = data.jobs || [];
        setRecentJobs(jobs);
      }

      let projectsCount = 0;
      if (prjRes && prjRes.ok) {
        const prjData = await prjRes.json();
        projectsCount = prjData.length;
      }

      let openDefects = 0;
      if (defRes && defRes.ok) {
        const defData = await defRes.json();
        openDefects = defData.length;
      }

      let passed = 0;
      let defects = 0;
      jobs.forEach((j: any) => {
        if (j.taxonomy === 'PASSED' || j.taxonomy === 'RECOVERED') passed++;
        else if (j.taxonomy === 'APP_DEFECT' || j.taxonomy === 'INFRA_ERROR') defects++;
      });

      setStats({
        totalRuns: jobs.length,
        passed,
        defects,
        projectsCount,
        openDefects,
      });
    } catch {
      // Backend offline
    }
  };

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePresetSelect = (presetUrl: string, presetPrompt: string) => {
    setUrl(presetUrl);
    setPrompt(presetPrompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt, priority }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.reason || data.error || 'Failed to submit QA job');
      }

      router.push(`/runs/${data.jobId}`);
    } catch (err: any) {
      setError(err?.message || 'Error communicating with API Gateway');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="glow-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIVE PROJECTS</span>
            <span style={{ fontSize: '1.2rem' }}>📁</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>{stats.projectsCount}</span>
        </div>

        <div className="glow-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>AGENT RUNS</span>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.totalRuns}</span>
        </div>

        <div className="glow-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>VERIFIED PASSES</span>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1 }}>{stats.passed}</span>
        </div>

        <div className="glow-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>OPEN DEFECTS</span>
            <span style={{ fontSize: '1.2rem' }}>🐛</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: stats.openDefects > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', lineHeight: 1 }}>
            {stats.openDefects}
          </span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <a href="/projects" style={{ textDecoration: 'none' }} className="glow-card">
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📁</div>
          <h4 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>Project Governance</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Track coverage & release dates.</p>
        </a>

        <a href="/requirements" style={{ textDecoration: 'none' }} className="glow-card">
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🧠</div>
          <h4 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>Copilot QA</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Requirement clarity scoring (0-100).</p>
        </a>

        <a href="/test-cases" style={{ textDecoration: 'none' }} className="glow-card">
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🧪</div>
          <h4 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>Test Repository</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Automated & manual test suites.</p>
        </a>

        <a href="/defects" style={{ textDecoration: 'none' }} className="glow-card">
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🐛</div>
          <h4 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>Defect Hub</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>AI root-cause & fix suggestions.</p>
        </a>

        <a href="/releases" style={{ textDecoration: 'none' }} className="glow-card">
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🚀</div>
          <h4 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>Release Gates</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>GO/NO-GO readiness evaluation.</p>
        </a>

        <a href="/integrations" style={{ textDecoration: 'none' }} className="glow-card">
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔌</div>
          <h4 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>MCP & n8n</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Connect external AI orchestrators.</p>
        </a>
      </div>

      {/* Main Execution Launcher + Ingress Guard */}
      <div className="glow-card">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            ⚡ Launch Autonomous Web Agent Run
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Protected by pre-queue <strong>Ingress Guard</strong> SSRF defense. Executed in disposable Playwright container with rolling ARIA snapshots.
          </p>
        </div>

        {/* Preset Templates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Presets:</span>
          <button
            type="button"
            onClick={() => handlePresetSelect('https://demo.playwright.dev/todomvc', 'Add two todos: "Buy groceries" and "Ship VeriShip QA", then mark the first as completed and assert 1 item remains active.')}
            className="status-pill"
            style={{ cursor: 'pointer', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)' }}
          >
            TodoMVC Flow
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('https://the-internet.herokuapp.com/login', 'Fill username with "tomsmith" and password with "SuperSecretPassword!", click Login, and assert success message is visible.')}
            className="status-pill"
            style={{ cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-violet)' }}
          >
            Auth Login Flow
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('https://the-internet.herokuapp.com/dropdown', 'Select option "Option 2" from the dropdown and assert Option 2 is selected.')}
            className="status-pill"
            style={{ cursor: 'pointer', background: 'rgba(192, 132, 252, 0.1)', color: 'var(--accent-purple)' }}
          >
            Dropdown Selection
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(251, 113, 133, 0.15)',
            border: '1px solid var(--accent-rose)',
            borderRadius: '12px',
            padding: '14px 18px',
            color: 'var(--accent-rose)',
            fontSize: '0.9rem',
            marginBottom: '20px'
          }}>
            <strong>Validation Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Target Web Application URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="glowing-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Agent Goal & Test Assertion Prompt *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe the end-to-end user scenario and expected outcome..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="glowing-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Priority:
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="glowing-input"
                  style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem' }}
                >
                  <option value="interactive">Interactive (Lane 1)</option>
                  <option value="scheduled">Scheduled / Batch (Lane 2)</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
              style={{ width: 'auto', padding: '12px 32px' }}
            >
              {loading ? 'Queuing Run...' : '⚡ Execute Live Web Agent'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Executions Stream */}
      <div className="glow-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>⚡ Recent Autonomous Executions</h3>
          <a href="/runs" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            View All Runs →
          </a>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No recent executions logged. Launch your first run above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                onClick={() => router.push(`/runs/${job.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-normal)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    {job.prompt.slice(0, 75)}...
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.url}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-pill status-${job.taxonomy === 'PASSED' ? 'passed' : job.taxonomy === 'APP_DEFECT' ? 'failed' : job.status === 'running' ? 'running' : 'pending'}`}>
                    {job.taxonomy || job.status.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 700 }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

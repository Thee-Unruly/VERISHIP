'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://example.com');
  const [prompt, setPrompt] = useState('Verify that the home page displays the standard header and main heading text.');
  const [priority, setPriority] = useState('interactive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // Analytics State
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    recovered: 0,
    defects: 0,
  });

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/jobs');
      if (res.ok) {
        const data = await res.json();
        const jobs = data.jobs || [];
        setRecentJobs(jobs);

        // Calculate simple dashboard analytics
        let passed = 0;
        let recovered = 0;
        let defects = 0;
        jobs.forEach((j: any) => {
          if (j.taxonomy === 'PASSED') passed++;
          else if (j.taxonomy === 'RECOVERED') recovered++;
          else if (j.taxonomy === 'APP_DEFECT' || j.taxonomy === 'INFRA_ERROR') defects++;
        });
        setStats({
          total: jobs.length,
          passed,
          recovered,
          defects,
        });
      }
    } catch {
      // Backend not running
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/jobs', {
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
      
      {/* Analytics Counter Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL EXECUTIONS</span>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{stats.total}</span>
        </div>
        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, letterSpacing: '0.05em' }}>PASSED VERIFICATIONS</span>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#34d399', lineHeight: 1 }}>{stats.passed}</span>
        </div>
        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.05em' }}>RECOVERED RUNS</span>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}>{stats.recovered}</span>
        </div>
        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600, letterSpacing: '0.05em' }}>DETECTED DEFECTS</span>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f87171', lineHeight: 1 }}>{stats.defects}</span>
        </div>
      </div>

      {/* Main Grid: Control Panel vs Key Features */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        
        {/* Launch Panel */}
        <div className="glow-card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.02em' }}>Launch Autonomous QA Run</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '32px' }}>
            Specify the web target and verification flow. Enforced with pre-queue SSRF shield protection.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Target Web Application URL
              </label>
              <input
                type="url"
                required
                className="glowing-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example-app.com"
                style={{ fontFamily: 'JetBrains Mono' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Natural Language QA Goal
              </label>
              <textarea
                required
                className="glowing-input"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your testing goal (e.g. Navigate to login, click elements, assert dashboard is visible)..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Execution Priority
                </label>
                <select
                  className="glowing-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="interactive">Interactive (Real-Time)</option>
                  <option value="scheduled">Batch (Background Execution)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="glow-button" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Initializing Context...' : '🚀 Execute Test Run'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#f87171',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🛑</span>
                <div>
                  <strong>SSRF / Ingress Blocked:</strong> {error}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Feature Highlights Panel */}
        <div className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Security & Execution Layer v2</h2>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ fontSize: '1.5rem' }}>🛡️</div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Ingress DNS Guard</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Performs pre-queue DNS lookup to intercept SSRF and DNS rebinding attacks on link-local or private subnets.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ fontSize: '1.5rem' }}>⚡</div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-violet)' }}>Real Preflight load</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Fires up Playwright to wait for `networkidle` and records JavaScript console errors prior to invoking the LLM loop.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ fontSize: '1.5rem' }}>🔄</div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>Resilient Provider Chain</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Primary Groq completions fall back to Anthropic or OpenAI to handle API rate limits and connection issues transparently.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Runs Table */}
      <div className="glow-card">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '24px', letterSpacing: '-0.02em' }}>Live Run Execution History</h2>
        
        {recentJobs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No executions loaded. Launch a new run above to begin monitoring.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-normal)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 20px' }}>Run ID</th>
                  <th style={{ padding: '16px 20px' }}>Target Application</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Failure Taxonomy</th>
                  <th style={{ padding: '16px 20px' }}>Fitness Score</th>
                  <th style={{ padding: '16px 20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border-normal)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '18px 20px', fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                      {job.id.slice(0, 16)}
                    </td>
                    <td style={{ padding: '18px 20px', fontWeight: 500 }}>
                      {job.url}
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <span className={`badge-label badge-${job.status}`}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      {job.taxonomy ? (
                        <span className={`badge-label badge-${job.taxonomy}`}>
                          {job.taxonomy}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '18px 20px', fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>
                      {job.fitness_score != null ? `${job.fitness_score}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <a 
                        href={`/runs/${job.id}`} 
                        style={{ 
                          color: 'var(--text-main)', 
                          textDecoration: 'none', 
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-normal)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-normal)'}
                      >
                        Monitor Run
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

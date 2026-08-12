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

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/jobs');
      if (res.ok) {
        const data = await res.json();
        setRecentJobs(data.jobs || []);
      }
    } catch {
      // Backend off during preview
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
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
        {/* Job Launch Panel */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Launch Web QA Agent Run</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Provide target web URL and test assertions. Enforced by Ingress Guard SSRF security.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Target Web Application URL
              </label>
              <input
                type="url"
                required
                className="glass-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                QA Goal / Natural Language Prompt
              </label>
              <textarea
                required
                className="glass-input"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Test login with demo credentials and select option from settings dropdown..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Priority Queue Lane
              </label>
              <select
                className="glass-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="interactive">Interactive (High Priority)</option>
                <option value="scheduled">Scheduled / Batch Run</option>
              </select>
            </div>

            {error && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#FB7185',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}>
                🛑 <strong>Ingress Error:</strong> {error}
              </div>
            )}

            <button type="submit" className="glass-button" disabled={loading}>
              {loading ? 'Validating & Queuing...' : '🚀 Queue QA Run'}
            </button>
          </form>
        </div>

        {/* System Architecture Highlights */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>v2 Architecture Enhancements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>🛡️ Ingress Guard (SSRF Protection)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Resolves DNS prior to queuing to block private IP ranges (10.0.0.0/8, 127.0.0.0/8, AWS 169.254 metadata).
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-indigo)', marginBottom: '4px' }}>⚡ Real Headless Preflight</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Validates SPA hydration, JS console errors, and HTTP status before agent loop begins.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-emerald)', marginBottom: '4px' }}>🔄 Rolling Context & Fallback Chain</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Rolling window (MAX_FULL_SNAPSHOTS=3) prevents token blowup. Provider chain auto-switches on Groq outages.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Recent QA Test Executions</h2>
        {recentJobs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent jobs executed yet. Launch a new run above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Job ID</th>
                <th style={{ padding: '12px' }}>Target URL</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Taxonomy</th>
                <th style={{ padding: '12px' }}>Fitness Score</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono' }}>{job.id.slice(0, 14)}...</td>
                  <td style={{ padding: '12px' }}>{job.url}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      background: job.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      color: job.status === 'completed' ? '#34D399' : '#818CF8'
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {job.taxonomy && (
                      <span className={`badge-${job.taxonomy}`} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        {job.taxonomy}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {job.fitness_score != null ? `${job.fitness_score}%` : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/runs/${job.id}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>View Run →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

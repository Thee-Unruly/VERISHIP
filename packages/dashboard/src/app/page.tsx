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
      // Backend offline
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL EXECUTIONS</span>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.total}</span>
        </div>

        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, letterSpacing: '0.05em' }}>PASSED VERIFICATIONS</span>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{stats.passed}</span>
        </div>

        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.05em' }}>RECOVERED RUNS</span>
            <span style={{ fontSize: '1.2rem' }}>🔄</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{stats.recovered}</span>
        </div>

        <div className="glow-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#fb7185', fontWeight: 700, letterSpacing: '0.05em' }}>DETECTED DEFECTS</span>
            <span style={{ fontSize: '1.2rem' }}>🚨</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fb7185', lineHeight: 1 }}>{stats.defects}</span>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="glow-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Launch Autonomous QA Run</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Specify target web URL and natural language goal. Protected with SSRF & DNS Ingress Defense.
            </p>
          </div>
        </div>

        {/* Preset Prompt Shortcuts */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
            Quick Start Prompt Presets
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              className="preset-pill"
              onClick={() => handlePresetSelect(
                'https://example-hr-app.demo.com/login',
                'Navigate to login page. Switch persona to employee, fill username john.doe@company.com, fill password pass123, click Sign In. Click Request Leave, submit vacation form, assert submission success message. Execute clear_session. Switch persona to approver, login as manager@company.com, navigate to approvals, click Approve, assert Approved status.'
              )}
            >
              🔄 Sequential Multi-Role Leave Approval
            </button>

            <button
              type="button"
              className="preset-pill"
              onClick={() => handlePresetSelect(
                'https://demo.ecom-store.com',
                'Navigate to shop. Search for Wireless Headphones, click first product, click Add to Cart, proceed to Checkout, fill shipping address, place order, and assert Order Confirmed.'
              )}
            >
              🛒 E-Commerce Checkout E2E Journey
            </button>

            <button
              type="button"
              className="preset-pill"
              onClick={() => handlePresetSelect(
                'https://example.com',
                'Verify that the home page displays the standard header and main heading text.'
              )}
            >
              🛡️ Quick Header Smoke Test
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Web Application URL
            </label>
            <input
              type="url"
              required
              className="glowing-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://target-app.com"
              style={{ fontFamily: 'JetBrains Mono' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Natural Language Verification Goal
            </label>
            <textarea
              required
              className="glowing-input"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your testing sequence..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Execution Mode
              </label>
              <select
                className="glowing-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="interactive">Interactive (Real-Time Container)</option>
                <option value="scheduled">Batch (Background Execution)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="glow-button" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Initializing Agent Container...' : '🚀 Launch Autonomous QA Run'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(251, 113, 133, 0.12)',
              border: '1px solid rgba(251, 113, 133, 0.3)',
              color: '#fb7185',
              padding: '16px 20px',
              borderRadius: '14px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🛑</span>
              <div>
                <strong>Ingress Protection Blocked Request:</strong> {error}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Recent Runs Table */}
      <div className="glow-card">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.02em' }}>Live Run Execution History</h2>
        
        {recentJobs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No executions loaded. Launch a new run above to begin live monitoring.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-normal)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 20px' }}>Job ID</th>
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
                    <td style={{ padding: '18px 20px', fontWeight: 600, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    <td style={{ padding: '18px 20px', fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>
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
                          borderRadius: '10px',
                          border: '1px solid var(--border-normal)',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Monitor Run ➔
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

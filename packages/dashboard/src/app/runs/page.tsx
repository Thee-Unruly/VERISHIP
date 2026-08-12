'use client';

import { useState, useEffect } from 'react';

export default function ExecutionsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching executions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glow-card" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>All QA Executions</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Historical record of all target verifications and diagnostic outputs.
          </p>
        </div>
        <button 
          onClick={fetchJobs} 
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-normal)',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-normal)'}
        >
          🔄 Refresh Log
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>
          Loading executions history...
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No QA runs have been executed yet. Return to the Dashboard to launch one.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-normal)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 20px' }}>Run ID / Job ID</th>
                <th style={{ padding: '16px 20px' }}>Target Application URL</th>
                <th style={{ padding: '16px 20px' }}>Verification Goal / Prompt</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px' }}>Taxonomy</th>
                <th style={{ padding: '16px 20px' }}>Fitness Rating</th>
                <th style={{ padding: '16px 20px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid var(--border-normal)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '18px 20px', fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                    {job.id.slice(0, 16)}
                  </td>
                  <td style={{ padding: '18px 20px', fontWeight: 600, fontSize: '0.9rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.url}
                  </td>
                  <td style={{ padding: '18px 20px', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.prompt}
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
                      Inspect details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

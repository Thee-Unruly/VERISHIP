'use client';

import React, { useState, useEffect } from 'react';

interface Defect {
  id: string;
  projectId: string;
  runId?: string;
  testCaseId?: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'trivial';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  rootCauseAnalysis?: string;
  suggestedFix?: string;
  traceUrl?: string;
  screenshotUrl?: string;
  createdAt: string;
}

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('open');

  const fetchDefects = async () => {
    try {
      const params = [];
      if (selectedStatus) params.push(`status=${selectedStatus}`);
      if (selectedSeverity) params.push(`severity=${selectedSeverity}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';

      const res = await fetch(`http://localhost:4000/api/defects${qs}`);
      if (res.ok) {
        const data = await res.json();
        setDefects(data);
      }
    } catch (err) {
      console.error('Failed to fetch defects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [selectedStatus, selectedSeverity]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/defects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchDefects();
      }
    } catch (err) {
      console.error('Failed to update defect status:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            🐛 Defect Intelligence & Root-Cause Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Automated bug logging from agent failures, AI root-cause classification, and remediation suggestions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="glowing-input"
            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.9rem' }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="glowing-input"
            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.9rem' }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Defects List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading defects & root-cause intelligence...
        </div>
      ) : defects.length === 0 ? (
        <div className="glow-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No active defects found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto' }}>
            When autonomous agent runs encounter application defects, they are automatically logged with root cause and reproduction traces here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {defects.map((def) => {
            const isCrit = def.severity === 'critical';
            const isHigh = def.severity === 'high';
            const sevColor = isCrit ? 'var(--accent-rose)' : isHigh ? 'var(--accent-amber)' : 'var(--accent-cyan)';

            return (
              <div key={def.id} className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isCrit ? 'rgba(251, 113, 133, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                        color: sevColor,
                        border: `1px solid ${sevColor}`
                      }}>
                        {def.severity.toUpperCase()}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{def.title}</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {def.description || 'No description recorded.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={def.status}
                      onChange={(e) => handleUpdateStatus(def.id, e.target.value)}
                      className="glowing-input"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <option value="open">OPEN</option>
                      <option value="in-progress">IN PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                      <option value="closed">CLOSED</option>
                    </select>
                  </div>
                </div>

                {/* AI Root Cause Box */}
                {def.rootCauseAnalysis && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '14px 18px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-violet)', marginBottom: '4px' }}>
                      🧠 AI Root-Cause Analysis:
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {def.rootCauseAnalysis}
                    </p>
                    {def.suggestedFix && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
                        <strong>💡 Suggested Fix:</strong> {def.suggestedFix}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Trace Links */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-normal)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Logged: {new Date(def.createdAt).toLocaleString()}</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {def.runId && (
                      <a href={`/runs/${def.runId}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                        View Execution Run →
                      </a>
                    )}
                    {def.traceUrl && (
                      <a href={`http://localhost:4000${def.traceUrl}`} target="_blank" style={{ color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600 }}>
                        Download Trace.zip 📦
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

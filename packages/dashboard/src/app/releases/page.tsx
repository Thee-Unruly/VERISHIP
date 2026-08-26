'use client';

import React, { useState, useEffect } from 'react';

interface ReleaseApproval {
  id: string;
  role: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
}

interface Release {
  id: string;
  projectId: string;
  projectName?: string;
  version: string;
  name?: string;
  description?: string;
  status: string;
  readinessScore: number;
  recommendation: 'GO' | 'NO-GO' | 'CONDITIONAL';
  targetDate?: string;
  totalTests: number;
  passedTests: number;
  openDefectsCount: number;
  criticalDefectsCount: number;
  approvals: ReleaseApproval[];
  createdAt: string;
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  const fetchReleases = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/releases');
      if (res.ok) {
        const data = await res.json();
        setReleases(data);
      }
    } catch (err) {
      console.error('Failed to fetch releases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleEvaluate = async (id: string) => {
    setEvaluatingId(id);
    try {
      const res = await fetch(`http://localhost:4000/api/releases/${id}/evaluate-readiness`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchReleases();
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleApprove = async (releaseId: string, approvalId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`http://localhost:4000/api/releases/${releaseId}/approvals/${approvalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments: `Sign-off ${status} via VeriShip governance console.` }),
      });
      if (res.ok) {
        fetchReleases();
      }
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
          🚀 Release Readiness & Governance Gates
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Deterministic risk evaluation, AI-driven GO/NO-GO recommendations, and multi-stakeholder sign-off gates.
        </p>
      </div>

      {/* Releases List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading release candidates & governance gates...
        </div>
      ) : releases.length === 0 ? (
        <div className="glow-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚀</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No release gates configured</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto' }}>
            Release candidates allow cross-functional teams to gate production shipments based on automated test pass rates and critical defect counts.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {releases.map((rel) => {
            const isGo = rel.recommendation === 'GO';
            const isCond = rel.recommendation === 'CONDITIONAL';
            const recColor = isGo ? 'var(--accent-emerald)' : isCond ? 'var(--accent-amber)' : 'var(--accent-rose)';

            return (
              <div key={rel.id} className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {rel.version} {rel.name ? `— ${rel.name}` : ''}
                      </h2>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: isGo ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)',
                        color: recColor,
                        border: `1px solid ${recColor}`
                      }}>
                        DECISION: {rel.recommendation}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Project: <strong>{rel.projectName || rel.projectId}</strong> {rel.description ? `• ${rel.description}` : ''}
                    </p>
                  </div>

                  {/* Readiness Score Gauge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '12px 24px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-normal)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Readiness Score</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: recColor }}>
                        {rel.readinessScore}%
                      </div>
                    </div>
                    <button
                      onClick={() => handleEvaluate(rel.id)}
                      disabled={evaluatingId === rel.id}
                      className="submit-button"
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      {evaluatingId === rel.id ? 'Evaluating...' : '⚡ Re-Evaluate Gate'}
                    </button>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-normal)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Test Suite Pass Rate</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {rel.totalTests > 0 ? `${Math.round((rel.passedTests / rel.totalTests) * 100)}% (${rel.passedTests}/${rel.totalTests})` : 'No tests run'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Critical Defects</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: rel.criticalDefectsCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {rel.criticalDefectsCount} Blocking
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open Defects Total</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {rel.openDefectsCount} Active
                    </div>
                  </div>
                </div>

                {/* Approvals Sign-off Workflow */}
                {rel.approvals && rel.approvals.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Stakeholder Sign-Off Gates:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {rel.approvals.map((appr) => (
                        <div key={appr.id} style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--border-normal)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {appr.role.toUpperCase()} Gate
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {appr.approverName}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`status-pill status-${appr.status === 'approved' ? 'passed' : appr.status === 'rejected' ? 'failed' : 'pending'}`} style={{ fontSize: '0.7rem' }}>
                              {appr.status.toUpperCase()}
                            </span>
                            {appr.status === 'pending' && (
                              <button
                                onClick={() => handleApprove(rel.id, appr.id, 'approved')}
                                style={{
                                  background: 'rgba(52, 211, 153, 0.2)',
                                  border: '1px solid var(--accent-emerald)',
                                  color: 'var(--accent-emerald)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Sign Off ✅
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

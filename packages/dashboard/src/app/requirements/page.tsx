'use client';

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

interface AcceptanceCriteria {
  id: string;
  criteria: string;
  isCovered?: boolean;
}

interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'draft' | 'review' | 'approved' | 'deprecated';
  clarityScore?: number;
  testabilityScore?: number;
  ambiguities?: string[];
  missingCriteria?: string[];
  suggestedAcceptanceCriteria?: string[];
  acceptanceCriteria?: AcceptanceCriteria[];
  testCaseCount?: number;
  createdAt: string;
}

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequirements = async () => {
    try {
      const url = selectedProjectId
        ? `http://localhost:4000/api/requirements?projectId=${selectedProjectId}`
        : 'http://localhost:4000/api/requirements';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRequirements(data);
      }
    } catch (err) {
      console.error('Failed to fetch requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !formProjectId) {
          setFormProjectId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchRequirements();
  }, [selectedProjectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !formProjectId) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formProjectId,
          title,
          description,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setTitle('');
        setDescription('');
        fetchRequirements();
      }
    } catch (err) {
      console.error('Failed to create requirement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReanalyze = async (id: string) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`http://localhost:4000/api/requirements/${id}/analyze`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchRequirements();
      }
    } catch (err) {
      console.error('Reanalysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleGenerateTests = async (id: string) => {
    setGeneratingId(id);
    try {
      const res = await fetch(`http://localhost:4000/api/requirements/${id}/generate-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: 'https://demo.playwright.dev/todomvc' }),
      });
      if (res.ok) {
        alert('Quality Copilot successfully generated autonomous test cases! View them in Test Cases.');
        fetchRequirements();
      }
    } catch (err) {
      console.error('Test generation failed:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            🧠 Requirements QA & Copilot
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            AI-powered requirement clarity scoring (0-100), ambiguity detection, and automated test scenario synthesis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="glowing-input"
            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.9rem' }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="submit-button"
            style={{ width: 'auto', padding: '10px 22px', fontSize: '0.9rem' }}
          >
            + Ingest Requirement
          </button>
        </div>
      </div>

      {/* Requirements List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading requirements & AI clarity analysis...
        </div>
      ) : requirements.length === 0 ? (
        <div className="glow-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧠</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No requirements ingested yet</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 24px' }}>
            Ingest user stories or PRD requirements to calculate clarity scores and auto-generate test suites.
          </p>
          <button onClick={() => setShowModal(true)} className="submit-button" style={{ width: 'auto', padding: '12px 28px' }}>
            Ingest First Requirement
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {requirements.map((req) => {
            const clarity = req.clarityScore ?? 75;
            const clarityColor = clarity >= 80 ? 'var(--accent-emerald)' : clarity >= 60 ? 'var(--accent-amber)' : 'var(--accent-rose)';

            return (
              <div key={req.id} className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{req.title}</h3>
                      <span className="status-pill status-running" style={{ fontSize: '0.7rem' }}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {req.description || 'No description specified.'}
                    </p>
                  </div>

                  {/* Clarity Score Gauge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-normal)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Clarity Score</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: clarityColor }}>
                        {clarity}/100
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '36px', background: 'var(--border-normal)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tests Linked</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
                        {req.testCaseCount || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ambiguity & Missing Criteria Badges */}
                {req.ambiguities && req.ambiguities.length > 0 && (
                  <div style={{ background: 'rgba(251, 113, 133, 0.08)', border: '1px solid rgba(251, 113, 133, 0.2)', padding: '12px 16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '4px' }}>
                      ⚠️ Ambiguity & Edge Case Gaps Detected:
                    </div>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {req.ambiguities.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Acceptance Criteria */}
                {req.suggestedAcceptanceCriteria && req.suggestedAcceptanceCriteria.length > 0 && (
                  <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '12px 16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      ✨ Copilot Suggested Acceptance Criteria:
                    </div>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {req.suggestedAcceptanceCriteria.map((ac, i) => (
                        <li key={i}>{ac}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-normal)' }}>
                  <button
                    onClick={() => handleReanalyze(req.id)}
                    disabled={analyzingId === req.id}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-normal)',
                      color: 'var(--text-muted)',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    {analyzingId === req.id ? 'Analyzing...' : '🔄 Re-Score Clarity'}
                  </button>

                  <button
                    onClick={() => handleGenerateTests(req.id)}
                    disabled={generatingId === req.id}
                    className="submit-button"
                    style={{ width: 'auto', padding: '8px 20px', fontSize: '0.85rem' }}
                  >
                    {generatingId === req.id ? 'Generating...' : '⚡ Generate Test Cases'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ingest Requirement Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glow-card" style={{ width: '100%', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Ingest Requirement for AI QA</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Target Project *
                </label>
                <select
                  required
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="glowing-input"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Requirement Title / Story *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. As a customer, I can checkout with 1-click Apple Pay"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glowing-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Description & Context
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste user stories, technical boundaries, error cases, or PRD notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glowing-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border-normal)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="submit-button"
                  style={{ width: 'auto', padding: '10px 24px' }}
                >
                  {submitting ? 'Analyzing & Saving...' : 'Analyze & Ingest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

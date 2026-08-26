'use client';

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

interface TestCase {
  id: string;
  projectId: string;
  requirementId?: string;
  title: string;
  description?: string;
  testType: string;
  status: 'draft' | 'ready' | 'passed' | 'failed' | 'blocked' | 'in-progress';
  targetUrl?: string;
  prompt?: string;
  lastRunId?: string;
  lastRunStatus?: string;
  lastRunFitness?: number;
  createdAt: string;
}

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://demo.playwright.dev/todomvc');
  const [prompt, setPrompt] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTestCases = async () => {
    try {
      const url = selectedProjectId
        ? `http://localhost:4000/api/test-cases?projectId=${selectedProjectId}`
        : 'http://localhost:4000/api/test-cases';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTestCases(data);
      }
    } catch (err) {
      console.error('Failed to fetch test cases:', err);
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
    fetchTestCases();
  }, [selectedProjectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !formProjectId) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formProjectId,
          title,
          description,
          targetUrl,
          prompt: prompt || `Verify that ${title}`,
          testType: 'autonomous-agent',
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setTitle('');
        setDescription('');
        setPrompt('');
        fetchTestCases();
      }
    } catch (err) {
      console.error('Failed to create test case:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunTest = async (tc: TestCase) => {
    setRunningId(tc.id);
    try {
      const res = await fetch('http://localhost:4000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: tc.targetUrl || 'https://demo.playwright.dev/todomvc',
          prompt: tc.prompt || `Verify ${tc.title}`,
          projectId: tc.projectId,
          testCaseId: tc.id,
          priority: 'interactive',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/runs/${data.jobId}`;
      } else {
        const errData = await res.json();
        alert(`Failed to queue job: ${errData.error || errData.reason}`);
      }
    } catch (err) {
      console.error('Run failed:', err);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            🧪 Test Cases & Automation Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Traceable test suites, manual verification, and 1-click autonomous Playwright agent execution.
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
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="submit-button"
            style={{ width: 'auto', padding: '10px 22px', fontSize: '0.9rem' }}
          >
            + New Test Case
          </button>
        </div>
      </div>

      {/* Test Cases Table / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading test cases...
        </div>
      ) : testCases.length === 0 ? (
        <div className="glow-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧪</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No test cases found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 24px' }}>
            Create test cases or use Quality Copilot on the Requirements page to auto-generate edge-case scenarios.
          </p>
          <button onClick={() => setShowModal(true)} className="submit-button" style={{ width: 'auto', padding: '12px 28px' }}>
            Create Test Case
          </button>
        </div>
      ) : (
        <div className="glow-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-normal)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 24px' }}>Test Case</th>
                <th style={{ padding: '16px 20px' }}>Type</th>
                <th style={{ padding: '16px 20px' }}>Target URL</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px' }}>Fitness</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((tc) => (
                <tr key={tc.id} style={{ borderBottom: '1px solid var(--border-normal)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tc.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {tc.description || tc.prompt || 'No additional details'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(56, 189, 248, 0.25)'
                    }}>
                      {tc.testType}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {tc.targetUrl ? (
                      <span title={tc.targetUrl}>{tc.targetUrl.slice(0, 32)}...</span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className={`status-pill status-${tc.status === 'passed' ? 'passed' : tc.status === 'failed' ? 'failed' : tc.status === 'in-progress' ? 'running' : 'pending'}`}>
                      {tc.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: tc.lastRunFitness && tc.lastRunFitness > 80 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    {tc.lastRunFitness ? `${tc.lastRunFitness}%` : '—'}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRunTest(tc)}
                      disabled={runningId === tc.id}
                      className="submit-button"
                      style={{
                        width: 'auto',
                        padding: '8px 18px',
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'
                      }}
                    >
                      {runningId === tc.id ? 'Launching...' : '⚡ Run Agent'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for creating a new test case */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glow-card" style={{ width: '100%', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Create Test Case</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Project *
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
                  Test Case Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify adding item to cart and calculating sales tax"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glowing-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Target Application URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="glowing-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Agent Goal & Instruction Prompt
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific goal for the autonomous agent: e.g. Navigate to shop, click first product, add to cart, and assert cart counter equals 1..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
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
                  {submitting ? 'Saving...' : 'Save Test Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

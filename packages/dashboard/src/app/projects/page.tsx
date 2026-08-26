'use client';

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in-progress' | 'on-track' | 'at-risk' | 'blocked' | 'completed';
  healthScore: number;
  qualityCoverage: number;
  targetReleaseDate?: string;
  requirementCount?: number;
  testCaseCount?: number;
  openDefectsCount?: number;
  totalRunsCount?: number;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<'on-track' | 'at-risk' | 'planning'>('on-track');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          status,
          targetReleaseDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setName('');
        setDescription('');
        setTargetDate('');
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            📁 Projects & Quality Governance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Manage quality coverage, release milestones, and requirements traceability across all projects.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="submit-button"
          style={{ width: 'auto', padding: '12px 24px', fontSize: '0.95rem' }}
        >
          + New Project
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading quality governance projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="glow-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No projects created yet</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 24px' }}>
            Create your first QA project to organize requirements, autonomous test cases, and release gates.
          </p>
          <button onClick={() => setShowModal(true)} className="submit-button" style={{ width: 'auto', padding: '12px 28px' }}>
            Create First Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {projects.map((proj) => (
            <div key={proj.id} className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{proj.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                    {proj.description || 'No project description provided.'}
                  </p>
                </div>
                <span className={`status-pill status-${proj.status === 'on-track' ? 'passed' : proj.status === 'at-risk' ? 'running' : 'pending'}`}>
                  {proj.status.toUpperCase()}
                </span>
              </div>

              {/* Quality Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-normal)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Coverage</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {proj.qualityCoverage}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tests</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {proj.testCaseCount || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open Bugs</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (proj.openDefectsCount || 0) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                    {proj.openDefectsCount || 0}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-normal)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>📅 {proj.targetReleaseDate ? new Date(proj.targetReleaseDate).toLocaleDateString() : 'No date set'}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`/requirements?projectId=${proj.id}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                    Requirements →
                  </a>
                  <a href={`/test-cases?projectId=${proj.id}`} style={{ color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600, marginLeft: '8px' }}>
                    Tests →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating a new project */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glow-card" style={{ width: '100%', maxWidth: '540px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Create QA Governance Project</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Checkout & Payment Engine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glowing-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the scope, services, or repository..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glowing-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="glowing-input"
                  >
                    <option value="on-track">ON-TRACK</option>
                    <option value="planning">PLANNING</option>
                    <option value="at-risk">AT-RISK</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Target Release Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="glowing-input"
                  />
                </div>
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
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

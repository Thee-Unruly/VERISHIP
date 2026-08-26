'use client';

import React, { useState, useEffect } from 'react';

interface ServiceAccount {
  id: string;
  name: string;
  description?: string;
  role: string;
  token?: string;
  isActive: boolean;
  createdAt: string;
}

export default function IntegrationsPage() {
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('agent');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServiceAccounts = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/auth/service-accounts');
      if (res.ok) {
        const data = await res.json();
        setServiceAccounts(data);
      }
    } catch (err) {
      console.error('Failed to fetch service accounts:', err);
    }
  };

  useEffect(() => {
    fetchServiceAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/auth/service-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, role }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedToken(data.token);
        setName('');
        setDescription('');
        fetchServiceAccounts();
      }
    } catch (err) {
      console.error('Failed to create service account:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
          🔌 Integrations, MCP Server & n8n Orchestrator
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Connect external AI agents (Claude, GPT, Antigravity) and n8n workflows to autonomously operate the QA platform.
        </p>
      </div>

      {/* Grid: MCP Server on Left, Service Accounts on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* MCP Server Setup Guide */}
        <div className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🤖</span>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Model Context Protocol (MCP)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Expose 20+ QA governance & execution tools directly to AI agents.</p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-normal)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
            # Run FastMCP Server locally (Port 8001)<br />
            python veriship_mcp.py<br /><br />
            # Or attach in Claude / Cursor config:<br />
            &#123;<br />
            &nbsp;&nbsp;&quot;mcpServers&quot;: &#123;<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&quot;veriship&quot;: &#123;<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;command&quot;: &quot;python&quot;,<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;args&quot;: [&quot;veriship_mcp.py&quot;]<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br />
            &nbsp;&nbsp;&#125;<br />
            &#125;
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>Available Tools:</strong> <code>list_projects</code>, <code>create_requirement</code>, <code>analyze_requirement_clarity</code>, <code>create_test_case</code>, <code>execute_qa_job</code>, <code>list_defects</code>, <code>evaluate_release_readiness</code>.
          </div>
        </div>

        {/* n8n Orchestrator */}
        <div className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>n8n Workflow Automation</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pre-configured self-healing & coverage gap workflows.</p>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Import the workflow file located at <code>integrations/n8n/veriship-autonomous-agent.json</code> into your n8n instance to trigger autonomous test runs on every pull request or nightly schedule.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-normal)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Webhook Endpoint:</span> <code>POST http://localhost:4000/api/jobs</code>
          </div>
        </div>
      </div>

      {/* Service Accounts Management */}
      <div className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🔐 Service Accounts & Agent Tokens</h3>

        {createdToken && (
          <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid var(--accent-emerald)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
              ✅ Service Account Token Created (Copy Now!):
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', color: 'var(--text-main)', wordBreak: 'break-all', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', marginTop: '6px' }}>
              {createdToken}
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 160px', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              Account Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. n8n-nightly-bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glowing-input"
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. CI/CD test runner bot"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glowing-input"
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="glowing-input"
              style={{ padding: '10px 14px' }}
            >
              <option value="agent">AGENT</option>
              <option value="readonly">READ ONLY</option>
              <option value="admin">ADMIN</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="submit-button"
            style={{ width: '100%', padding: '10px', height: '42px' }}
          >
            {submitting ? 'Generating...' : '+ Create Token'}
          </button>
        </form>

        {/* Existing Service Accounts Table */}
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-normal)', paddingTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-normal)' }}>
                <th style={{ padding: '8px 12px' }}>Name</th>
                <th style={{ padding: '8px 12px' }}>Description</th>
                <th style={{ padding: '8px 12px' }}>Role</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
                <th style={{ padding: '8px 12px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {serviceAccounts.map((sa) => (
                <tr key={sa.id} style={{ borderBottom: '1px solid var(--border-normal)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{sa.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{sa.description || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)' }}>
                      {sa.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: sa.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 700 }}>
                      {sa.isActive ? 'ACTIVE' : 'REVOKED'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {new Date(sa.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

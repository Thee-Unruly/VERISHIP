import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERISHIP | Quality Governance & Autonomous QA Platform',
  description: 'Enterprise Quality Intelligence & Autonomous Web Agent Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" />
        <div className="app-container">
          <header style={{
            background: 'rgba(6, 9, 19, 0.88)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-normal)',
            padding: '16px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                  fontWeight: 900,
                  color: '#0f172a',
                  fontSize: '1.3rem',
                  boxShadow: '0 4px 18px rgba(56, 189, 248, 0.4)'
                }}>
                  V
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>VERISHIP</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      letterSpacing: '0.05em'
                    }}>
                      QA GOVERNANCE v2
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Autonomous Web Agent & Release Governance</p>
                </div>
              </a>
            </div>

            <nav style={{ display: 'flex', gap: '22px', fontSize: '0.88rem', fontWeight: 600, alignItems: 'center', flexWrap: 'wrap' }}>
              <a href="/" style={{ color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Overview
              </a>
              <a href="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                📁 Projects
              </a>
              <a href="/requirements" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                🧠 Copilot QA
              </a>
              <a href="/test-cases" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                🧪 Test Cases
              </a>
              <a href="/runs" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                ⚡ Agent Runner
              </a>
              <a href="/defects" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                🐛 Defects
              </a>
              <a href="/releases" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                🚀 Release Gates
              </a>
              <a href="/integrations" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                🔌 MCP & n8n
              </a>
            </nav>
          </header>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERISHIP | Universal QA Platform v2',
  description: 'Autonomous containerized QA testing platform powered by Gemini and Playwright',
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
            background: 'rgba(10, 15, 30, 0.7)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-normal)',
            padding: '20px 48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))',
                fontWeight: 800,
                letterSpacing: '0.1em',
                fontSize: '1rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                VERISHIP
              </div>
              <div style={{ height: '24px', width: '1px', background: 'var(--border-normal)' }} />
              <div>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>Universal Agent QA Platform</h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 500, letterSpacing: '0.05em' }}>V2 SECURE SUITE</p>
              </div>
            </div>
            <nav style={{ display: 'flex', gap: '32px', fontSize: '0.9rem', fontWeight: 500 }}>
              <a href="/" style={{ color: 'var(--text-main)', textDecoration: 'none', transition: 'color 0.2s' }}>Dashboard</a>
              <a href="/runs" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Executions</a>
              <a href="https://github.com/Thee-Unruly/VERISHIP" target="_blank" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
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

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERISHIP | Universal QA Platform v2',
  description: 'Autonomous containerized QA testing platform powered by AI and Playwright',
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
            background: 'rgba(6, 9, 19, 0.85)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-normal)',
            padding: '18px 48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                fontWeight: 900,
                color: '#0f172a',
                fontSize: '1.2rem',
                boxShadow: '0 4px 15px rgba(56, 189, 248, 0.4)'
              }}>
                V
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>VERISHIP</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    letterSpacing: '0.05em'
                  }}>
                    V2 ENGINE
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Universal Autonomous QA Agent Platform</p>
              </div>
            </div>

            <nav style={{ display: 'flex', gap: '32px', fontSize: '0.9rem', fontWeight: 600 }}>
              <a href="/" style={{ color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Dashboard
              </a>
              <a href="/runs" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
                ⚡ Executions
              </a>
              <a href="https://github.com/Thee-Unruly/VERISHIP" target="_blank" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🐙 GitHub Repo
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

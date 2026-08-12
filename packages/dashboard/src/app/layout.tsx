import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Universal Web Agent QA Platform v2',
  description: 'AI-driven, containerized end-to-end web testing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}>
                QA
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Universal QA Agent</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>v2 Architecture • Isolation & SSRF Protected</p>
              </div>
            </div>
            <nav style={{ display: 'flex', gap: '20px', fontSize: '0.95rem' }}>
              <a href="/" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500 }}>Dashboard</a>
              <a href="/runs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>All Runs</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

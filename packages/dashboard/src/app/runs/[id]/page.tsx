'use client';

import { useState, useEffect, useRef } from 'react';

export default function RunDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [jobData, setJobData] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchJobData = () => {
    fetch(`http://localhost:4000/api/v1/jobs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setJobData(data);
        if (data.steps) {
          setSteps(data.steps);
          // Set initial fallback screenshot to last step's screenshot if available
          const validScreenshotStep = [...data.steps].reverse().find(s => s.screenshot_url);
          if (validScreenshotStep) {
            setSelectedScreenshot(validScreenshotStep.screenshot_url);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchJobData();

    // SSE Stream setup for real-time steps
    const eventSource = new EventSource(`http://localhost:4000/api/v1/jobs/${id}/stream`);

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'step_update' && payload.step) {
          setSteps((prev) => {
            const exists = prev.some(s => s.id === payload.step.id);
            if (exists) return prev;
            const updated = [...prev, payload.step];
            if (payload.step.screenshot_url) {
              setSelectedScreenshot(payload.step.screenshot_url);
            }
            return updated;
          });
        } else if (payload.event === 'job_completed') {
          fetchJobData();
        }
      } catch {
        // Parse error
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  useEffect(() => {
    // Scroll terminal panel to bottom on new steps
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const job = jobData?.job;
  const run = jobData?.run;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Header Card */}
      <div className="glow-card" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.05em' }}>VERISHIP AGENT CONSOLE</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '4px' }}>QA Execution Monitor</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>Run ID: {id}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 16px',
            borderRadius: '30px',
            fontSize: '0.85rem',
            border: '1px solid var(--border-normal)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#34D399' : '#EF4444',
              boxShadow: connected ? '0 0 10px #34D399' : '0 0 10px #EF4444'
            }} />
            <span style={{ fontWeight: 600, color: connected ? '#34D399' : '#F87171' }}>
              {connected ? 'SSE ACTIVE' : 'STREAM OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Execution Workspace: Left Side Details/Logs, Right Side Visual Screenshot Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Left Side: Test Run Metadata & CLI Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Metadata Card */}
          {job && (
            <div className="glow-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', letterSpacing: '-0.01em' }}>Execution Scope</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target URL</span>
                  <p style={{ fontWeight: 600, wordBreak: 'break-all', fontSize: '0.95rem', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>{job.url}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taxonomy</span>
                  <div style={{ marginTop: '4px' }}>
                    {job.taxonomy ? (
                      <span className={`badge-label badge-${job.taxonomy}`}>{job.taxonomy}</span>
                    ) : (
                      <span className={`badge-label badge-${job.status}`}>{job.status}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fitness Rating</span>
                  <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {run?.fitness_score != null ? `${run.fitness_score}%` : 'Evaluating...'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trace Artifact</span>
                  <div style={{ marginTop: '4px' }}>
                    {run?.trace_url ? (
                      <a 
                        href={`http://localhost:4000${run.trace_url}`} 
                        download
                        style={{
                          color: 'var(--accent-violet)',
                          textDecoration: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 Download Trace
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generating...</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-normal)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>QA Verification Prompt</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.5' }}>{job.prompt}</p>
              </div>
            </div>
          )}

          {/* Console Terminal Output */}
          <div className="glow-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', background: '#02050A', border: '1px solid var(--border-glow)' }}>
            <div style={{
              background: '#0B0F19',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-normal)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px'
            }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>AGENT TRACE OUTPUT</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
              </div>
            </div>

            <div style={{
              flex: 1,
              padding: '24px',
              fontFamily: 'JetBrains Mono',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              overflowY: 'auto',
              maxHeight: '450px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              color: '#F3F4F6'
            }}>
              {steps.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>
                  $ veriship-agent --run {id}<br />
                  &gt; Waiting for active container assignment...
                </div>
              ) : (
                steps.map((step, idx) => (
                  <div key={step.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      <span>$ STEP {step.step_number} &gt; {step.tool_call_name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {step.created_at ? new Date(step.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p style={{ color: '#E5E7EB', margin: '4px 0' }}>
                      <span style={{ color: 'var(--accent-violet)' }}>thought:</span> {step.action_taken}
                    </p>
                    <p style={{ color: 'var(--accent-emerald)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>result:</span> {step.tool_result}
                    </p>
                    {step.screenshot_url && (
                      <button
                        onClick={() => setSelectedScreenshot(step.screenshot_url)}
                        style={{
                          background: 'rgba(6, 182, 212, 0.1)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          color: 'var(--accent-cyan)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontFamily: 'inherit',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          marginTop: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔍 Inspect Step Screenshot
                      </button>
                    )}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>

        {/* Right Side: Visual Page Screenshot Inspector */}
        <div className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '600px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Visual Execution Inspector</h3>
          
          {selectedScreenshot ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                position: 'relative',
                flex: 1,
                border: '1px solid var(--border-glow)',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0B0F19',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={`http://localhost:4000${selectedScreenshot}`}
                  alt="Step Screenshot" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '480px',
                    objectFit: 'contain',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                Active Render Frame: {selectedScreenshot}
              </p>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              border: '2px dashed var(--border-normal)',
              borderRadius: '12px',
              gap: '12px'
            }}>
              <div style={{ fontSize: '2rem' }}>📸</div>
              <p style={{ fontSize: '0.9rem' }}>Visual render frames will appear as agent executes steps.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

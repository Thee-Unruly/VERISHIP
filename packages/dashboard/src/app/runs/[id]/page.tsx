'use client';

import { useState, useEffect, useRef } from 'react';

export default function RunDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [jobData, setJobData] = useState<any>(null);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'screenshots' | 'video' | 'code' | 'memory'>('screenshots');
  const [specCode, setSpecCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchJobData = () => {
    fetch(`http://localhost:4000/api/v1/jobs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setJobData(data);
        if (data.steps) {
          setSteps(data.steps);
          const validScreenshotStep = [...data.steps].reverse().find(s => s.screenshot_url);
          if (validScreenshotStep) {
            setSelectedScreenshot(validScreenshotStep.screenshot_url);
          }
        }
      })
      .catch(() => {});

    // Fetch structured memory
    fetch(`http://localhost:4000/api/v1/jobs/${id}/memory`)
      .then((res) => res.json())
      .then((mem) => setMemoryData(mem.memory))
      .catch(() => {});
  };

  useEffect(() => {
    fetchJobData();

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
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const job = jobData?.job;
  const run = jobData?.run;

  useEffect(() => {
    if (run?.spec_url) {
      fetch(`http://localhost:4000${run.spec_url}`)
        .then((res) => res.text())
        .then((code) => setSpecCode(code))
        .catch(() => {});
    }
  }, [run?.spec_url]);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/jobs/${id}/rerun`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.jobId) {
        window.location.href = `/runs/${data.jobId}`;
      }
    } catch {
      setRerunning(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!job) return;
    try {
      await fetch('http://localhost:4000/api/v1/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Smoke Test: ${job.url}`,
          description: `Saved from Run #${id.slice(0, 8)}`,
          url: job.url,
          prompt: job.prompt,
          tags: ['smoke-test', 'history-preset'],
        }),
      });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Header Card */}
      <div className="glow-card" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.05em' }}>VERISHIP AGENT CONSOLE</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.02em' }}>QA Execution Monitor</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>Job ID: {id}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleRerun}
            disabled={rerunning}
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
              color: '#0f172a',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)'
            }}
          >
            {rerunning ? 'Rerunning...' : '🔄 Re-Run Test'}
          </button>

          <button
            onClick={handleSaveAsTemplate}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-normal)',
              borderRadius: '10px',
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {templateSaved ? '✅ Template Saved!' : '⭐ Save Template'}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 16px',
            borderRadius: '30px',
            fontSize: '0.82rem',
            border: '1px solid var(--border-normal)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#34d399' : '#fb7185',
              boxShadow: connected ? '0 0 10px #34d399' : '0 0 10px #fb7185'
            }} />
            <span style={{ fontWeight: 700, color: connected ? '#34d399' : '#fb7185' }}>
              {connected ? 'SSE ACTIVE' : 'STREAM OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Execution Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Left Side: Test Run Metadata & CLI Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Metadata Card */}
          {job && (
            <div className="glow-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', letterSpacing: '-0.01em' }}>Execution Scope</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Target URL</span>
                  <p style={{ fontWeight: 600, wordBreak: 'break-all', fontSize: '0.9rem', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>{job.url}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Taxonomy</span>
                  <div style={{ marginTop: '4px' }}>
                    {job.taxonomy ? (
                      <span className={`badge-label badge-${job.taxonomy}`}>{job.taxonomy}</span>
                    ) : (
                      <span className={`badge-label badge-${job.status}`}>{job.status}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Fitness Rating</span>
                  <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {run?.fitness_score != null ? `${run.fitness_score}%` : 'Evaluating...'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Trace Artifact</span>
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
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Playwright Script</span>
                  <div style={{ marginTop: '4px' }}>
                    {run?.spec_url ? (
                      <a 
                        href={`http://localhost:4000${run.spec_url}`} 
                        download
                        style={{
                          color: 'var(--accent-cyan)',
                          textDecoration: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📄 Download Spec
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generating...</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-normal)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>QA Verification Goal</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.5' }}>{job.prompt}</p>
              </div>
            </div>
          )}

          {/* Console Terminal Output */}
          <div className="glow-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', background: '#030712', border: '1px solid var(--border-glow)' }}>
            <div style={{
              background: '#090d16',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-normal)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px'
            }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>AGENT TRACE OUTPUT</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fb7185' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
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
              color: '#f8fafc'
            }}>
              {steps.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>
                  $ veriship-agent --run {id}<br />
                  &gt; Waiting for container assignment...
                </div>
              ) : (
                steps.map((step, idx) => (
                  <div key={step.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      <span>$ STEP {step.step_number} &gt; {step.tool_call_name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {step.created_at ? new Date(step.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p style={{ color: '#f8fafc', margin: '4px 0' }}>
                      <span style={{ color: 'var(--accent-violet)' }}>thought:</span> {step.action_taken}
                    </p>
                    <p style={{ color: 'var(--accent-emerald)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>result:</span> {step.tool_result}
                    </p>
                    {step.screenshot_url && (
                      <button
                        onClick={() => setSelectedScreenshot(step.screenshot_url)}
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: 'var(--accent-cyan)',
                          padding: '4px 10px',
                          borderRadius: '6px',
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

        {/* Right Side: Visual Page Screenshot, Video, Code, & Structured Memory */}
        <div className="glow-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-normal)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Visual & Memory Inspector</h3>
            
            {/* Tab Selectors */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: '10px' }}>
              {(['screenshots', 'video', 'code', 'memory'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: activeTab === tab ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))' : 'transparent',
                    color: activeTab === tab ? '#0f172a' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'memory' ? '🧠 Memory & History' : tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'screenshots' && (
            selectedScreenshot ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  position: 'relative',
                  flex: 1,
                  border: '1px solid var(--border-glow)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#090d16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px'
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
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
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
                borderRadius: '14px',
                gap: '12px',
                minHeight: '400px'
              }}>
                <div style={{ fontSize: '2rem' }}>📸</div>
                <p style={{ fontSize: '0.9rem' }}>Visual render frames will appear as agent executes steps.</p>
              </div>
            )
          )}

          {activeTab === 'video' && (
            run?.video_url ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  position: 'relative',
                  flex: 1,
                  border: '1px solid var(--border-glow)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#090d16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px'
                }}>
                  <video 
                    src={`http://localhost:4000${run.video_url}`}
                    controls
                    autoPlay
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '480px',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                  Live Browser Session Recording (.webm)
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
                borderRadius: '14px',
                gap: '12px',
                minHeight: '400px'
              }}>
                <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite' }}>🎥</div>
                <p style={{ fontSize: '0.9rem' }}>Session video is being recorded... WebM file compiles on run completion.</p>
              </div>
            )
          )}

          {activeTab === 'code' && (
            specCode ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(specCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-normal)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copied ? '✅ Copied to Clipboard!' : '📋 Copy Playwright Script'}
                  </button>
                </div>

                <div style={{
                  flex: 1,
                  border: '1px solid var(--border-glow)',
                  borderRadius: '14px',
                  background: '#030712',
                  padding: '20px',
                  overflowX: 'auto',
                  maxHeight: '480px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  color: '#f8fafc',
                  whiteSpace: 'pre'
                }}>
                  {specCode}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                  Copy-Pasteable Playwright Test Script (.spec.ts)
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
                borderRadius: '14px',
                gap: '12px',
                minHeight: '400px'
              }}>
                <div style={{ fontSize: '2.5rem' }}>📄</div>
                <p style={{ fontSize: '0.9rem' }}>Playwright script is generating... script compiles on run completion.</p>
              </div>
            )
          )}

          {activeTab === 'memory' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-normal)', borderRadius: '14px', padding: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 700 }}>
                  Structured Execution Summary
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {memoryData?.structured_summary || 'Run memory evaluated upon completion.'}
                </p>
              </div>

              {/* Passed & Failed Assertions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '14px', padding: '18px' }}>
                  <h5 style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
                    ✅ PASSED ASSERTIONS ({memoryData?.passed_assertions?.length || 0})
                  </h5>
                  {memoryData?.passed_assertions?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                      {memoryData.passed_assertions.map((a: string, i: number) => (
                        <li key={i} style={{ color: 'var(--text-main)' }}>• {a}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No explicit text assertions logged</span>
                  )}
                </div>

                <div style={{ background: 'rgba(251, 113, 133, 0.05)', border: '1px solid rgba(251, 113, 133, 0.2)', borderRadius: '14px', padding: '18px' }}>
                  <h5 style={{ color: '#fb7185', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
                    🚨 FAILED ASSERTIONS ({memoryData?.failed_assertions?.length || 0})
                  </h5>
                  {memoryData?.failed_assertions?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                      {memoryData.failed_assertions.map((a: string, i: number) => (
                        <li key={i} style={{ color: '#fb7185' }}>• {a}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Zero assertion failures recorded</span>
                  )}
                </div>
              </div>

              {/* Selector Cache */}
              <div style={{ background: '#030712', border: '1px solid var(--border-glow)', borderRadius: '14px', padding: '18px' }}>
                <h5 style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', fontFamily: 'JetBrains Mono' }}>
                  DOM SELECTOR CACHE & HEURISTICS
                </h5>
                <pre style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#94a3b8', overflowX: 'auto', maxHeight: '160px' }}>
                  {JSON.stringify(memoryData?.selector_cache || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

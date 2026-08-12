'use client';

import { useState, useEffect } from 'react';

export default function RunDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [jobData, setJobData] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial fetch of job data
    fetch(`http://localhost:4000/api/v1/jobs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setJobData(data);
        if (data.steps) setSteps(data.steps);
      })
      .catch(() => {});

    // SSE Stream setup for real-time steps
    const eventSource = new EventSource(`http://localhost:4000/api/v1/jobs/${id}/stream`);

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setLiveLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${JSON.stringify(payload)}`]);
        
        if (payload.event === 'step_update' && payload.step) {
          setSteps((prev) => [...prev, payload.step]);
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

  const job = jobData?.job;
  const run = jobData?.run;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Execution Run Details</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'JetBrains Mono' }}>
            Job ID: {id}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: connected ? '#34D399' : 'var(--text-muted)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#34D399' : '#64748B'
            }} />
            {connected ? 'SSE Live Stream Connected' : 'Stream Offline'}
          </div>
        </div>
      </div>

      {job && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target URL</span>
              <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{job.url}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</span>
              <p>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  background: job.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: job.status === 'completed' ? '#34D399' : '#818CF8'
                }}>
                  {job.status}
                </span>
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Failure Taxonomy</span>
              <p>
                {job.taxonomy ? (
                  <span className={`badge-${job.taxonomy}`} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    {job.taxonomy}
                  </span>
                ) : (
                  '-'
                )}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fitness Score</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {run?.fitness_score != null ? `${run.fitness_score}%` : 'N/A'}
              </p>
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prompt Goal</span>
            <p style={{ fontSize: '0.95rem', marginTop: '4px' }}>{job.prompt}</p>
          </div>
        </div>
      )}

      {/* Step by Step Execution Timeline */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Step-by-Step Action Logs</h3>

        {steps.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Waiting for worker to execute steps...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {steps.map((step) => (
              <div key={step.id || step.step_number} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-indigo)', fontSize: '0.9rem' }}>
                    Step {step.step_number}: Tool Call `{step.tool_call_name}`
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {step.created_at ? new Date(step.created_at).toLocaleTimeString() : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                  💭 <em>{step.action_taken}</em>
                </p>
                <div style={{
                  background: '#070A12',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'JetBrains Mono',
                  color: 'var(--accent-cyan)'
                }}>
                  Result: {step.tool_result}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

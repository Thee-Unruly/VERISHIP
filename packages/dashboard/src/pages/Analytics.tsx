import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Analytics() {
  const [cmd, setCmd] = useState("npx playwright test --config=load-tests/playwright.config.ts");
  const [jobId, setJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("idle");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  const startRun = async () => {
    setLogs([]);
    setStatus("starting");
    const res = await fetch("/api/test-runs/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd }),
    });
    if (!res.ok) {
      const text = await res.text();
      setLogs([`Failed to start: ${res.status} ${text}`]);
      setStatus("error");
      return;
    }
    const body = await res.json();
    const id = body.job_id;
    setJobId(id);
    setStatus("running");

    const es = new EventSource(`/api/test-runs/${id}/events`);
    esRef.current = es;

    es.onmessage = (ev) => {
      // standard 'data' event
      setLogs((l) => [...l, ev.data]);
    };
    es.addEventListener("done", () => {
      setStatus("done");
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    });
    es.addEventListener("error", (e) => {
      setLogs((l) => [...l, "<error event>"]);
      setStatus("error");
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Run ad-hoc Playwright or load tests and watch live logs.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="col-span-2">
            <label className="block mb-2 font-medium">Command to run</label>
            <textarea
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              className="w-full p-2 border rounded h-28"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={startRun}
                disabled={status === "running"}
              >
                Start Run
              </button>
              <div className="text-sm">Status: <strong>{status}</strong></div>
              {jobId && <div className="ml-2 text-sm text-muted-foreground">Job: {jobId}</div>}
            </div>
          </div>

          <div className="col-span-1">
            <div className="p-4 border rounded h-full overflow-auto">
              <h3 className="font-medium">Live Logs</h3>
              <div className="text-xs font-mono whitespace-pre-wrap mt-2">
                {logs.length === 0 ? <div className="text-muted-foreground">No logs yet</div> : logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

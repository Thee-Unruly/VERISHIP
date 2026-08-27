import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Loader2,
  FileDown,
  RefreshCw,
  Film,
  Sparkles,
  Code,
  Brain,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Layers,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Activity,
  CheckSquare
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface StepLog {
  id?: string;
  step_number: number;
  action_taken: string;
  tool_call_name: string;
  tool_args: any;
  tool_result: string;
  screenshot_url?: string;
  duration_ms?: number;
  created_at?: string;
}

interface RunDetails {
  id: string;
  job_id: string;
  status: string;
  taxonomy?: string;
  fitness_score?: number;
  total_steps?: number;
  duration_ms?: number;
  trace_url?: string;
  video_url?: string;
  spec_url?: string;
  screenshot_url?: string;
  created_at?: string;
  completed_at?: string;
}

interface JobItem {
  id: string;
  url: string;
  prompt: string;
  status: string;
  priority?: string;
  taxonomy?: string;
  fitness_score?: number;
  project_id?: string;
  project_name?: string;
  created_at: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

export default function PlaywrightPage() {
  // Form State
  const [url, setUrl] = useState("https://demo.playwright.dev/todomvc");
  const [prompt, setPrompt] = useState(
    "Add 3 todos: 'Verify login flow', 'Test checkout process', and 'Check defect dashboard'. Mark the second todo as completed, filter by Active, and assert that only 2 items remain."
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [priority, setPriority] = useState<string>("interactive");
  const [headless, setHeadless] = useState<boolean>(true);
  const [browserType, setBrowserType] = useState<string>("chromium");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Projects list
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Execution & Live Stream State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobItem | null>(null);
  const [activeRun, setActiveRun] = useState<RunDetails | null>(null);
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>("live");
  const [specCode, setSpecCode] = useState<string | null>(null);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // History state
  const [recentJobs, setRecentJobs] = useState<JobItem[]>([]);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch projects and job history on mount
  useEffect(() => {
    fetchProjects();
    fetchRecentJobs();
  }, []);

  // Poll / Stream active job updates
  useEffect(() => {
    if (!activeJobId) return;

    fetchJobDetails(activeJobId);

    // Setup SSE connection for real-time live events
    const sseUrl = `/api/jobs/${activeJobId}/stream`;
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "step_update" && data.step) {
            setSteps((prev) => {
              const exists = prev.some((s) => s.step_number === data.step.step_number);
              if (exists) return prev;
              return [...prev, data.step];
            });
            fetchJobDetails(activeJobId);
          } else if (data.event === "job_completed") {
            fetchJobDetails(activeJobId);
            fetchRecentJobs();
            toast.success("Autonomous Playwright QA journey completed!");
          }
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };

      es.onerror = () => {
        es.close();
      };
    } catch (err) {
      console.warn("SSE not available, falling back to polling", err);
    }

    // Polling fallback
    const interval = setInterval(() => {
      fetchJobDetails(activeJobId);
    }, 2000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [activeJobId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load projects", err);
      setProjects([]);
    }
  };

  const fetchRecentJobs = async () => {
    setRefreshing(true);
    try {
      const endpoint = selectedProjectId && selectedProjectId !== "all" 
        ? `/api/jobs?projectId=${selectedProjectId}` 
        : "/api/jobs";
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
        setRecentJobs(list);
        if (list.length > 0 && !activeJobId) {
          setActiveJobId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
      setRecentJobs([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecentJobs();
  }, [selectedProjectId]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveJob(data.job || null);
        setActiveRun(data.run || null);
        if (data.steps && Array.isArray(data.steps)) {
          setSteps(data.steps);
        }

        if (data.run?.spec_url) {
          fetchSpecCode(data.run.spec_url);
        }

        if (data.job?.status === "completed" || data.job?.status === "failed") {
          fetchJobMemory(jobId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch job details", err);
    }
  };

  const fetchSpecCode = async (specUrl: string) => {
    try {
      const fullUrl = specUrl.startsWith("http") ? specUrl : specUrl;
      const res = await fetch(fullUrl);
      if (res.ok) {
        const code = await res.text();
        setSpecCode(code);
      }
    } catch (e) {
      console.error("Failed to fetch spec code", e);
    }
  };

  const fetchJobMemory = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/memory`);
      if (res.ok) {
        const data = await res.json();
        setMemoryData(data.memory);
      }
    } catch (e) {
      console.error("Failed to fetch job memory", e);
    }
  };

  const handlePresetSelect = (presetUrl: string, presetPrompt: string) => {
    setUrl(presetUrl);
    setPrompt(presetPrompt);
    toast.info("Scenario preset loaded.");
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !prompt.trim()) {
      toast.error("Please provide both a target URL and verification goal.");
      return;
    }

    setLoading(true);
    setError(null);
    setSteps([]);
    setSpecCode(null);
    setMemoryData(null);
    setActiveTab("live");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          prompt: prompt.trim(),
          projectId: selectedProjectId || undefined,
          priority,
          headless,
          browserType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.reason || data.error || "Failed to initialize test execution";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(`Autonomous Agent Launched (${data.jobId.slice(0, 12)}...)`);
      setActiveJobId(data.jobId);
      fetchRecentJobs();
    } catch (err: any) {
      const msg = err.message || "Network error launching test run";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copySpecToClipboard = () => {
    if (!specCode) return;
    navigator.clipboard.writeText(specCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Playwright test script copied to clipboard.");
  };

  const filteredJobs = recentJobs.filter((j) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      (j.prompt && j.prompt.toLowerCase().includes(q)) ||
      (j.url && j.url.toLowerCase().includes(q)) ||
      (j.id && j.id.toLowerCase().includes(q))
    );
  });

  const isJobRunning = activeJob?.status === "pending" || activeJob?.status === "running";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Slim Studio Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎭</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Playwright Studio
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold">
                  Autonomous QA v2
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Natural-language browser test automation with live DOM streaming & artifact compilation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentJobs}
              disabled={refreshing}
              className="h-8 text-xs gap-1 px-2.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* 2-Column Split Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ========================================================================= */}
          {/* LEFT PANEL (35% - 4.5 cols): Launcher + Compact Preset Chips + History    */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 flex flex-col">
            
            {/* Quick Test Launcher Card */}
            <Card className="border shadow-sm bg-card">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-primary fill-primary" />
                    Launch Autonomous Test
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-normal"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    {showAdvanced ? "Less Options" : "Options"}
                  </button>
                </CardTitle>
              </CardHeader>

              <CardContent className="px-4 pb-4 pt-0">
                <form onSubmit={handleLaunch} className="space-y-3">
                  {/* Target Base URL */}
                  <div className="space-y-1">
                    <Label htmlFor="target-url" className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Target URL *
                    </Label>
                    <Input
                      id="target-url"
                      type="url"
                      required
                      placeholder="https://demo.playwright.dev/todomvc"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="font-mono text-xs h-8 bg-background"
                    />
                  </div>

                  {/* Verification Goal / Prompt */}
                  <div className="space-y-1">
                    <Label htmlFor="goal-prompt" className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Test Goal & Verification Steps *
                    </Label>
                    <Textarea
                      id="goal-prompt"
                      required
                      rows={3}
                      placeholder="Describe what the Playwright agent should verify, click, fill, or assert..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="text-xs font-mono leading-relaxed bg-background resize-none"
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                      Quick Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handlePresetSelect(
                            "https://demo.playwright.dev/todomvc",
                            "Add 3 todos: 'Verify login flow', 'Test checkout process', and 'Check defect dashboard'. Mark the second todo as completed, filter by Active, and assert that only 2 items remain."
                          )
                        }
                        className="px-2 py-0.5 rounded text-[11px] bg-secondary/80 hover:bg-secondary border border-border text-foreground font-medium transition-colors"
                      >
                        📝 TodoMVC CRUD
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePresetSelect(
                            "https://demo.app-approval.com",
                            "Sign in as employee 'john.doe@company.com'. Submit a leave request for 3 days. Sign out. Sign in as manager, navigate to approvals queue, approve request, and assert 'Approved' badge."
                          )
                        }
                        className="px-2 py-0.5 rounded text-[11px] bg-secondary/80 hover:bg-secondary border border-border text-foreground font-medium transition-colors"
                      >
                        🔄 Approval Flow
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePresetSelect(
                            "https://example.com",
                            "Verify that the home page loads successfully, displays the main heading, and check that the More Information link is clickable."
                          )
                        }
                        className="px-2 py-0.5 rounded text-[11px] bg-secondary/80 hover:bg-secondary border border-border text-foreground font-medium transition-colors"
                      >
                        🛡️ Smoke Verification
                      </button>
                    </div>
                  </div>

                  {/* Advanced Options (Collapsible) */}
                  {showAdvanced && (
                    <div className="pt-2 border-t space-y-2.5 animate-fade-in text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Browser Engine
                          </Label>
                          <select
                            value={browserType}
                            onChange={(e) => setBrowserType(e.target.value)}
                            className="w-full h-7 px-2 rounded border bg-background text-xs"
                          >
                            <option value="chromium">Chromium</option>
                            <option value="firefox">Firefox</option>
                            <option value="webkit">WebKit (Safari)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Display Mode
                          </Label>
                          <select
                            value={headless ? "headless" : "headed"}
                            onChange={(e) => setHeadless(e.target.value === "headless")}
                            className="w-full h-7 px-2 rounded border bg-background text-xs"
                          >
                            <option value="headless">Headless</option>
                            <option value="headed">Headed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Banner */}
                  {error && (
                    <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                      {error}
                    </div>
                  )}

                  {/* Launch Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Spawning Browser Container...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Execute Autonomous Test
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Run History List Card */}
            <Card className="border shadow-sm bg-card flex flex-col flex-1">
              <CardHeader className="pb-2 pt-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Execution History ({filteredJobs.length})
                    </CardTitle>
                  </div>
                </div>

                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search runs by URL or goal..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="h-7 pl-8 text-xs bg-background"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-2 max-h-[360px] overflow-y-auto space-y-1">
                {filteredJobs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No matching runs found.
                  </div>
                ) : (
                  filteredJobs.map((job) => {
                    const isSelected = activeJobId === job.id;
                    const isPassed = job.status === "completed" || (job as any).run_status === "completed" || (job as any).taxonomy === "PASSED";
                    const isFailed = job.status === "failed" || (job as any).run_status === "failed";
                    const isPending = job.status === "pending" || job.status === "running";

                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          setActiveJobId(job.id);
                          fetchJobDetails(job.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary/40 shadow-sm"
                            : "bg-background/60 hover:bg-accent/40 border-border/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isPassed
                                  ? "bg-emerald-500"
                                  : isFailed
                                  ? "bg-destructive"
                                  : isPending
                                  ? "bg-blue-500 animate-pulse"
                                  : "bg-slate-400"
                              }`}
                            />
                            <span className="font-mono text-[11px] font-semibold truncate text-foreground">
                              {job.id}
                            </span>
                          </div>

                          <Badge
                            variant={isPassed ? "default" : isFailed ? "destructive" : "secondary"}
                            className="text-[10px] py-0 px-1.5 h-4 capitalize shrink-0 font-normal"
                          >
                            {isPending ? "Running" : isPassed ? "Pass" : "Fail"}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1 font-mono">
                          {job.prompt}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[160px]">{job.url}</span>
                          <span>{new Date(job.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>


          {/* ========================================================================= */}
          {/* RIGHT PANEL (65% - 7.5 cols): Live Studio Inspector Viewport              */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-4">
            
            {activeJobId ? (
              <Card className="border shadow-sm bg-card overflow-hidden">
                {/* Active Run Header Bar */}
                <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-foreground bg-background px-2 py-0.5 rounded border">
                        {activeJob?.id || activeJobId}
                      </span>
                      <Badge
                        variant={
                          activeJob?.status === "completed" || activeRun?.status === "passed"
                            ? "default"
                            : activeJob?.status === "failed" || activeRun?.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="capitalize text-xs font-semibold px-2 py-0.5"
                      >
                        {isJobRunning ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Executing Agent ({steps.length} steps)
                          </span>
                        ) : activeJob?.status || "Ready"}
                      </Badge>

                      {activeRun?.fitness_score !== undefined && (
                        <Badge variant="outline" className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                          Fitness: {activeRun.fitness_score}%
                        </Badge>
                      )}

                      {activeRun?.duration_ms && (
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {(activeRun.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 font-mono">
                      Target: <strong className="text-foreground">{activeJob?.url || url}</strong>
                    </p>
                  </div>

                  {/* Artifact Quick Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeRun?.trace_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 text-xs gap-1 border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                      >
                        <a href={activeRun.trace_url} download="playwright-trace.zip">
                          <FileDown className="w-3.5 h-3.5" />
                          Trace ZIP
                        </a>
                      </Button>
                    )}

                    {specCode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySpecToClipboard}
                        className="h-8 text-xs gap-1"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy Spec"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Viewport Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-4 border-b bg-background">
                    <TabsList className="bg-transparent h-10 p-0 gap-4">
                      <TabsTrigger
                        value="live"
                        className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 text-xs font-semibold flex items-center gap-1.5 h-10"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Live Steps ({steps.length})
                      </TabsTrigger>

                      <TabsTrigger
                        value="video"
                        className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 text-xs font-semibold flex items-center gap-1.5 h-10"
                      >
                        <Film className="w-3.5 h-3.5" />
                        Session Video
                      </TabsTrigger>

                      <TabsTrigger
                        value="spec"
                        className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 text-xs font-semibold flex items-center gap-1.5 h-10"
                      >
                        <Code className="w-3.5 h-3.5" />
                        Playwright Spec (.ts)
                      </TabsTrigger>

                      <TabsTrigger
                        value="memory"
                        className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 text-xs font-semibold flex items-center gap-1.5 h-10"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        Assertions & Memory
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <CardContent className="p-4 min-h-[460px] max-h-[580px] overflow-y-auto">
                    
                    {/* TAB 1: Live Steps & Timeline */}
                    <TabsContent value="live" className="m-0 space-y-2.5">
                      {steps.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                          <p className="text-xs font-medium">
                            {isJobRunning
                              ? "Headless Playwright browser initialising and navigating..."
                              : "No steps recorded for this run."}
                          </p>
                        </div>
                      ) : (
                        steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border bg-card/80 hover:bg-accent/20 transition-colors flex items-start gap-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {step.step_number}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-foreground font-mono">
                                  {step.tool_call_name ? `Browser: ${step.tool_call_name}` : "Agent Step"}
                                </span>
                                {step.duration_ms && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {step.duration_ms}ms
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {step.action_taken || step.tool_result}
                              </p>
                            </div>

                            {step.screenshot_url && (
                              <a
                                href={step.screenshot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 border rounded overflow-hidden hover:opacity-80 transition-opacity block"
                                title="Click to view full screenshot"
                              >
                                <img
                                  src={step.screenshot_url}
                                  alt={`Step ${step.step_number}`}
                                  className="w-20 h-12 object-cover"
                                />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </TabsContent>

                    {/* TAB 2: Session Video Player */}
                    <TabsContent value="video" className="m-0">
                      {activeRun?.video_url ? (
                        <div className="rounded-lg overflow-hidden border bg-black shadow-inner">
                          <video
                            src={activeRun.video_url}
                            controls
                            autoPlay
                            className="w-full max-h-[460px] mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="py-24 text-center border border-dashed rounded-lg text-muted-foreground space-y-2">
                          <Film className="w-8 h-8 mx-auto text-muted-foreground/60" />
                          <p className="text-xs font-medium">
                            {isJobRunning
                              ? "Recording browser session in WebM format... Video will render once completed."
                              : "No session video recorded for this execution."}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB 3: Generated Playwright Spec Code */}
                    <TabsContent value="spec" className="m-0">
                      <div className="relative">
                        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[460px] border">
                          {specCode ||
                            `// Playwright Spec Generated by VeriShip Autonomous Engine\nimport { test, expect } from '@playwright/test';\n\ntest('Autonomous QA Journey', async ({ page }) => {\n  await page.goto('${activeJob?.url || url}');\n  // Steps compiling...\n});`}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* TAB 4: Assertions & Run Memory */}
                    <TabsContent value="memory" className="m-0 space-y-4">
                      {memoryData ? (
                        <div className="space-y-4 text-xs">
                          {/* Passed Assertions */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Passed Assertions ({memoryData.passed_assertions?.length || 0})
                            </h4>
                            {Array.isArray(memoryData.passed_assertions) && memoryData.passed_assertions.length > 0 ? (
                              <ul className="space-y-1 font-mono pl-5 list-disc text-muted-foreground">
                                {memoryData.passed_assertions.map((a: string, i: number) => (
                                  <li key={i}>{a}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground">No explicit assertions logged.</p>
                            )}
                          </div>

                          {/* Failed Assertions */}
                          {Array.isArray(memoryData.failed_assertions) && memoryData.failed_assertions.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <h4 className="font-semibold text-destructive flex items-center gap-1.5">
                                <XCircle className="w-4 h-4" />
                                Failed Assertions ({memoryData.failed_assertions.length})
                              </h4>
                              <ul className="space-y-1 font-mono pl-5 list-disc text-destructive">
                                {memoryData.failed_assertions.map((a: string, i: number) => (
                                  <li key={i}>{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Selector Cache */}
                          {memoryData.selector_cache && Object.keys(memoryData.selector_cache).length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <h4 className="font-semibold text-foreground">Discovered DOM Selector Cache:</h4>
                              <div className="p-3 rounded bg-muted/40 font-mono text-[11px] space-y-1">
                                {Object.entries(memoryData.selector_cache).map(([k, v]: any) => (
                                  <div key={k} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                                    <span className="text-muted-foreground">{k}</span>
                                    <span className="text-foreground font-semibold">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-20 text-center text-muted-foreground text-xs">
                          {isJobRunning ? "Analyzing DOM state and assertions..." : "No structured memory records found."}
                        </div>
                      )}
                    </TabsContent>

                  </CardContent>
                </Tabs>
              </Card>
            ) : (
              /* Sleek Empty State when no run is selected */
              <Card className="border border-dashed shadow-sm bg-card/60 p-12 text-center flex flex-col items-center justify-center min-h-[520px]">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 fill-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Playwright Autonomous Studio</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                  Compose a verification prompt on the left or select a previous test run to inspect live steps, full session video, and copy-pasteable TypeScript test specs.
                </p>
                <Button
                  onClick={handleLaunch}
                  disabled={loading}
                  className="text-xs gap-2 bg-primary text-primary-foreground font-semibold"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Default TodoMVC Test
                </Button>
              </Card>
            )}

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

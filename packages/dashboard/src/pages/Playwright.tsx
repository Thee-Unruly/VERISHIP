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
  ArrowUpRight
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

  // Projects list
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Execution & Live Stream State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobItem | null>(null);
  const [activeRun, setActiveRun] = useState<RunDetails | null>(null);
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>("video");
  const [specCode, setSpecCode] = useState<string | null>(null);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // History state
  const [recentJobs, setRecentJobs] = useState<JobItem[]>([]);
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
    }, 2500);

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
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
        setRecentJobs(list);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
      setRecentJobs([]);
    } finally {
      setRefreshing(false);
    }
  };

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

        // If spec_url is present, fetch raw script content
        if (data.run?.spec_url) {
          fetchSpecCode(data.run.spec_url);
        }

        // Fetch memory if completed
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
    toast.info("Verification scenario preset loaded.");
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

      toast.success(`Autonomous Agent Launched (Job: ${data.jobId.slice(0, 10)}...)`);
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

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎭</span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Autonomous Playwright Test Runner
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 ml-2">
                Playwright Engine v2
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Launch AI-driven browser test journeys with live DOM streaming, video recording, and auto-generated Playwright specs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentJobs}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Runs
            </Button>
          </div>
        </div>

        {/* Preset Prompt Pills */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Quick Verification Presets</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Select a pre-engineered test sequence or compose your custom natural language scenario below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs rounded-full bg-secondary/70 hover:bg-secondary border border-border/40"
                onClick={() =>
                  handlePresetSelect(
                    "https://demo.playwright.dev/todomvc",
                    "Add 3 todos: 'Verify login flow', 'Test checkout process', and 'Check defect dashboard'. Mark the second todo as completed, filter by Active, and assert that only 2 items remain."
                  )
                }
              >
                📝 TodoMVC CRUD & Filter Flow
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs rounded-full bg-secondary/70 hover:bg-secondary border border-border/40"
                onClick={() =>
                  handlePresetSelect(
                    "https://demo.app-approval.com",
                    "Sign in as employee 'john.doe@company.com'. Submit a leave request for 3 days. Sign out. Sign in as manager 'sarah.manager@company.com', navigate to approvals queue, approve the pending leave request, and assert 'Approved' badge appears."
                  )
                }
              >
                🔄 Multi-Role Approval Workflow
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs rounded-full bg-secondary/70 hover:bg-secondary border border-border/40"
                onClick={() =>
                  handlePresetSelect(
                    "https://demo.ecom-store.com",
                    "Navigate to shop. Search for Wireless Headphones, click first product, click Add to Cart, proceed to Checkout, fill shipping address, place order, and assert Order Confirmed."
                  )
                }
              >
                🛒 E-Commerce Checkout E2E Journey
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs rounded-full bg-secondary/70 hover:bg-secondary border border-border/40"
                onClick={() =>
                  handlePresetSelect(
                    "https://example.com",
                    "Verify that the home page loads successfully, displays the main heading, and check that the More Information link is clickable."
                  )
                }
              >
                🛡️ Header & Smoke Verification
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Launcher & Config Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Configure & Launch Autonomous QA Run
            </CardTitle>
            <CardDescription className="text-xs">
              The autonomous agent will inspect the DOM, perform multi-step user actions, execute assertions, and compile artifacts.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLaunch} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Target URL */}
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="target-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Web Application URL *
                  </Label>
                  <Input
                    id="target-url"
                    type="url"
                    required
                    placeholder="https://app.yourdomain.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="font-mono text-sm bg-background/80"
                  />
                </div>

                {/* Project Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="project" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Link Project (Optional)
                  </Label>
                  <select
                    id="project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- No Project Linked --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Goal / Prompt */}
              <div className="space-y-1.5">
                <Label htmlFor="goal-prompt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Natural Language Verification Goal / Step Instructions *
                </Label>
                <Textarea
                  id="goal-prompt"
                  required
                  rows={4}
                  placeholder="Describe your testing sequence, assertions, form inputs, and expected outcomes..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="text-sm bg-background/80"
                />
              </div>

              {/* Execution Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Execution Mode
                  </Label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background/80 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="interactive">Interactive (Real-Time Container)</option>
                    <option value="scheduled">Batch (Background Execution)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Browser Engine
                  </Label>
                  <select
                    value={browserType}
                    onChange={(e) => setBrowserType(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background/80 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="chromium">Chromium (Google Chrome)</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit (Safari)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Display Mode
                  </Label>
                  <select
                    value={headless ? "headless" : "headed"}
                    onChange={(e) => setHeadless(e.target.value === "headless")}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background/80 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="headless">Headless (Fastest in Container)</option>
                    <option value="headed">Headed (Visual Display)</option>
                  </select>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Ingress Protection Notice:</span> {error}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-6 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Initializing Agent Container...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Launch Autonomous QA Run
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live Execution Inspector (Visible when activeJobId is set) */}
        {activeJobId && (
          <div className="space-y-6">
            {/* Run Status Header Banner */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
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
                        className="capitalize text-xs"
                      >
                        {activeJob?.status === "running" ? "⚡ Running in Playwright Engine" : activeJob?.status || "Processing"}
                      </Badge>
                      {activeRun?.taxonomy && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {activeRun.taxonomy}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate max-w-xl">
                      {activeJob?.url || url}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>
                        Duration:{" "}
                        <strong className="text-foreground font-mono">
                          {activeRun?.duration_ms ? `${(activeRun.duration_ms / 1000).toFixed(1)}s` : "In Progress..."}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" />
                      <span>
                        Steps: <strong className="text-foreground font-mono">{steps.length}</strong>
                      </span>
                    </div>

                    {activeRun?.fitness_score != null && (
                      <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
                        <span className="font-bold text-primary font-mono text-sm">
                          {activeRun.fitness_score}% Fitness Score
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Split Screen Inspector: Left = Steps Timeline, Right = Artifact Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Live Steps Stream */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-border/60 bg-card/60 backdrop-blur-md min-h-[620px] h-[620px] flex flex-col shadow-sm">
                  <CardHeader className="py-3.5 px-4 border-b border-border/40 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm font-bold">Execution Timeline</CardTitle>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {steps.length} actions logged
                    </span>
                  </CardHeader>

                  <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5 font-mono text-xs">
                    {steps.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs">Connecting to headless Playwright worker...</p>
                      </div>
                    ) : (
                      steps.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          className="p-3 rounded-lg border border-border/50 bg-background/60 hover:bg-background/90 transition-all space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                {s.step_number}
                              </span>
                              <span className="font-semibold text-foreground text-xs">
                                {s.tool_call_name || "action"}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {s.duration_ms ? `${s.duration_ms}ms` : "ok"}
                            </Badge>
                          </div>

                          <p className="text-muted-foreground text-[11px] font-sans leading-relaxed">
                            {s.action_taken}
                          </p>

                          {s.tool_args && Object.keys(s.tool_args).length > 0 && (
                            <div className="bg-secondary/40 p-1.5 rounded text-[10px] text-muted-foreground overflow-x-auto">
                              {JSON.stringify(s.tool_args)}
                            </div>
                          )}

                          {s.screenshot_url && (
                            <div className="pt-1.5 border-t border-border/30">
                              <a
                                href={s.screenshot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative block overflow-hidden rounded border border-border/60 bg-black/60 max-h-28"
                              >
                                <img
                                  src={s.screenshot_url}
                                  alt={`DOM step ${s.step_number}`}
                                  className="w-full h-24 object-cover object-top group-hover:scale-105 transition-transform duration-200"
                                  loading="lazy"
                                />
                                <span className="absolute bottom-1 right-1 bg-black/85 text-[9px] text-white px-1.5 py-0.5 rounded flex items-center gap-1 font-sans">
                                  <ArrowUpRight className="w-2.5 h-2.5" /> View Screenshot
                                </span>
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Artifacts & Inspectors (Video, Spec Code, Memory) */}
              <div className="lg:col-span-7">
                <Card className="border-border/60 bg-card/60 backdrop-blur-md min-h-[620px] h-[620px] flex flex-col shadow-sm overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between bg-card/40 flex-shrink-0">
                      <TabsList className="bg-secondary/50">
                        <TabsTrigger value="video" className="text-xs gap-1.5">
                          <Film className="w-3.5 h-3.5 text-primary" />
                          Session Video
                        </TabsTrigger>
                        <TabsTrigger value="code" className="text-xs gap-1.5">
                          <Code className="w-3.5 h-3.5 text-primary" />
                          Playwright Spec
                        </TabsTrigger>
                        <TabsTrigger value="memory" className="text-xs gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-primary" />
                          Agent Memory
                        </TabsTrigger>
                      </TabsList>

                      {activeTab === "code" && specCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copySpecToClipboard}
                          className="h-7 text-xs gap-1 hover:bg-primary/10"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copied ? "Copied" : "Copy Code"}
                        </Button>
                      )}
                    </div>

                    {/* Tab 1: Video Player */}
                    <TabsContent value="video" className="flex-1 min-h-0 p-3 m-0 data-[state=active]:flex flex-col justify-between overflow-hidden">
                      {activeRun?.video_url ? (
                        <div className="w-full h-full flex flex-col justify-between min-h-0 space-y-2">
                          <div className="w-full flex-1 min-h-0 rounded-lg overflow-hidden border border-border/60 bg-black flex items-center justify-center relative shadow-inner">
                            <video
                              key={activeRun.video_url}
                              src={activeRun.video_url}
                              controls
                              autoPlay
                              playsInline
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-between w-full text-xs text-muted-foreground font-mono px-1 pt-1 flex-shrink-0">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Format: WebM Session Recording
                            </span>
                            <a
                              href={activeRun.video_url}
                              download="recording.webm"
                              className="text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              Download Recording
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-muted-foreground">
                          <Film className="w-12 h-12 stroke-[1.2] animate-pulse text-primary" />
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground text-sm">Session Recording in Progress</p>
                            <p className="text-xs max-w-sm">
                              The browser session is being captured frame-by-frame. The WebM recording compiles automatically upon run completion.
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 2: Generated Playwright Spec Code */}
                    <TabsContent value="code" className="flex-1 min-h-0 p-3 m-0 data-[state=active]:flex flex-col justify-between overflow-hidden">
                      {specCode ? (
                        <div className="w-full h-full flex flex-col justify-between min-h-0 space-y-2">
                          <pre className="w-full flex-1 min-h-0 p-4 rounded-lg bg-zinc-950 border border-border/60 text-emerald-400 font-mono text-xs overflow-auto leading-relaxed shadow-inner selection:bg-primary selection:text-white">
                            <code>{specCode}</code>
                          </pre>
                          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-1 pt-1 flex-shrink-0">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              Ready for CI/CD (`npx playwright test`)
                            </span>
                            {activeRun?.spec_url && (
                              <a
                                href={activeRun.spec_url}
                                download="test.spec.ts"
                                className="text-primary hover:underline flex items-center gap-1 font-medium"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                Download .spec.ts
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-muted-foreground">
                          <Code className="w-12 h-12 stroke-[1.2] text-muted-foreground" />
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground text-sm">Synthesizing Playwright Spec Script</p>
                            <p className="text-xs max-w-sm">
                              The AI engine translates executed action steps into resilient, reproducible Playwright code.
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 3: Agent Memory & Assertions */}
                    <TabsContent value="memory" className="flex-1 min-h-0 p-3 m-0 data-[state=active]:flex flex-col overflow-y-auto space-y-3.5">
                      <div className="p-3.5 rounded-lg border border-border/60 bg-background/60 space-y-1.5 shadow-sm flex-shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Structured Execution Summary
                        </span>
                        <p className="text-sm text-foreground leading-relaxed">
                          {memoryData?.structured_summary || "Evaluating agent memory upon step completion..."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-shrink-0">
                        {/* Passed Assertions */}
                        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>PASSED ASSERTIONS ({memoryData?.passed_assertions?.length || 0})</span>
                          </div>
                          {memoryData?.passed_assertions?.length > 0 ? (
                            <ul className="space-y-1 text-xs text-foreground font-sans">
                              {memoryData.passed_assertions.map((a: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-emerald-500 font-bold">•</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No passed assertions recorded yet</p>
                          )}
                        </div>

                        {/* Failed Assertions */}
                        <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                          <div className="flex items-center gap-1.5 text-destructive text-xs font-bold">
                            <XCircle className="w-4 h-4" />
                            <span>FAILED ASSERTIONS ({memoryData?.failed_assertions?.length || 0})</span>
                          </div>
                          {memoryData?.failed_assertions?.length > 0 ? (
                            <ul className="space-y-1 text-xs text-destructive font-sans">
                              {memoryData.failed_assertions.map((a: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="font-bold">•</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Zero assertion failures recorded</p>
                          )}
                        </div>
                      </div>

                      {/* DOM Selector Cache */}
                      <div className="p-3.5 rounded-lg border border-border/60 bg-zinc-950 text-zinc-300 space-y-1.5 font-mono text-xs shadow-inner flex-1 min-h-[160px] flex flex-col">
                        <span className="text-xs font-bold text-primary flex-shrink-0">DOM SELECTOR CACHE & HEURISTICS</span>
                        <pre className="overflow-auto text-[11px] text-muted-foreground flex-1">
                          {JSON.stringify(memoryData?.selector_cache || {}, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Live Run Execution History Table */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Run Execution History</CardTitle>
            <CardDescription className="text-xs">
              Recent autonomous test runs executed through the Playwright BullMQ worker pool.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {recentJobs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No past executions found. Launch your first run above to start monitoring.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
                      <th className="py-3 px-4 font-semibold">Job ID</th>
                      <th className="py-3 px-4 font-semibold">Target URL</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Taxonomy</th>
                      <th className="py-3 px-4 font-semibold">Fitness</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-primary font-semibold">
                          {job.id.slice(0, 14)}...
                        </td>
                        <td className="py-3.5 px-4 font-medium max-w-[240px] truncate text-foreground">
                          {job.url}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              job.status === "completed" || job.status === "passed"
                                ? "default"
                                : job.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="capitalize text-[11px]"
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {job.taxonomy ? (
                            <span className="text-muted-foreground">{job.taxonomy}</span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-primary">
                          {job.fitness_score != null ? `${job.fitness_score}%` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveJobId(job.id);
                              window.scrollTo({ top: 400, behavior: "smooth" });
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            Inspect Run
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

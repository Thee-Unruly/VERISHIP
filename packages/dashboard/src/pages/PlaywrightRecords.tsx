import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Film,
  Play,
  FileDown,
  RefreshCw,
  Code,
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Clock,
  Zap,
  Activity,
  FolderKanban,
  Eye,
  X
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProjects } from "@/context/ProjectsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface JobRecord {
  id: string;
  url: string;
  prompt: string;
  project_id?: number;
  project_name?: string;
  test_case_id?: string;
  test_case_title?: string;
  status: string;
  taxonomy?: string;
  fitness_score?: number;
  total_steps?: number;
  duration_ms?: number;
  trace_url?: string;
  video_url?: string;
  spec_url?: string;
  created_at: string;
  completed_at?: string;
  failure_reason?: string;
  run_id?: string;
}

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

export default function PlaywrightRecords() {
  const { projects, selectedProjectId, setSelectedProjectId, selectedProject } = useProjects();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Job for Deep Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [inspectDetails, setInspectDetails] = useState<{
    job: JobRecord | null;
    run: any | null;
    steps: StepLog[];
  }>({ job: null, run: null, steps: [] });
  const [specCode, setSpecCode] = useState<string | null>(null);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("video");
  const [copied, setCopied] = useState(false);

  const isAllProjects = !selectedProjectId || selectedProjectId === "all";

  const fetchJobs = async () => {
    setRefreshing(true);
    try {
      const endpoint = !isAllProjects
        ? `/api/jobs?projectId=${selectedProjectId}`
        : "/api/jobs";
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
        setJobs(list);
      }
    } catch (err) {
      console.error("Failed to fetch jobs records", err);
      toast.error("Failed to load test execution records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [selectedProjectId]);

  const openInspector = async (job: JobRecord) => {
    setSelectedJob(job);
    setInspectModalOpen(true);
    setSpecCode(null);
    setMemoryData(null);
    setActiveTab(job.video_url ? "video" : "code");

    try {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setInspectDetails({
          job: data.job || job,
          run: data.run || null,
          steps: Array.isArray(data.steps) ? data.steps : [],
        });

        if (data.run?.spec_url) {
          const specRes = await fetch(data.run.spec_url);
          if (specRes.ok) {
            setSpecCode(await specRes.text());
          }
        }

        const memRes = await fetch(`/api/jobs/${job.id}/memory`);
        if (memRes.ok) {
          const memData = await memRes.json();
          setMemoryData(memData.memory || null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch full job inspection", err);
    }
  };

  const copySpec = () => {
    if (!specCode) return;
    navigator.clipboard.writeText(specCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Playwright test script copied to clipboard.");
  };

  // Filtered Jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      !searchQuery.trim() ||
      j.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.project_name && j.project_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "passed" && (j.taxonomy === "PASSED" || j.status === "completed")) ||
      (statusFilter === "defect" && j.taxonomy === "APP_DEFECT") ||
      (statusFilter === "recovered" && j.taxonomy === "RECOVERED") ||
      (statusFilter === "infra" && (j.taxonomy === "INFRA_ERROR" || j.status === "failed" && j.taxonomy !== "APP_DEFECT"));

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalRuns = filteredJobs.length;
  const passedRuns = filteredJobs.filter(
    (j) => j.taxonomy === "PASSED" || j.taxonomy === "RECOVERED" || j.status === "completed"
  ).length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
  const avgDurationMs =
    totalRuns > 0
      ? Math.round(
          filteredJobs.reduce((acc, j) => acc + (j.duration_ms || 0), 0) / totalRuns
        )
      : 0;
  const totalDefectsFound = filteredJobs.filter((j) => j.taxonomy === "APP_DEFECT").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Film className="h-6 w-6 text-primary" />
                Playwright Test Records & Artifacts
              </h1>
              {!isAllProjects && selectedProject ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <FolderKanban className="h-3 w-3" />
                  {selectedProject.name}
                  <button
                    onClick={() => setSelectedProjectId("all")}
                    className="ml-1 hover:text-foreground text-primary/70 transition-colors"
                    title="Clear filter & show all projects"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                  <Layers className="h-3 w-3" />
                  All Projects ({projects.length})
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {!isAllProjects && selectedProject
                ? `Historical automated Playwright runs, video replays, and synthesized test specs for "${selectedProject.name}"`
                : `Comprehensive test execution history, session videos, DOM snapshots, and code artifacts across all projects`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/playwright">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Play className="h-4 w-4 fill-current" />
                Launch New Run
              </Button>
            </Link>

            <Button
              onClick={fetchJobs}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Executions
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalRuns}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {!isAllProjects && selectedProject ? selectedProject.name : "All workspace runs"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Execution Pass Rate
                </p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">{passRate}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {passedRuns} passed / {totalRuns} total
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avg Run Duration
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {(avgDurationMs / 1000).toFixed(1)}s
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Headless container latency
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Defects Discovered
                </p>
                <p className="text-2xl font-bold text-rose-500 mt-1">{totalDefectsFound}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Auto-logged to backlog
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar & Search Bar */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search URL, prompt, or Job ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/80 h-9 text-xs"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Runs ({jobs.length})
              </button>
              <button
                onClick={() => setStatusFilter("passed")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "passed"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:text-emerald-500"
                }`}
              >
                Passed ({jobs.filter((j) => j.taxonomy === "PASSED" || j.status === "completed").length})
              </button>
              <button
                onClick={() => setStatusFilter("defect")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "defect"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:text-rose-500"
                }`}
              >
                App Defect ({jobs.filter((j) => j.taxonomy === "APP_DEFECT").length})
              </button>
              <button
                onClick={() => setStatusFilter("recovered")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "recovered"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:text-amber-500"
                }`}
              >
                Recovered ({jobs.filter((j) => j.taxonomy === "RECOVERED").length})
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Main Test Execution Records Table */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Execution Records ({filteredJobs.length})</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                Click any record to inspect video, trace & spec
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Loading Playwright test execution records...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-3">
                <Film className="h-10 w-10 mx-auto text-muted-foreground/40 stroke-[1.5]" />
                <p className="text-sm font-semibold text-foreground">No Test Records Found</p>
                <p className="text-xs max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "No test execution matches your active search and filter criteria."
                    : "No automated Playwright test runs have been recorded for this project yet."}
                </p>
                <Link to="/playwright">
                  <Button size="sm" variant="outline" className="mt-2">
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Launch Verification Run
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-secondary/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px] border-b border-border/40">
                    <tr>
                      <th className="py-3 px-4">Status & Taxonomy</th>
                      <th className="py-3 px-4">Target Application URL</th>
                      <th className="py-3 px-4">Verification Goal</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Steps / Latency</th>
                      <th className="py-3 px-4">Artifacts</th>
                      <th className="py-3 px-4">Executed At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredJobs.map((job) => {
                      const isSuccess =
                        job.taxonomy === "PASSED" ||
                        job.taxonomy === "RECOVERED" ||
                        job.status === "completed";
                      const isDefect = job.taxonomy === "APP_DEFECT";

                      return (
                        <tr
                          key={job.id}
                          onClick={() => openInspector(job)}
                          className="hover:bg-accent/40 cursor-pointer transition-colors group"
                        >
                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  isSuccess
                                    ? "default"
                                    : isDefect
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isSuccess
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : isDefect
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {job.taxonomy || (job.status === "completed" ? "PASSED" : job.status)}
                              </Badge>
                              {typeof job.fitness_score === "number" && (
                                <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                                  {job.fitness_score}%
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Target URL */}
                          <td className="py-3.5 px-4 font-mono font-medium text-foreground max-w-[200px] truncate">
                            <span className="hover:text-primary transition-colors flex items-center gap-1">
                              {job.url}
                              <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
                            </span>
                          </td>

                          {/* Goal Snippet */}
                          <td className="py-3.5 px-4 max-w-[240px] truncate text-muted-foreground">
                            {job.prompt}
                          </td>

                          {/* Project Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted border border-border">
                              <FolderKanban className="h-3 w-3 text-primary" />
                              {job.project_name || "Ad-Hoc Run"}
                            </span>
                          </td>

                          {/* Steps / Latency */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            <span>{job.total_steps || 1} steps</span>
                            <span className="mx-1.5">•</span>
                            <span>{job.duration_ms ? `${(job.duration_ms / 1000).toFixed(1)}s` : "—"}</span>
                          </td>

                          {/* Available Artifacts */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {job.video_url && (
                                <span
                                  title="Session Video Available"
                                  className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center"
                                >
                                  <Film className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {job.spec_url && (
                                <span
                                  title="Playwright Spec Available"
                                  className="h-6 w-6 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center"
                                >
                                  <Code className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {job.trace_url && (
                                <span
                                  title="Trace Available"
                                  className="h-6 w-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px] font-mono">
                            {new Date(job.created_at).toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs font-semibold text-primary group-hover:bg-primary/10"
                            >
                              Inspect Run
                              <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Complete Run Inspection Modal */}
        <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="border-b border-border/40 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Film className="h-5 w-5 text-primary" />
                    Inspection for Job: <span className="font-mono text-sm">{selectedJob?.id}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-mono mt-1">
                    {selectedJob?.url} • Goal: {selectedJob?.prompt}
                  </DialogDescription>
                </div>
                {selectedJob?.taxonomy && (
                  <Badge
                    variant={
                      selectedJob.taxonomy === "PASSED" || selectedJob.taxonomy === "RECOVERED"
                        ? "default"
                        : "destructive"
                    }
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    {selectedJob.taxonomy} ({selectedJob.fitness_score || 0}%)
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 py-2 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 flex-shrink-0">
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
                    <TabsTrigger value="steps" className="text-xs gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Steps Timeline ({inspectDetails.steps.length})
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === "code" && specCode && (
                    <Button variant="ghost" size="sm" onClick={copySpec} className="h-7 text-xs gap-1">
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied" : "Copy Code"}
                    </Button>
                  )}
                </div>

                {/* Tab 1: Video */}
                <TabsContent
                  value="video"
                  className="flex-1 min-h-0 data-[state=active]:flex flex-col justify-between overflow-hidden p-1"
                >
                  {selectedJob?.video_url ? (
                    <div className="w-full h-full flex flex-col justify-between min-h-0 space-y-2">
                      <div className="w-full flex-1 min-h-[380px] rounded-lg overflow-hidden border border-border/60 bg-black flex items-center justify-center shadow-inner">
                        <video
                          key={selectedJob.video_url}
                          src={selectedJob.video_url}
                          controls
                          autoPlay
                          playsInline
                          className="w-full h-full object-contain max-h-[480px]"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1">
                        <span>Format: WebM Browser Recording</span>
                        <a
                          href={selectedJob.video_url}
                          download="recording.webm"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Download Video
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-muted-foreground space-y-2">
                      <Film className="h-10 w-10 mx-auto text-muted-foreground/40 stroke-[1.5]" />
                      <p className="text-sm font-semibold">No Video Recording Available</p>
                      <p className="text-xs">This run did not produce a browser recording stream.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Spec Code */}
                <TabsContent
                  value="code"
                  className="flex-1 min-h-0 data-[state=active]:flex flex-col justify-between overflow-hidden p-1"
                >
                  {specCode ? (
                    <div className="w-full h-full flex flex-col justify-between min-h-0 space-y-2">
                      <pre className="w-full flex-1 min-h-0 p-4 rounded-lg bg-zinc-950 border border-border/60 text-emerald-400 font-mono text-xs overflow-auto leading-relaxed shadow-inner selection:bg-primary selection:text-white">
                        <code>{specCode}</code>
                      </pre>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1">
                        <span>Ready for CI/CD Execution (`npx playwright test`)</span>
                        {selectedJob?.spec_url && (
                          <a
                            href={selectedJob.spec_url}
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
                    <div className="py-16 text-center text-muted-foreground space-y-2">
                      <Code className="h-10 w-10 mx-auto text-muted-foreground/40 stroke-[1.5]" />
                      <p className="text-sm font-semibold">No Synthesized Spec Code</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Agent Memory */}
                <TabsContent
                  value="memory"
                  className="flex-1 min-h-0 data-[state=active]:flex flex-col overflow-y-auto space-y-3.5 p-1"
                >
                  <div className="p-3.5 rounded-lg border border-border/60 bg-background/60 space-y-1.5 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Structured Execution Summary
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {memoryData?.structured_summary || "No structured summary captured for this execution."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                        <p className="text-xs text-muted-foreground italic">No assertions passed</p>
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
                  <div className="p-4 rounded-lg border border-border/80 bg-zinc-950 text-zinc-100 space-y-2 font-mono text-xs shadow-inner flex-1 min-h-[160px] flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800 flex-shrink-0">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <Brain className="w-3.5 h-3.5 text-sky-400" />
                        DOM Selector Cache & Heuristics
                      </span>
                    </div>
                    <pre className="overflow-auto text-xs text-emerald-400 font-mono flex-1 p-3 rounded bg-black/80 border border-zinc-850 selection:bg-primary selection:text-white leading-relaxed">
                      {memoryData?.selector_cache && Object.keys(memoryData.selector_cache).length > 0
                        ? JSON.stringify(memoryData.selector_cache, null, 2)
                        : "// No selectors cached."}
                    </pre>
                  </div>
                </TabsContent>

                {/* Tab 4: Steps Timeline with Screenshots */}
                <TabsContent
                  value="steps"
                  className="flex-1 min-h-0 data-[state=active]:flex flex-col overflow-y-auto space-y-2.5 p-1"
                >
                  {inspectDetails.steps.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      No step actions logged for this run.
                    </div>
                  ) : (
                    inspectDetails.steps.map((s) => (
                      <div
                        key={s.id || s.step_number}
                        className="p-3 rounded-lg border border-border/50 bg-background/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                              {s.step_number}
                            </span>
                            <span className="font-semibold text-foreground text-xs font-mono">
                              {s.tool_call_name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {s.duration_ms ? `${s.duration_ms}ms` : "ok"}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">{s.action_taken}</p>

                        {s.tool_args && Object.keys(s.tool_args).length > 0 && (
                          <div className="bg-muted/80 p-2 rounded border border-border/50 text-[11px] font-mono text-foreground overflow-x-auto">
                            {JSON.stringify(s.tool_args, null, 2)}
                          </div>
                        )}

                        {s.screenshot_url && (
                          <div className="pt-2 border-t border-border/30">
                            <a
                              href={s.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative block overflow-hidden rounded border border-border/60 bg-black/60 max-h-36"
                            >
                              <img
                                src={s.screenshot_url}
                                alt={`DOM step ${s.step_number}`}
                                className="w-full h-32 object-cover object-top group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/85 text-[9px] text-white px-1.5 py-0.5 rounded flex items-center gap-1 font-sans">
                                <ArrowUpRight className="w-2.5 h-2.5" /> Full DOM Snapshot
                              </span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

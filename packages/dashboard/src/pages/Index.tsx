import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ReleaseApprovalCard } from "@/components/dashboard/ReleaseApprovalCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import {
  FileText,
  CheckSquare,
  Bug,
  Rocket,
  RefreshCw,
  FolderKanban,
  Check,
  ChevronDown,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/context/ProjectsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Metrics {
  total_requirements: number;
  total_test_cases: number;
  total_defects: number;
  open_defects: number;
  critical_defects: number;
  test_pass_rate: number;
  pending_releases: number;
  overall_risk_score: number;
  coverage_percent: number;
}

interface ProjectData {
  id: number;
  name: string;
  description: string;
  status: string;
  target_release_date: string;
  risk_score?: number;
  coverage_percent?: number;
  defects_open?: number;
  team_count?: number;
}

interface Activity {
  id: string | number;
  type: string;
  user: { name: string };
  action: string;
  target: string;
  project: string;
  timestamp: string | Date;
}

interface ReleaseData {
  id: number;
  version: string;
  project_id: number;
  status: string;
  planned_release_date: string;
  go_no_go_decision?: string;
  risk_score?: number;
}

interface ApproverData {
  id: string;
  name: string;
  role: string;
  status: "approved" | "pending" | "rejected";
  timestamp?: string;
}

export default function Index() {
  const { projects: contextProjects, selectedProjectId, setSelectedProjectId, selectedProject } = useProjects();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [releaseApprovals, setReleaseApprovals] = useState<{ [releaseId: number]: ApproverData[] }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const isAllProjects = !selectedProjectId || selectedProjectId === "all";

  const fetchData = async () => {
    setError(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const projParam = selectedProjectId && selectedProjectId !== "all" ? `?projectId=${selectedProjectId}` : "";

      // Fetch projects
      const projectsRes = await fetch("/api/projects/", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      let projectsData: ProjectData[] = [];
      if (projectsRes.ok) {
        projectsData = await projectsRes.json();
      }
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      // Fetch metrics (filtered by selected project)
      const metricsRes = await fetch(`/api/metrics/dashboard${projParam}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (metricsRes.status === 401) {
        localStorage.removeItem("authToken");
        window.location.href = "/login";
        return;
      }
      let metricsData: Metrics | null = null;
      if (metricsRes.ok) {
        metricsData = await metricsRes.json();
      }
      setMetrics(metricsData);

      // Fetch activity (filtered by selected project)
      try {
        const activityRes = await fetch(`/api/metrics/activity${projParam}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        let activityData: any[] = [];
        if (activityRes.ok) {
          activityData = await activityRes.json();
        }
        const transformedActivities = Array.isArray(activityData)
          ? activityData.map((act: any) => ({
            id: act.id,
            type: act.activity_type as any,
            user: { name: "System" },
            action: act.description?.split(":")[0]?.toLowerCase() || "",
            target: act.description?.split(":")[1]?.trim() || "",
            project: act.project_name,
            timestamp: new Date(act.timestamp),
          }))
          : [];
        setActivities(transformedActivities.slice(0, 5));
      } catch (err) {
        setActivities([]);
      }

      // Fetch releases
      try {
        const releasesRes = await fetch("/api/releases/", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        let releasesData: any[] = [];
        if (releasesRes.ok) {
          releasesData = await releasesRes.json();
        }
        let pendingReleases = Array.isArray(releasesData)
          ? releasesData.filter((r: any) => r.status !== "released")
          : [];

        if (!isAllProjects && selectedProjectId) {
          pendingReleases = pendingReleases.filter(
            (r: any) => String(r.project_id) === String(selectedProjectId)
          );
        }
        setReleases(pendingReleases.slice(0, 3));

        // Fetch approvals for each release
        for (const release of pendingReleases.slice(0, 3)) {
          try {
            const approvalsRes = await fetch(`/api/releases/${release.id}/approvals`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            let approvalsData: any[] = [];
            if (approvalsRes.ok) {
              approvalsData = await approvalsRes.json();
            }
            if (Array.isArray(approvalsData)) {
              setReleaseApprovals((prev) => ({
                ...prev,
                [release.id]: approvalsData,
              }));
            }
          } catch (err) {
            // Ignore single approval fetch failures
          }
        }
      } catch (err) {
        setReleases([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError("An unexpected error occurred while fetching dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedProjectId]);

  if (loading) return (
    <DashboardLayout>
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Loading project analytics...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="p-8 text-destructive">{error}</div>
    </DashboardLayout>
  );

  if (!metrics) return (
    <DashboardLayout>
      <div className="p-8 text-muted-foreground">No metrics data available.</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Project Filter Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Executive Quality Dashboard
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
                ? `Filtered quality intelligence, defect density, and release readiness for "${selectedProject.name}"`
                : `Enterprise-wide quality intelligence and release governance across all ${projects.length} active projects`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* On-Dashboard Project Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-background shadow-sm border-border hover:border-primary/50 transition-colors">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <span className="max-w-[160px] truncate font-medium">
                    {isAllProjects ? "All Projects" : selectedProject?.name || "Select Project"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Filter Dashboard Analytics
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedProjectId("all")}
                  className={cn(
                    "flex items-center justify-between cursor-pointer py-2",
                    isAllProjects && "bg-accent/15 font-semibold text-primary"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>All Projects (Enterprise Overview)</span>
                  </div>
                  {isAllProjects && <Check className="h-4 w-4 text-primary ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((proj) => {
                  const isSelected = !isAllProjects && (proj.id === selectedProjectId || String(proj.id) === String(selectedProjectId));
                  return (
                    <DropdownMenuItem
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer py-2",
                        isSelected && "bg-accent/15 font-semibold text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={cn(
                          "h-2 w-2 rounded-full flex-shrink-0",
                          proj.status === "at-risk" || proj.status === "delayed" ? "bg-amber-500" : "bg-emerald-500"
                        )} />
                        <span className="truncate text-xs">{proj.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Last updated: {Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </div>

            <Button onClick={() => { setLoading(true); fetchData(); }} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Requirements"
            value={metrics.total_requirements}
            subtitle={`across ${projects.length} projects`}
            trend={{ value: 12, label: "this month" }}
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
          />
          <MetricCard
            title="Test Cases"
            value={metrics.total_test_cases}
            subtitle={`${typeof metrics.test_pass_rate === "number" ? metrics.test_pass_rate.toFixed(1) : "0.0"}% pass rate`}
            trend={{ value: 8, label: "this month" }}
            icon={<CheckSquare className="h-5 w-5 text-muted-foreground" />}
          />
          <MetricCard
            title="Open Defects"
            value={metrics.open_defects}
            subtitle={`${metrics.critical_defects} critical`}
            trend={{ value: metrics.open_defects > 5 ? -15 : 5, label: "vs last week" }}
            icon={<Bug className="h-5 w-5 text-muted-foreground" />}
            variant={metrics.open_defects > 10 ? "warning" : "default"}
          />
          <MetricCard
            title="Pending Releases"
            value={metrics.pending_releases}
            subtitle={`${Math.max(0, metrics.pending_releases - 1)} ready for approval`}
            icon={<Rocket className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          {/* Left Column - Risk Overview & Chart */}
          <div className="lg:col-span-2 space-y-6 h-full flex flex-col">
            {/* Risk Gauges */}
            <div className="metric-card">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Enterprise Risk Overview
                </h3>
                <p className="text-sm text-muted-foreground">
                  Real-time risk assessment across {projects.length} active projects
                </p>
              </div>
              <div className="flex items-center justify-around flex-wrap gap-4">
                <RiskGauge
                  score={Math.min(100, Math.max(0, parseFloat(typeof metrics.overall_risk_score === "number" ? metrics.overall_risk_score.toFixed(1) : "0.0")))}
                  label="Overall Risk Index"
                  size="lg"
                />
                <div className="h-32 w-px bg-border" />
                <div className="grid grid-cols-2 gap-6">
                  <RiskGauge
                    score={Math.min(100, Math.max(0, parseFloat(typeof metrics.coverage_percent === "number" ? metrics.coverage_percent.toFixed(1) : "0.0")))}
                    label="Coverage %"
                    size="sm"
                  />
                  <RiskGauge
                    score={Math.min(100, Math.max(0, parseFloat(typeof metrics.open_defects === "number" && typeof metrics.total_test_cases === "number" ? ((metrics.open_defects / Math.max(1, metrics.total_test_cases)) * 100).toFixed(1) : "0.0")))}
                    label="Defect Density"
                    size="sm"
                  />
                  <RiskGauge
                    score={Math.min(100, Math.max(0, parseFloat(typeof metrics.test_pass_rate === "number" ? metrics.test_pass_rate.toFixed(1) : "0.0")))}
                    label="Test Pass Rate"
                    size="sm"
                  />
                  <RiskGauge
                    score={Math.min(100, Math.max(0, parseFloat(typeof metrics.critical_defects === "number" && typeof metrics.total_defects === "number" ? (100 - (metrics.critical_defects / Math.max(1, metrics.total_defects) * 100)).toFixed(1) : "0.0")))}
                    label="Release Ready"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Quality Trends Chart removed temporarily */}

            {/* Projects Grid */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Active Projects
                </h3>
                <Link to="/projects" className="text-sm font-medium text-accent hover:underline">
                  View all projects
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={String(project.id)}
                    name={project.name}
                    description={project.description}
                    riskScore={project.risk_score || 0}
                    coveragePercent={project.coverage_percent || 0}
                    defectsOpen={project.defects_open || 0}
                    releaseDate={new Date(
                      project.target_release_date
                    ).toLocaleDateString()}
                    team={project.team_count || 0}
                    status={(project.status as "on-track" | "at-risk" | "blocked") || "on-track"}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Approvals, Activity, AI */}
          <div className="space-y-6 h-full flex flex-col">
            {/* Release Approval - Show first pending release or first release */}
            <div className="h-full">
              {releases.length > 0 ? (
                <ReleaseApprovalCard
                  version={releases[0].version}
                  project={projects.find(p => p.id === releases[0].project_id)?.name || "Unknown Project"}
                  releaseDate={new Date(releases[0].planned_release_date).toLocaleDateString()}
                  riskScore={releases[0].risk_score || metrics?.overall_risk_score || 0}
                  status={(releases[0].go_no_go_decision?.toLowerCase() as any) || "pending"}
                  approvers={releaseApprovals[releases[0].id] || []}
                  releaseId={releases[0].id}
                />
              ) : (
                <ReleaseApprovalCard
                  version="No pending releases"
                  project="All projects"
                  releaseDate="—"
                  riskScore={0}
                  status="pending"
                  approvers={[]}
                />
              )}
            </div>

            <div className="h-full">
              <AIInsightsPanel />
            </div>

            <div className="h-full">
              <ActivityFeed activities={activities as any} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

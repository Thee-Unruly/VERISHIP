import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ReleaseApprovalCard } from "@/components/dashboard/ReleaseApprovalCard";
// QualityTrendChart removed from dashboard for now
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import {
  FileText,
  CheckSquare,
  Bug,
  Rocket,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [releaseApprovals, setReleaseApprovals] = useState<{ [releaseId: number]: ApproverData[] }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setError(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      // Fetch projects
      const projectsRes = await fetch("/api/projects/", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      let projectsData: ProjectData[] = [];
      if (projectsRes.ok) {
        projectsData = await projectsRes.json();
      } else {
        setError("Failed to fetch projects: " + projectsRes.status);
      }
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      // Fetch metrics
      const metricsRes = await fetch("/api/metrics/dashboard", {
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
      } else {
        setError("Failed to fetch metrics: " + metricsRes.status);
      }
      setMetrics(metricsData);

      // Fetch activity
      try {
        const activityRes = await fetch("/api/metrics/activity", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (activityRes.status === 401) {
          localStorage.removeItem("authToken");
          window.location.href = "/login";
          return;
        }
        let activityData: any[] = [];
        if (activityRes.ok) {
          activityData = await activityRes.json();
        } else {
          setError("Failed to fetch activity: " + activityRes.status);
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
        setError("Error fetching activity");
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
        } else {
          setError("Failed to fetch releases: " + releasesRes.status);
        }
        const pendingReleases = Array.isArray(releasesData)
          ? releasesData.filter((r: any) => r.status !== "released").slice(0, 3)
          : [];
        setReleases(pendingReleases);

        // Fetch approvals for each release
        for (const release of pendingReleases) {
          try {
            const approvalsRes = await fetch(`/api/releases/${release.id}/approvals`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            let approvalsData: any[] = [];
            if (approvalsRes.ok) {
              approvalsData = await approvalsRes.json();
            }
            const transformedApprovals = Array.isArray(approvalsData)
              ? approvalsData.map((approval: any) => ({
                id: approval.id.toString(),
                name: approval.approver_name,
                role: approval.approver_role || "Team Member",
                status: approval.status?.toLowerCase() as "approved" | "pending" | "rejected",
                timestamp: approval.approved_at ? new Date(approval.approved_at).toLocaleString() : undefined,
              }))
              : [];
            setReleaseApprovals(prev => ({
              ...prev,
              [release.id]: transformedApprovals
            }));
          } catch (err) {
            // Ignore approval errors for now
          }
        }
      } catch (err) {
        setError("Error fetching releases");
        setReleases([]);
      }

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError("Error fetching data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh once per day to avoid unnecessary LLM token usage
    const DAILY_MS = 24 * 60 * 60 * 1000;
    const interval = setInterval(fetchData, DAILY_MS);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!metrics) return <div className="p-6 text-red-600">No metrics data available.</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Executive Quality Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Enterprise-wide quality intelligence and release governance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground mt-1">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Last updated: {Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </div>
            <Button onClick={() => { setLoading(true); fetchData(); }} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
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

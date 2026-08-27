import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";

interface TrendPoint {
  date: string;
  coverage: number;
  defects: number;
  risk: number;
}

export function QualityTrendChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects/");
        if (!res.ok) throw new Error("Failed to load projects");
        const json = await res.json();
        if (mounted) setProjects(json || []);
        if (mounted && json && json.length > 0 && selectedProject === "") {
          setSelectedProject(json[0].id);
        }
      } catch (e) {
        if (mounted) setProjects([]);
      }
    };
    fetchProjects();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const url = selectedProject ? `/api/metrics/trends?project_id=${selectedProject}` : "/api/metrics/trends";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load trends");
        const json = await res.json();
        if (mounted) setData(json || []);
      } catch (e) {
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTrends();
    return () => { mounted = false; };
  }, [selectedProject]);

  return (
    <div className="metric-card metric-card-compact">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Quality Trends</h3>
          <p className="text-sm text-muted-foreground">Coverage, defects, and risk over time</p>
        </div>
        <div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value || "")}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDefects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px hsl(222, 47%, 11%, 0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="coverage"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCoverage)"
              name="Coverage"
            />
            <Area
              type="monotone"
              dataKey="risk"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRisk)"
              name="Risk Score"
            />
            <Area
              type="monotone"
              dataKey="defects"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDefects)"
              name="Open Defects"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6">
        {/* Legend */}
        <div className="mt-4 flex justify-center gap-6">
          <span className="text-sm text-muted-foreground">Coverage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">Risk Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Open Defects</span>
        </div>
      </div>
    </div>
  );
}

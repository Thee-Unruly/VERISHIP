import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  FileText,
  Bug,
  Rocket,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface Activity {
  id: string | number;
  type: "approval" | "requirement" | "defect" | "release" | "ai" | "alert" | "requirement_created" | "defect_created" | "release_created" | "test_executed";
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target: string;
  project: string;
  timestamp: string | Date;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Note: ActivityFeed supports live relative-time updates via an internal tick
// state that forces a re-render periodically so "x min ago" labels update.

const getTypeConfig = (type: string) => {
  switch (type) {
    case "approval":
      return { icon: CheckCircle2, class: "bg-success/10 text-success" };
    case "requirement":
    case "requirement_created":
      return { icon: FileText, class: "bg-accent/10 text-accent" };
    case "defect":
    case "defect_created":
      return { icon: Bug, class: "bg-destructive/10 text-destructive" };
    case "release":
    case "release_created":
      return { icon: Rocket, class: "bg-info/10 text-info" };
    case "ai":
      return { icon: Sparkles, class: "bg-chart-5/10 text-chart-5" };
    case "alert":
      return { icon: AlertTriangle, class: "bg-warning/10 text-warning" };
    case "test_executed":
      return { icon: CheckCircle2, class: "bg-success/10 text-success" };
    default:
      return { icon: FileText, class: "bg-muted text-muted-foreground" };
  }
};

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  const [localActivities, setLocalActivities] = useState<Activity[] | null>(null);
  const displayActivities = activities.length > 0 ? activities : (localActivities || []);

  // internal tick forces periodic re-render so relative timestamps update
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // If parent didn't pass activities, fetch from backend activity endpoint
  useEffect(() => {
    let mounted = true;
    if (activities && activities.length > 0) return;

    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch("/api/metrics/activity?limit=6", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const transformed = data.map((act: any) => ({
          id: act.id,
          type: act.activity_type,
          user: { name: act.user_name || "System" },
          action: (act.description || "").split(":")[0].toLowerCase(),
          target: (act.description || "").split(":")[1]?.trim() || "",
          project: act.project_name || "",
          timestamp: new Date(act.timestamp),
        } as Activity));
        if (mounted) setLocalActivities(transformed.slice(0, 6));
      } catch (err) {
        console.error("Error fetching activity feed:", err);
      }
    };

    fetchActivity();
    const DAILY_MS = 24 * 60 * 60 * 1000;
    const poll = setInterval(fetchActivity, DAILY_MS);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [activities]);
  return (
    <div className="metric-card metric-card-compact">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            Latest updates across all projects
          </p>
        </div>
        <button className="text-sm font-medium text-accent hover:underline">
          View all
        </button>
      </div>

      <div className="space-y-3">
        {displayActivities.map((activity) => {
          const config = getTypeConfig(activity.type);
          const Icon = config.icon;
          const timeStr = typeof activity.timestamp === 'string'
            ? activity.timestamp
            : activity.timestamp instanceof Date
              ? getRelativeTime(activity.timestamp)
              : 'just now';

          return (
            <div key={activity.id} className="flex gap-3">
              <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-full", config.class)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.user.name}</span>{" "}
                  {activity.action}{" "}
                  <span className="font-medium text-accent">{activity.target}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{activity.project}</span>
                  <span>•</span>
                  <span>{timeStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

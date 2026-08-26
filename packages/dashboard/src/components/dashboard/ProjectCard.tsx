import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  riskScore: number;
  coveragePercent: number;
  defectsOpen: number;
  releaseDate: string;
  team: number;
  status: "on-track" | "at-risk" | "blocked";
}

export function ProjectCard({
  id,
  name,
  description,
  riskScore,
  coveragePercent,
  defectsOpen,
  releaseDate,
  team,
  status,
}: ProjectCardProps) {
  const getRiskBadge = (score: number) => {
    if (score <= 30) return { label: "Low Risk", class: "risk-low" };
    if (score <= 60) return { label: "Medium Risk", class: "risk-medium" };
    return { label: "High Risk", class: "risk-high" };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "on-track":
        return { icon: CheckCircle2, label: "On Track", class: "text-success" };
      case "at-risk":
        return { icon: AlertTriangle, label: "At Risk", class: "text-warning" };
      case "blocked":
        return { icon: Clock, label: "Blocked", class: "text-destructive" };
      default:
        return { icon: CheckCircle2, label: "Unknown", class: "text-muted-foreground" };
    }
  };

  const risk = getRiskBadge(riskScore);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <Link
      to={`/projects/${id}`}
      className="group block"
    >
      <div className="metric-card metric-card-compact h-full transition-all duration-300 group-hover:border-accent/40 group-hover:shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
              {name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
          <span className={cn("risk-indicator", risk.class)}>{risk.label}</span>
        </div>

        {/* Coverage Progress */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Test Coverage</span>
            <span className="font-medium text-foreground">{coveragePercent}%</span>
          </div>
          <Progress value={coveragePercent} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{defectsOpen}</p>
            <p className="text-xs text-muted-foreground">Open Defects</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{team}</p>
            <p className="text-xs text-muted-foreground">Team</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{riskScore}</p>
            <p className="text-xs text-muted-foreground">Risk Index</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{releaseDate}</span>
          </div>
          <div className={cn("flex items-center gap-1.5 text-xs font-medium", statusConfig.class)}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

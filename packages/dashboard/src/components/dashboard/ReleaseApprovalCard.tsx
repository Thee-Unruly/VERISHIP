import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { EditReleaseModal } from "@/components/modals/EditReleaseModal";

interface Approver {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: "approved" | "pending" | "rejected";
  timestamp?: string;
}

interface ReleaseApprovalCardProps {
  version: string;
  project: string;
  releaseDate: string;
  riskScore: number;
  status: "go" | "conditional" | "no-go" | "pending";
  approvers: Approver[];
  releaseId?: number;
  onDetailsClick?: () => void;
  onApproveClick?: () => void;
}

export function ReleaseApprovalCard({
  version,
  project,
  releaseDate,
  riskScore,
  status,
  approvers,
  releaseId,
  onDetailsClick,
  onApproveClick,
}: ReleaseApprovalCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "go":
        return {
          label: "GO",
          class: "bg-success text-success-foreground",
          icon: CheckCircle2,
        };
      case "conditional":
        return {
          label: "CONDITIONAL GO",
          class: "bg-warning text-warning-foreground",
          icon: AlertTriangle,
        };
      case "no-go":
        return {
          label: "NO GO",
          class: "bg-destructive text-destructive-foreground",
          icon: XCircle,
        };
      default:
        return {
          label: "PENDING",
          class: "bg-muted text-muted-foreground",
          icon: Clock,
        };
    }
  };

  const getApproverStatus = (status: string) => {
    switch (status) {
      case "approved":
        return { icon: CheckCircle2, class: "text-success" };
      case "rejected":
        return { icon: XCircle, class: "text-destructive" };
      default:
        return { icon: Clock, class: "text-muted-foreground" };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="metric-card metric-card-compact">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{version}</h3>
            <Badge className={statusConfig.class}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{project}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Release Date</p>
          <p className="font-medium text-foreground">{releaseDate}</p>
        </div>
      </div>

      {/* Risk Score */}
      <div className="mb-4 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Enterprise Release Risk Index
          </span>
          <span
            className={cn(
              "text-2xl font-bold",
              riskScore <= 30
                ? "text-success"
                : riskScore <= 60
                  ? "text-warning"
                  : "text-destructive"
            )}
          >
            {riskScore}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-500",
              riskScore <= 30
                ? "bg-success"
                : riskScore <= 60
                  ? "bg-warning"
                  : "bg-destructive"
            )}
            style={{ width: `${riskScore}%` }}
          />
        </div>
      </div>

      {/* Approvers */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Required Approvals</p>
        {approvers.map((approver) => {
          const approverStatus = getApproverStatus(approver.status);
          const ApproverIcon = approverStatus.icon;
          return (
            <div
              key={approver.id}
              className="flex items-center justify-between rounded-lg border border-border p-2"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={approver.avatar} />
                  <AvatarFallback className="text-xs">
                    {approver.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {approver.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{approver.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {approver.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {approver.timestamp}
                  </span>
                )}
                <ApproverIcon className={cn("h-5 w-5", approverStatus.class)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => {
            setSelectedRelease({ id: releaseId, version, project, status });
            setIsEditModalOpen(true);
            onDetailsClick?.();
          }}
        >
          View Details
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        {status === "pending" && (
          <Button
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              setSelectedRelease({ id: releaseId, version, project, status });
              setIsEditModalOpen(true);
              onApproveClick?.();
            }}
          >
            Review & Approve
          </Button>
        )}
      </div>

      {releaseId && selectedRelease && (
        <EditReleaseModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          release={selectedRelease}
          onSuccess={() => {
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

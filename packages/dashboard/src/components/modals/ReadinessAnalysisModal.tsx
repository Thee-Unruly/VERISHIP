import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CircleAlert, ShieldCheck, ShieldX } from "lucide-react";

interface BlockingIssue {
  issue_type: string;
  identifier: string;
  title: string;
  status: string;
  severity?: string;
}

interface ReadinessAnalysis {
  release_id: string;
  risk_score: number;
  go_no_go_decision: string;
  summary: string;
  blockers: BlockingIssue[];
}

interface ReadinessAnalysisModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  analysis: ReadinessAnalysis | null;
}

export function ReadinessAnalysisModal({
  isOpen,
  onOpenChange,
  analysis,
}: ReadinessAnalysisModalProps) {
  if (!analysis) return null;

  const getDecisionIcon = () => {
    switch (analysis.go_no_go_decision.toUpperCase()) {
      case 'GO':
        return <ShieldCheck className="h-12 w-12 text-green-500" />;
      case 'NO-GO':
        return <ShieldX className="h-12 w-12 text-destructive" />;
      case 'CONDITIONAL':
        return <CircleAlert className="h-12 w-12 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Release Readiness Analysis: {analysis.release_id}</DialogTitle>
          <DialogDescription>
            Copilot's assessment of the release readiness based on current project data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-6 py-4 text-center">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-muted-foreground">Decision</p>
            {getDecisionIcon()}
            <p className="text-xl font-bold">{analysis.go_no_go_decision}</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
            <p className="text-5xl font-bold text-destructive">{analysis.risk_score.toFixed(1)}</p>
          </div>
           <div className="col-span-3 sm:col-span-1 flex flex-col items-center gap-2 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-muted-foreground">Summary</p>
            <p className="text-center text-sm">{analysis.summary}</p>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold">Blocking Issues ({analysis.blockers.length})</h3>
          <div className="max-h-[250px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.blockers.length > 0 ? (
                  analysis.blockers.map((blocker) => (
                    <TableRow key={blocker.identifier}>
                      <TableCell className="font-medium">{blocker.identifier}</TableCell>
                      <TableCell>{blocker.title}</TableCell>
                      <TableCell><Badge variant="outline">{blocker.issue_type}</Badge></TableCell>
                      <TableCell><Badge variant="destructive">{blocker.severity}</Badge></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No blocking issues found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

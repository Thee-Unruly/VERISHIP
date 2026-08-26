import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckReleaseReadinessModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    releaseId: number;
    releaseVersion: string;
}

interface BlockingIssue {
    issue_type: string;
    identifier: string;
    title: string;
    status: string;
    severity?: string;
}

interface ReadinessResult {
    release_id: string;
    risk_score: number;
    go_no_go_decision: string;
    summary: string;
    blockers: BlockingIssue[];
}

export function CheckReleaseReadinessModal({
    isOpen,
    onOpenChange,
    releaseId,
    releaseVersion,
}: CheckReleaseReadinessModalProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ReadinessResult | null>(null);
    const { toast } = useToast();

    const handleCheck = async () => {

        setLoading(true);

        try {

            const response = await fetch(`/api/copilot/check-release-readiness/${releaseId}`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                },

            });



            if (!response.ok) {

                throw new Error("Failed to check release readiness");

            }



            const data = await response.json();

            setResult(data);

            toast({ title: "Analysis Complete", description: "Release readiness analysis completed." });

        } catch (error) {

            toast({

                title: "Error",

                description: error instanceof Error ? error.message : "Failed to check release readiness",

                variant: "destructive",

            });

        } finally {

            setLoading(false);

        }

    };

    const handleClose = () => {
        setResult(null);
        onOpenChange(false);
    };

    const getSeverityColor = (severity?: string) => {
        switch (severity?.toLowerCase()) {
            case "critical":
                return "bg-red-100 text-red-800";
            case "high":
                return "bg-orange-100 text-orange-800";
            case "medium":
                return "bg-yellow-100 text-yellow-800";
            case "low":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Release Readiness Check
                    </DialogTitle>
                    <DialogDescription>{releaseVersion}</DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            The AI will analyze critical defects, test coverage, and other quality gates to determine if the release is ready to go.
                        </p>
                        <Button onClick={handleCheck} disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                "Check Release Readiness"
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Go/No-Go Decision */}
                        <Alert className={result.go_no_go_decision === "GO" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                            <div className="flex items-start gap-3">
                                {result.go_no_go_decision === "GO" ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                )}
                                <div>
                                    <h3 className={`font-semibold ${result.go_no_go_decision === "GO" ? "text-green-900" : "text-red-900"}`}>
                                        {result.go_no_go_decision === "GO" ? "✓ Release is GO" : "✗ Release is NO-GO"}
                                    </h3>
                                    <p className={`text-sm mt-1 ${result.go_no_go_decision === "GO" ? "text-green-800" : "text-red-800"}`}>
                                        {result.summary}
                                    </p>
                                </div>
                            </div>
                        </Alert>

                        {/* Risk Score */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold">Risk Score</label>
                                <Badge variant={result.risk_score > 70 ? "destructive" : result.risk_score > 40 ? "secondary" : "default"}>
                                    {result.risk_score.toFixed(1)}%
                                </Badge>
                            </div>
                            <Progress
                                value={result.risk_score}
                                className="h-3"
                            />
                            <p className="text-xs text-muted-foreground">
                                {result.risk_score > 70
                                    ? "High risk - significant issues detected"
                                    : result.risk_score > 40
                                        ? "Moderate risk - some concerns to address"
                                        : "Low risk - release is well-prepared"}
                            </p>
                        </div>

                        {/* Blocking Issues */}
                        {result.blockers.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                    Blocking Issues ({result.blockers.length})
                                </label>
                                <div className="space-y-2">
                                    {result.blockers.map((blocker, idx) => (
                                        <div key={idx} className="rounded-lg border p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{blocker.title}</p>
                                                    <p className="text-xs text-muted-foreground">{blocker.identifier}</p>
                                                </div>
                                                {blocker.severity && (
                                                    <Badge className={getSeverityColor(blocker.severity)}>
                                                        {blocker.severity}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <Badge variant="outline">{blocker.issue_type}</Badge>
                                                <Badge variant="outline">{blocker.status}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.blockers.length === 0 && (
                            result.go_no_go_decision === "GO" ? (
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800 ml-2">
                                        No critical blocking issues detected. Release can proceed!
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert className="border-yellow-200 bg-yellow-50">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription className="text-yellow-800 ml-2">
                                        No critical blocking issues detected, but the AI recommends "{result.go_no_go_decision}". {result.summary}
                                    </AlertDescription>
                                </Alert>
                            )
                        )}

                        <Button onClick={handleClose} className="w-full">
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

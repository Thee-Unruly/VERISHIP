import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Loader,
    History,
    RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyzeRequirementModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    requirementId: string | number;
    requirementTitle: string;
    onSuccess?: () => void;
}

interface AnalysisResult {
    timestamp?: string;
    clarity_score: number;
    testability_score?: number;
    is_testable: boolean;
    ambiguous_terms: string[];
    missing_criteria: string[];
    suggestions: string[];
}

export function AnalyzeRequirementModal({
    isOpen,
    onOpenChange,
    requirementId,
    requirementTitle,
    onSuccess,
}: AnalyzeRequirementModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [history, setHistory] = useState<AnalysisResult[]>([]);
    const [activeTab, setActiveTab] = useState<"analysis" | "history">("analysis");
    const { toast } = useToast();

    // Fetch existing analysis and history when modal opens
    useEffect(() => {
        if (!isOpen || !requirementId) return;

        const loadExistingAnalysis = async () => {
            setFetchingHistory(true);
            try {
                const response = await fetch(
                    `/api/copilot/analyze-requirement-clarity/${requirementId}`,
                    {
                        headers: {
                            "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                        }
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.analysis) {
                        setAnalysis(data.analysis);
                    }
                    if (Array.isArray(data.history)) {
                        setHistory(data.history);
                    }
                }
            } catch (err) {
                console.error("Failed to load existing clarity analysis:", err);
            } finally {
                setFetchingHistory(false);
            }
        };

        loadExistingAnalysis();
    }, [isOpen, requirementId]);

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/copilot/analyze-requirement-clarity/${requirementId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                    },
                    body: JSON.stringify({}),
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to analyze requirement");
            }

            const data = await response.json();
            setAnalysis(data);
            if (Array.isArray(data.history)) {
                setHistory(data.history);
            }

            toast({
                title: "Analysis Complete",
                description: `Clarity score updated to ${data.clarity_score.toFixed(1)}%.`,
            });
            onSuccess?.();
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to analyze requirement",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-accent" />
                            Analyze Requirement Clarity
                        </DialogTitle>
                        {history.length > 0 && (
                            <div className="flex gap-1 bg-muted p-1 rounded-md text-xs">
                                <Button
                                    size="sm"
                                    variant={activeTab === "analysis" ? "default" : "ghost"}
                                    onClick={() => setActiveTab("analysis")}
                                    className="h-6 px-2 text-xs"
                                >
                                    Current
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeTab === "history" ? "default" : "ghost"}
                                    onClick={() => setActiveTab("history")}
                                    className="h-6 px-2 text-xs flex items-center gap-1"
                                >
                                    <History className="h-3 w-3" />
                                    History ({history.length})
                                </Button>
                            </div>
                        )}
                    </div>
                    <DialogDescription>{requirementTitle}</DialogDescription>
                </DialogHeader>

                {fetchingHistory ? (
                    <div className="py-8 flex justify-center items-center gap-2 text-sm text-muted-foreground">
                        <Loader className="h-4 w-4 animate-spin" />
                        Loading requirement details...
                    </div>
                ) : activeTab === "history" ? (
                    <div className="space-y-4 py-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            Previous Clarity Tests
                        </h4>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {history.map((item, idx) => (
                                <div key={idx} className="border rounded-lg p-3 bg-card space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : `Test #${history.length - idx}`}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={item.clarity_score >= 70 ? "default" : "secondary"}>
                                                Score: {item.clarity_score.toFixed(1)}%
                                            </Badge>
                                            <Badge variant={item.is_testable ? "outline" : "destructive"}>
                                                {item.is_testable ? "Testable" : "Untestable"}
                                            </Badge>
                                        </div>
                                    </div>
                                    {item.ambiguous_terms?.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            <strong>Ambiguities:</strong> {item.ambiguous_terms.join(", ")}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !analysis ? (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            The AI will analyze this requirement for clarity, testability,
                            ambiguous terms, and completeness.
                        </p>
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                "Start Analysis"
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Clarity Score */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-semibold">Clarity Score</label>
                                    {analysis.timestamp && (
                                        <p className="text-xs text-muted-foreground">
                                            Last evaluated: {new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                                <Badge
                                    variant={analysis.clarity_score >= 70 ? "default" : "secondary"}
                                    className="text-sm px-2.5 py-0.5"
                                >
                                    {analysis.clarity_score.toFixed(1)}%
                                </Badge>
                            </div>
                            <Progress value={analysis.clarity_score} className="h-2" />
                        </div>

                        {/* Testability */}
                        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                            {analysis.is_testable ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium">
                                        Requirement is testable
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                    <span className="text-sm font-medium">
                                        Requirement may be difficult to test
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Ambiguous Terms */}
                        {analysis.ambiguous_terms?.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                    Ambiguous Terms Found ({analysis.ambiguous_terms.length})
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.ambiguous_terms.map((term, idx) => (
                                        <Badge key={idx} variant="outline">
                                            "{term}"
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {analysis.suggestions?.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">
                                    Suggested Acceptance Criteria & Improvements
                                </label>
                                <ul className="space-y-1.5">
                                    {analysis.suggestions.map((s, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                            → {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleAnalyze}
                                disabled={loading}
                                variant="outline"
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Re-analyzing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Re-Analyze
                                    </>
                                )}
                            </Button>
                            <Button onClick={handleClose} className="flex-1">
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

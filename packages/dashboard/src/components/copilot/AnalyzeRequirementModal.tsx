import { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyzeRequirementModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    requirementId: string | number;
    requirementTitle: string;
}

interface AnalysisResult {
    clarity_score: number;
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
}: AnalyzeRequirementModalProps) {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const { toast } = useToast();

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
                }
            );

            if (!response.ok) {
                throw new Error("Failed to analyze requirement");
            }

            const data: AnalysisResult = await response.json();
            setAnalysis(data);

            toast({
                title: "Analysis Complete",
                description: "Requirement analysis has been completed.",
            });
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
        setAnalysis(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Analyze Requirement Clarity
                    </DialogTitle>
                    <DialogDescription>{requirementTitle}</DialogDescription>
                </DialogHeader>

                {!analysis ? (
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
                                <label className="text-sm font-semibold">Clarity Score</label>
                                <Badge
                                    variant={analysis.clarity_score >= 70 ? "default" : "secondary"}
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
                        {analysis.ambiguous_terms.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                    Ambiguous Terms Found
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
                        {analysis.suggestions.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">
                                    Improvement Suggestions
                                </label>
                                <ul className="space-y-1">
                                    {analysis.suggestions.map((s, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground">
                                            → {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
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

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    Target,
    AlertCircle,
    ExternalLink
} from "lucide-react";

interface LoadTestSummaryModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    jobId: string;
}

interface LoadTestSummary {
    job_id: string;
    status: string;
    target_host: string;
    users: number;
    duration: string;
    overall: {
        total_requests: number;
        failures: number;
        success_rate: number;
        avg_response_time: number;
        min_response_time: number;
        max_response_time: number;
        requests_per_second: number;
        median_response_time: number;
        percentile_95: number;
        percentile_99: number;
    };
    endpoints: Array<{
        name: string;
        requests: number;
        failures: number;
        avg_response_time: number;
        rps: number;
    }>;
}

export function LoadTestSummaryModal({
    isOpen,
    onOpenChange,
    jobId,
}: LoadTestSummaryModalProps) {
    const [summary, setSummary] = useState<LoadTestSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && jobId) {
            fetchSummary();
        }
    }, [isOpen, jobId]);

    const fetchSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/load-testing/${jobId}/summary`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSummary(data);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Failed to load summary");
            }
        } catch (error) {
            console.error("Failed to fetch summary:", error);
            setError("Failed to load summary. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const viewFullReport = () => {
        window.open(`/api/load-testing/${jobId}/report`, "_blank");
    };

    if (error) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Load Test Summary</DialogTitle>
                    </DialogHeader>
                    <div className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={viewFullReport} variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full HTML Report
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (loading || !summary) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Load Test Summary</DialogTitle>
                    </DialogHeader>
                    <div className="py-12 text-center text-muted-foreground">
                        Loading summary...
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const { overall } = summary;
    const successRate = overall.success_rate;
    const isHealthy = successRate >= 95;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Load Test Summary
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Test Info */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Target</div>
                                    <div className="font-semibold truncate">{summary.target_host}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Users</div>
                                    <div className="font-semibold">{summary.users}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Duration</div>
                                    <div className="font-semibold">{summary.duration}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Status</div>
                                    <Badge variant={isHealthy ? "default" : "destructive"}>
                                        {isHealthy ? "Healthy" : "Issues Detected"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Overall Performance */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Overall Performance
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="border-2">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Total Requests</div>
                                            <div className="text-2xl font-bold">{overall.total_requests.toLocaleString()}</div>
                                        </div>
                                        <Target className="h-8 w-8 text-blue-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Success Rate</div>
                                            <div className="text-2xl font-bold flex items-center gap-2">
                                                {successRate}%
                                                {isHealthy ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                        {overall.failures > 0 && (
                                            <XCircle className="h-8 w-8 text-red-500" />
                                        )}
                                    </div>
                                    {overall.failures > 0 && (
                                        <div className="text-sm text-red-600 mt-2">
                                            {overall.failures} failures
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Requests/sec</div>
                                            <div className="text-2xl font-bold">{overall.requests_per_second}</div>
                                        </div>
                                        <Zap className="h-8 w-8 text-yellow-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">Avg Response Time</div>
                                    <div className="text-xl font-bold">{overall.avg_response_time} ms</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">Median Response</div>
                                    <div className="text-xl font-bold">{overall.median_response_time} ms</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">95th Percentile</div>
                                    <div className="text-xl font-bold">{overall.percentile_95} ms</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Separator />

                    {/* Response Time Range */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Response Time Range
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">Fastest</div>
                                    <div className="text-xl font-bold text-green-600">{overall.min_response_time} ms</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">Average</div>
                                    <div className="text-xl font-bold">{overall.avg_response_time} ms</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">Slowest</div>
                                    <div className="text-xl font-bold text-orange-600">{overall.max_response_time} ms</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Endpoints Tested */}
                    {summary.endpoints && summary.endpoints.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Endpoints Tested</h3>
                                <div className="space-y-2">
                                    {summary.endpoints.map((endpoint, idx) => (
                                        <Card key={idx}>
                                            <CardContent className="pt-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-mono text-sm font-semibold">{endpoint.name}</div>
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            {endpoint.requests} requests • {endpoint.rps} RPS • {endpoint.avg_response_time}ms avg
                                                        </div>
                                                    </div>
                                                    {endpoint.failures > 0 && (
                                                        <Badge variant="destructive">{endpoint.failures} failures</Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button onClick={viewFullReport}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Full Report
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

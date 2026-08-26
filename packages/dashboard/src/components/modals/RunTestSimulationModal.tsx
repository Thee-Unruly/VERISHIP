import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestCase {
    id: number;
    title: string;
    description: string;
    requirement_id?: number;
}

interface RunTestSimulationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    testCase: TestCase | null;
}

export function RunTestSimulationModal({
    isOpen,
    onOpenChange,
    testCase,
}: RunTestSimulationModalProps) {
    const { toast } = useToast();
    const [targetUrl, setTargetUrl] = useState("http://localhost:3000");
    const [jobId, setJobId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Event source for streaming logs
    useEffect(() => {
        if (!jobId) return;

        const eventSource = new EventSource(`/api/test-runs/${jobId}/events`);

        eventSource.onmessage = (event) => {
            const data = event.data;
            setLogs((prev) => [...prev, data]);
        };

        eventSource.addEventListener("done", () => {
            setIsRunning(false);
            eventSource.close();
            toast({
                title: "Test execution completed",
                description: "Check the logs above for results.",
            });
        });

        eventSource.onerror = () => {
            eventSource.close();
            setIsRunning(false);
        };

        return () => eventSource.close();
    }, [jobId, toast]);

    const handleRunTest = async () => {
        if (!testCase) return;

        setIsRunning(true);
        setLogs([]);
        setJobId(null);

        try {
            const response = await fetch("/api/test-runs/run-test-case", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    test_case_id: testCase.id,
                    target_base_url: targetUrl,
                    browser: "chromium",
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setJobId(data.job_id);

            toast({
                title: "Test execution started",
                description: `Running: ${testCase.title}`,
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to start test execution",
                variant: "destructive",
            });
            setIsRunning(false);
        }
    };

    const handleClose = () => {
        if (isRunning) {
            if (confirm("Test is still running. Are you sure you want to close?")) {
                onOpenChange(false);
                setJobId(null);
                setLogs([]);
            }
        } else {
            onOpenChange(false);
            setJobId(null);
            setLogs([]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Run Test Simulation
                    </DialogTitle>
                    <DialogDescription>
                        Execute {testCase?.title} against a target URL
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Input Section */}
                    {!isRunning && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Test Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Test Case Details */}
                                {testCase && (
                                    <Card className="bg-muted/50">
                                        <CardContent className="pt-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {testCase.title}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{testCase.description}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Target URL */}
                                <div className="space-y-2">
                                    <Label htmlFor="target-url">Target Base URL</Label>
                                    <Input
                                        id="target-url"
                                        value={targetUrl}
                                        onChange={(e) => setTargetUrl(e.target.value)}
                                        placeholder="http://localhost:3000"
                                        className="font-mono text-sm"
                                    />
                                </div>

                                {/* Action Button */}
                                <Button
                                    onClick={handleRunTest}
                                    disabled={isRunning || !testCase}
                                    className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Running Test...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Start Test Simulation
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Logs/Output Section */}
                    {(logs.length > 0 || isRunning) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>Execution Logs</span>
                                    {isRunning && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Running
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Real-time output from test execution
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-black/90 text-green-400 font-mono text-sm rounded-lg p-4 h-96 overflow-y-auto space-y-1">
                                    {logs.length === 0 ? (
                                        <div className="text-gray-500">Waiting for logs...</div>
                                    ) : (
                                        logs.map((log, idx) => (
                                            <div key={idx} className="whitespace-pre-wrap break-words">
                                                {log.startsWith("ERROR") && <span className="text-red-400">{log}</span>}
                                                {log.startsWith("✓") && <span className="text-green-400">{log}</span>}
                                                {log.startsWith("✓") || log.startsWith("ERROR") ? null : log}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status Messages */}
                    {logs.some((l) => l.includes("failed") || l.includes("ERROR")) && (
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-red-900">Test Execution Failed</p>
                                        <p className="text-sm text-red-800 mt-1">
                                            Check the logs above for error details. You may need to adjust the target URL or test case configuration.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {logs.some((l) => l.includes("✓")) && !isRunning && (
                        <Card className="border-green-200 bg-green-50/50">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-green-900">Test Execution Completed</p>
                                        <p className="text-sm text-green-800 mt-1">
                                            Review the logs above for detailed execution results and assertions.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Requirement {
    id: number;
    requirement_id: string;
    title: string;
    description: string;
    project_id: number;
}

interface GenerateAndRunTestModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requirements: Requirement[];
}

export function GenerateAndRunTestModal({
    open,
    onOpenChange,
    requirements,
}: GenerateAndRunTestModalProps) {
    const { toast } = useToast();
    const [selectedReqId, setSelectedReqId] = useState<string>("");
    const [targetUrl, setTargetUrl] = useState("http://localhost:3000");
    const [jobId, setJobId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

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

    const handleGenerateAndRun = async () => {
        if (!selectedReqId) {
            toast({
                title: "Missing selection",
                description: "Please select a requirement",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        setLogs([]);
        setJobId(null);

        try {
            const response = await fetch("/api/test-runs/generate-and-run", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    requirement_id: parseInt(selectedReqId),
                    target_base_url: targetUrl,
                    browser: "chromium",
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setJobId(data.job_id);
            setIsRunning(true);

            toast({
                title: "Test generation started",
                description: "Generating and running test from requirement...",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to start test generation",
                variant: "destructive",
            });
            setIsGenerating(false);
        }
    };

    const selectedReq = requirements.find((r) => r.id === parseInt(selectedReqId));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Generate & Run Test from Requirement
                    </DialogTitle>
                    <DialogDescription>
                        Select a requirement and the AI will generate a Playwright test, then execute it.
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
                                {/* Requirement Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="requirement-select">Select Requirement</Label>
                                    <Select value={selectedReqId} onValueChange={setSelectedReqId}>
                                        <SelectTrigger id="requirement-select">
                                            <SelectValue placeholder="Choose a requirement..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {requirements.map((req) => (
                                                <SelectItem key={req.id} value={req.id.toString()}>
                                                    {req.requirement_id}: {req.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Requirement Details */}
                                {selectedReq && (
                                    <Card className="bg-muted/50">
                                        <CardContent className="pt-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{selectedReq.requirement_id}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {selectedReq.title}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{selectedReq.description}</p>
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
                                    onClick={handleGenerateAndRun}
                                    disabled={isGenerating || !selectedReqId}
                                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Test...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Generate & Run Test
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
                                    Real-time output from test generation and execution
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
                                            Check the logs above for error details. You may need to adjust the target URL or requirement details.
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

import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    Play, 
    AlertCircle, 
    CheckCircle2, 
    ExternalLink, 
    Film, 
    Code, 
    Sparkles, 
    Activity,
    Layers,
    Clock,
    RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface TestCase {
    id: string | number;
    title: string;
    description: string;
    target_url?: string;
    targetUrl?: string;
    project_id?: string;
    projectId?: string;
    prompt?: string;
}

interface StepLog {
    id?: string;
    step_number: number;
    action_taken: string;
    tool_call_name: string;
    tool_args: any;
    tool_result: string;
    screenshot_url?: string;
    duration_ms?: number;
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
    const navigate = useNavigate();

    const defaultUrl = testCase?.target_url || testCase?.targetUrl || "https://demo.playwright.dev/todomvc";
    const [targetUrl, setTargetUrl] = useState(defaultUrl);
    const [executionPrompt, setExecutionPrompt] = useState("");
    const [jobId, setJobId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [steps, setSteps] = useState<StepLog[]>([]);
    const [activeRun, setActiveRun] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("live");
    const [specCode, setSpecCode] = useState<string | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (testCase && isOpen) {
            setTargetUrl(testCase.target_url || testCase.targetUrl || "https://demo.playwright.dev/todomvc");
            const promptText = (testCase.description && testCase.description.trim())
                ? `Verify ${testCase.title}: ${testCase.description.trim()}`
                : (testCase.prompt || `Verify ${testCase.title}`);
            setExecutionPrompt(promptText);
            setJobId(null);
            setIsRunning(false);
            setLogs([]);
            setSteps([]);
            setActiveRun(null);
            setSpecCode(null);
        }
    }, [testCase, isOpen]);

    // Setup SSE connection for real-time live events
    useEffect(() => {
        if (!jobId) return;

        const sseUrl = `/api/jobs/${jobId}/stream`;
        try {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            const es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === "step_update" && data.step) {
                        setSteps((prev) => {
                            const exists = prev.some((s) => s.step_number === data.step.step_number);
                            if (exists) return prev;
                            return [...prev, data.step];
                        });
                        setLogs((prev) => [...prev, `[Step ${data.step.step_number}] ${data.step.action_taken || data.step.tool_call_name}`]);
                        fetchJobDetails(jobId);
                    } else if (data.event === "job_completed") {
                        setIsRunning(false);
                        fetchJobDetails(jobId);
                        toast({
                            title: "Autonomous Playwright execution finished",
                            description: "Quality verification and assertions complete.",
                        });
                    }
                } catch (e) {
                    console.error("SSE parse error", e);
                }
            };

            es.onerror = () => {
                es.close();
            };
        } catch (err) {
            console.warn("SSE stream failed", err);
        }

        // Polling fallback while running
        const interval = setInterval(() => {
            fetchJobDetails(jobId);
        }, 2000);

        return () => {
            clearInterval(interval);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [jobId]);

    const fetchJobDetails = async (id: string) => {
        try {
            const res = await fetch(`/api/jobs/${id}`);
            if (res.ok) {
                const data = await res.json();
                setActiveRun(data.run || null);
                if (data.steps && Array.isArray(data.steps)) {
                    setSteps(data.steps);
                }
                if (data.run?.status === "passed" || data.run?.status === "failed") {
                    setIsRunning(false);
                }
                if (data.run?.spec_url && !specCode) {
                    fetch(data.run.spec_url)
                        .then((r) => r.text())
                        .then((txt) => setSpecCode(txt))
                        .catch(() => {});
                }
            }
        } catch (err) {
            console.error("Failed to fetch job details", err);
        }
    };

    const handleRunTest = async () => {
        if (!testCase) return;

        setIsRunning(true);
        setLogs([]);
        setSteps([]);
        setJobId(null);
        setActiveRun(null);
        setSpecCode(null);

        try {
            const response = await fetch("/api/test-runs/run-test-case", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
                body: JSON.stringify({
                    test_case_id: testCase.id,
                    target_base_url: targetUrl,
                    prompt: executionPrompt,
                    browser: "chromium",
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const id = data.job_id || data.jobId;
            setJobId(id);

            toast({
                title: "Autonomous Playwright Runner Initialized",
                description: `Spawning Chromium worker for "${testCase.title}"`,
            });
        } catch (error: any) {
            toast({
                title: "Execution Error",
                description: error.message || "Failed to start Playwright runner",
                variant: "destructive",
            });
            setIsRunning(false);
        }
    };

    const handleOpenInPlaywrightStudio = () => {
        onOpenChange(false);
        navigate("/playwright");
    };

    const handleClose = () => {
        if (isRunning) {
            if (confirm("Autonomous test is still actively running. Close preview? (The worker will continue in the background)")) {
                onOpenChange(false);
            }
        } else {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            Autonomous Playwright Runner
                        </DialogTitle>
                        {jobId && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleOpenInPlaywrightStudio}
                                className="flex items-center gap-1 text-xs"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open in Playwright Studio
                            </Button>
                        )}
                    </div>
                    <DialogDescription>
                        Autonomous agent executing <strong>{testCase?.title}</strong> with live video, DOM trace, and assertions
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                    {/* Target URL & Execution Prompt */}
                    <Card className="border-border/60 bg-muted/30">
                        <CardContent className="pt-4 pb-4 space-y-3">
                            <div className="space-y-1 w-full">
                                <Label htmlFor="execution-prompt" className="text-xs font-semibold uppercase text-muted-foreground">
                                    Execution Instructions & Test Steps
                                </Label>
                                <textarea
                                    id="execution-prompt"
                                    value={executionPrompt}
                                    onChange={(e) => setExecutionPrompt(e.target.value)}
                                    placeholder="Verify test case steps and assertions..."
                                    disabled={isRunning}
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 space-y-1 w-full">
                                    <Label htmlFor="target-url" className="text-xs font-semibold uppercase text-muted-foreground">
                                        Target Base URL
                                    </Label>
                                    <Input
                                        id="target-url"
                                        value={targetUrl}
                                        onChange={(e) => setTargetUrl(e.target.value)}
                                        placeholder="https://demo.playwright.dev/todomvc"
                                        disabled={isRunning}
                                        className="font-mono text-sm h-10"
                                    />
                                </div>
                                <Button
                                    onClick={handleRunTest}
                                    disabled={isRunning || !testCase}
                                    className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shrink-0"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Autonomous Running...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4 fill-white" />
                                            {jobId ? "Re-Run Playwright Test" : "Run Playwright Test"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Execution State */}
                    {jobId && (
                        <div className="space-y-4">
                            {/* Status Header Bar */}
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground">
                                <div className="flex items-center gap-3">
                                    <Badge 
                                        variant={
                                            activeRun?.status === "passed" ? "default" :
                                            activeRun?.status === "failed" ? "destructive" :
                                            "secondary"
                                        }
                                        className="capitalize px-3 py-1 text-xs"
                                    >
                                        {isRunning ? (
                                            <span className="flex items-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Running Steps ({steps.length})
                                            </span>
                                        ) : (
                                            activeRun?.status || "Running"
                                        )}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        Job ID: {jobId}
                                    </span>
                                </div>

                                {activeRun?.fitness_score !== undefined && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-medium">Fitness Score:</span>
                                        <Badge variant="outline" className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                                            {activeRun.fitness_score}%
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Execution Tabs */}
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid grid-cols-3 w-full">
                                    <TabsTrigger value="live" className="flex items-center gap-1.5">
                                        <Activity className="h-4 w-4" />
                                        Live Steps ({steps.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="video" className="flex items-center gap-1.5">
                                        <Film className="h-4 w-4" />
                                        Session Video
                                    </TabsTrigger>
                                    <TabsTrigger value="spec" className="flex items-center gap-1.5">
                                        <Code className="h-4 w-4" />
                                        Generated Spec
                                    </TabsTrigger>
                                </TabsList>

                                {/* Tab 1: Live Steps */}
                                <TabsContent value="live" className="space-y-3 pt-2">
                                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                        {steps.length === 0 ? (
                                            <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                                                Spawning Playwright headless browser & navigating to target...
                                            </div>
                                        ) : (
                                            steps.map((step, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="p-3 border rounded-lg bg-card/60 hover:bg-accent/30 transition-colors flex gap-3 items-start"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                        {step.step_number}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-sm text-foreground">
                                                                {step.tool_call_name ? `Browser: ${step.tool_call_name}` : "Agent Step"}
                                                            </span>
                                                            {step.duration_ms && (
                                                                <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {step.duration_ms}ms
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {step.action_taken || step.tool_result || "Action executed successfully."}
                                                        </p>
                                                    </div>
                                                    {step.screenshot_url && (
                                                        <a 
                                                            href={step.screenshot_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="shrink-0 border rounded overflow-hidden hover:opacity-80 transition-opacity"
                                                        >
                                                            <img 
                                                                src={step.screenshot_url} 
                                                                alt={`Step ${step.step_number}`} 
                                                                className="w-16 h-10 object-cover" 
                                                            />
                                                        </a>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Tab 2: Video Replay */}
                                <TabsContent value="video" className="pt-2">
                                    {activeRun?.video_url ? (
                                        <div className="rounded-lg overflow-hidden border bg-black shadow-inner">
                                            <video 
                                                src={activeRun.video_url} 
                                                controls 
                                                autoPlay 
                                                className="w-full max-h-[380px]"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center border border-dashed rounded-lg text-muted-foreground space-y-2">
                                            <Film className="h-8 w-8 mx-auto text-muted-foreground/60" />
                                            <p className="text-sm font-medium">
                                                {isRunning ? "Recording video in progress... Video will appear once execution completes." : "No session video recorded."}
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Tab 3: Generated Spec Code */}
                                <TabsContent value="spec" className="pt-2">
                                    <div className="relative">
                                        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[380px] border">
                                            {specCode || "// Generating Playwright test spec code...\nimport { test, expect } from '@playwright/test';\n\ntest('Autonomous verification', async ({ page }) => {\n  // Steps recording in progress...\n});"}
                                        </pre>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

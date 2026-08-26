import { useState, useEffect } from "react";
import { Play, Monitor, Loader2, Camera, FileDown, RefreshCw, StopCircle, Eye, EyeOff, Film, Image, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ConfigCard,
    EmptyState,
    LoadingState,
    StepResult,
    ToggleOption,
} from "@/components/test-runner";

// Animation variants
const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
    }
};

const resultsVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.4,
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.3 }
    }
};

// Types
interface PlaywrightExecutionConfig {
    browser_type: "chromium" | "firefox" | "webkit";
    headless: boolean;
    viewport: { width: number; height: number };
    timeout: number;
    base_url: string;
    record_trace: boolean;
    record_video: boolean;
    screenshot_on_failure: boolean;
    retry_count: number;
    environment: string;
}

interface PlaywrightStepResult {
    step_number: number;
    action_type: string;
    description: string;
    selector: string | null;
    status: "passed" | "failed" | "skipped";
    duration_ms: number;
    timestamp: string;
    value?: any;
    error?: string;
    screenshot_path?: string;
}

interface PlaywrightExecutionResponse {
    execution_id: number;
    test_case_id: number;
    status: string;
    start_time: string;
    end_time: string | null;
    duration_ms: number;
    steps: PlaywrightStepResult[];
    error_message?: string;
    screenshot_path?: string;
    trace_path?: string;
    network_logs_count: number;
    browser_type: string;
    environment: string;
    defect_id?: number;
}

interface PlaywrightRunnerStatus {
    is_running: boolean;
    browser_type: string | null;
    contexts_count: number;
    active_executions_count: number;
    queued_executions_count: number;
}

export default function Playwright() {
    const { toast } = useToast();

    // Playwright State
    const [playwrightConfig, setPlaywrightConfig] = useState<PlaywrightExecutionConfig>({
        browser_type: "chromium",
        headless: true,
        viewport: { width: 1280, height: 720 },
        timeout: 30000,
        base_url: "http://localhost:8000",
        record_trace: true,
        record_video: false,
        screenshot_on_failure: true,
        retry_count: 0,
        environment: "development",
    });
    const [playwrightResult, setPlaywrightResult] = useState<PlaywrightExecutionResponse | null>(null);
    const [playwrightStatus, setPlaywrightStatus] = useState<PlaywrightRunnerStatus | null>(null);
    const [isPlaywrightRunning, setIsPlaywrightRunning] = useState(false);
    const [manualInput, setManualInput] = useState<string>("");
    const [isManualRunning, setIsManualRunning] = useState(false);
    const [draftPrompt, setDraftPrompt] = useState("");
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

    useEffect(() => {
        fetchPlaywrightStatus();
    }, []);

    const fetchPlaywrightStatus = async () => {
        try {
            const response = await fetch("/api/automation/status");
            if (response.ok) {
                const data = await response.json();
                setPlaywrightStatus(data);
            }
        } catch (error) {
            console.error("Error fetching Playwright status:", error);
        }
    };

    const generateDraftJson = async () => {
        if (!draftPrompt.trim()) {
            toast({
                title: "No requirement provided",
                description: "Describe the feature, user flow, or requirement first",
                variant: "destructive",
            });
            return;
        }

        setIsGeneratingDraft(true);

        try {
            const response = await fetch("/api/ai/generate-playwright-json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    test_description: draftPrompt,
                    context: `Application under test base URL: ${playwrightConfig.base_url}. Environment: ${playwrightConfig.environment}. Browser: ${playwrightConfig.browser_type}.`,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "Failed to generate Playwright JSON");
            }

            setManualInput(JSON.stringify({
                title: data.title,
                description: data.description,
                steps: data.steps,
            }, null, 2));

            toast({
                title: "Draft generated",
                description: `${Array.isArray(data.steps) ? data.steps.length : 0} Playwright steps generated for review`,
            });
        } catch (error: any) {
            toast({
                title: "Generation Error",
                description: error.message || "Failed to generate Playwright JSON",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingDraft(false);
        }
    };

    const loadManualSample = () => {
        const sample = {
            steps: [
                { type: "navigate", url: "/login", description: "Open login page" },
                { type: "fill", selector: "#username", value: "testuser" },
                { type: "fill", selector: "#password", value: "password" },
                { type: "click", selector: "button[type=\"submit\"]" },
                { type: "assert", selector: "#dashboard", expected_contains: "Welcome" }
            ]
        };

        setManualInput(JSON.stringify(sample, null, 2));
        toast({ title: "Sample loaded", description: "Manual login steps ready" });
    };

    const runManualTest = async () => {
        if (!manualInput) {
            toast({ title: "No steps", description: "Paste manual test steps as JSON", variant: "destructive" });
            return;
        }

        let parsed: any;
        try {
            parsed = JSON.parse(manualInput);
        } catch (e: any) {
            toast({ title: "Invalid JSON", description: e.message || "Cannot parse JSON", variant: "destructive" });
            return;
        }

        const steps = parsed.steps && Array.isArray(parsed.steps) ? parsed.steps : (Array.isArray(parsed) ? parsed : []);
        if (!steps.length) {
            toast({ title: "No steps found", description: "Provide an array of steps or an object with a 'steps' array", variant: "destructive" });
            return;
        }

        setIsManualRunning(true);
        setPlaywrightResult(null);

        try {
            const body = {
                title: parsed.title || "Generated Playwright Test",
                description: parsed.description || draftPrompt || "Ad-hoc Playwright execution",
                config: playwrightConfig,
                steps,
            };
            const response = await fetch("/api/automation/execute/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || "Execution failed");
            }

            const data: PlaywrightExecutionResponse = await response.json();
            setPlaywrightResult(data);

            toast({
                title: data.status === "passed" ? "Test Passed ✓" : "Test Failed",
                description: `Completed in ${(data.duration_ms / 1000).toFixed(1)}s`,
                variant: data.status === "passed" ? "default" : "destructive",
            });
        } catch (error: any) {
            toast({ title: "Execution Error", description: error.message || "Failed to execute test", variant: "destructive" });
        } finally {
            setIsManualRunning(false);
            fetchPlaywrightStatus();
        }
    };

    const stopExecution = async () => {
        if (!playwrightResult?.execution_id) return;
        try {
            await fetch(`/api/automation/executions/${playwrightResult.execution_id}`, {
                method: "DELETE",
            });
            toast({ title: "Execution stopped", description: "Test was cancelled" });
        } catch (error) {
            console.error("Error stopping execution:", error);
        }
    };

    const downloadTrace = () => {
        if (!playwrightResult?.execution_id) return;
        window.open(
            `/api/automation/executions/${playwrightResult.execution_id}/trace?download=true`,
            "_blank"
        );
    };

    const downloadScreenshot = () => {
        if (!playwrightResult?.execution_id) return;
        window.open(
            `/api/automation/executions/${playwrightResult.execution_id}/screenshot?download=true`,
            "_blank"
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 p-6 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                            Playwright Automation
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Browser automation for end-to-end testing with traces and screenshots
                        </p>
                    </div>
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Configuration */}
                        <motion.div variants={cardVariants}>
                            <ConfigCard
                                icon={Monitor}
                                title="Playwright Configuration"
                                description="Configure browser automation for E2E testing"
                            >
                                {/* Status Badge */}
                                {playwrightStatus && (
                                    <motion.div
                                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                className={`w-2.5 h-2.5 rounded-full ${playwrightStatus.is_running ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                                                animate={playwrightStatus.is_running ? { scale: [1, 1.2, 1] } : {}}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                            <span className="text-sm font-medium">Runner Status</span>
                                        </div>
                                        <Badge variant={playwrightStatus.is_running ? "default" : "secondary"}>
                                            {playwrightStatus.is_running ? "Active" : "Idle"}
                                        </Badge>
                                    </motion.div>
                                )}

                                {/* Browser Selection */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Browser</Label>
                                    <Select
                                        value={playwrightConfig.browser_type}
                                        onValueChange={(value: "chromium" | "firefox" | "webkit") =>
                                            setPlaywrightConfig({ ...playwrightConfig, browser_type: value })
                                        }
                                    >
                                        <SelectTrigger className="h-10 rounded-lg border-border/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border/50 rounded-xl">
                                            <SelectItem value="chromium">Chromium</SelectItem>
                                            <SelectItem value="firefox">Firefox</SelectItem>
                                            <SelectItem value="webkit">WebKit (Safari)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Viewport */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Width</Label>
                                        <Input
                                            type="number"
                                            value={playwrightConfig.viewport.width}
                                            onChange={(e) =>
                                                setPlaywrightConfig({
                                                    ...playwrightConfig,
                                                    viewport: { ...playwrightConfig.viewport, width: parseInt(e.target.value) || 1280 },
                                                })
                                            }
                                            className="h-10 rounded-lg border-border/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Height</Label>
                                        <Input
                                            type="number"
                                            value={playwrightConfig.viewport.height}
                                            onChange={(e) =>
                                                setPlaywrightConfig({
                                                    ...playwrightConfig,
                                                    viewport: { ...playwrightConfig.viewport, height: parseInt(e.target.value) || 720 },
                                                })
                                            }
                                            className="h-10 rounded-lg border-border/50"
                                        />
                                    </div>
                                </div>

                                {/* Base URL & Timeout */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Base URL</Label>
                                    <Input
                                        value={playwrightConfig.base_url}
                                        onChange={(e) => setPlaywrightConfig({ ...playwrightConfig, base_url: e.target.value })}
                                        placeholder="http://localhost:3000"
                                        className="h-10 rounded-lg border-border/50 font-mono text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Timeout (ms)</Label>
                                    <Input
                                        type="number"
                                        value={playwrightConfig.timeout}
                                        onChange={(e) =>
                                            setPlaywrightConfig({ ...playwrightConfig, timeout: parseInt(e.target.value) || 30000 })
                                        }
                                        className="h-10 rounded-lg border-border/50"
                                    />
                                </div>

                                {/* Environment */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Environment</Label>
                                    <Select
                                        value={playwrightConfig.environment}
                                        onValueChange={(value) => setPlaywrightConfig({ ...playwrightConfig, environment: value })}
                                    >
                                        <SelectTrigger className="h-10 rounded-lg border-border/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border/50 rounded-xl">
                                            <SelectItem value="development">Development</SelectItem>
                                            <SelectItem value="staging">Staging</SelectItem>
                                            <SelectItem value="production">Production</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Toggle Options */}
                                <div className="space-y-2 pt-4 border-t border-border/50">
                                    <ToggleOption
                                        id="headless"
                                        label="Headless Mode"
                                        description="Run without visible browser window"
                                        checked={playwrightConfig.headless}
                                        onCheckedChange={(checked) => setPlaywrightConfig({ ...playwrightConfig, headless: checked })}
                                        icon={playwrightConfig.headless ? EyeOff : Eye}
                                    />
                                    <ToggleOption
                                        id="trace"
                                        label="Record Trace"
                                        description="Capture detailed execution trace"
                                        checked={playwrightConfig.record_trace}
                                        onCheckedChange={(checked) => setPlaywrightConfig({ ...playwrightConfig, record_trace: checked })}
                                        icon={FileDown}
                                    />
                                    <ToggleOption
                                        id="video"
                                        label="Record Video"
                                        description="Capture video of test execution"
                                        checked={playwrightConfig.record_video}
                                        onCheckedChange={(checked) => setPlaywrightConfig({ ...playwrightConfig, record_video: checked })}
                                        icon={Film}
                                    />
                                    <ToggleOption
                                        id="screenshot"
                                        label="Screenshot on Failure"
                                        description="Capture screenshot when test fails"
                                        checked={playwrightConfig.screenshot_on_failure}
                                        onCheckedChange={(checked) => setPlaywrightConfig({ ...playwrightConfig, screenshot_on_failure: checked })}
                                        icon={Image}
                                    />
                                </div>

                                {/* AI Draft Generation */}
                                <div className="pt-4 border-t border-border/50 space-y-4">
                                    <Label className="text-base font-semibold">AI Draft Generator</Label>
                                    <Textarea
                                        value={draftPrompt}
                                        onChange={(e) => setDraftPrompt(e.target.value)}
                                        placeholder="Paste a requirement, describe a user flow, or explain the feature you want to automate. Example: User logs in, opens the projects dashboard, filters by status, and verifies only active projects remain visible."
                                        className="min-h-[140px] rounded-xl border-border/50"
                                    />
                                    <Button
                                        onClick={generateDraftJson}
                                        disabled={isGeneratingDraft}
                                        className="w-full h-10 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl"
                                    >
                                        {isGeneratingDraft ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating Draft...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Generate Playwright JSON
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Generated / Editable Steps JSON */}
                                <div className="pt-4 border-t border-border/50 space-y-2">
                                    <Label className="text-base font-semibold">Generated / Editable Steps JSON</Label>
                                    <Textarea
                                        value={manualInput}
                                        onChange={(e) => setManualInput(e.target.value)}
                                        placeholder='{ "title": "Login flow", "steps": [ { "type": "navigate", "url": "/login" } ] }'
                                        className="h-40 font-mono text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={loadManualSample} variant="ghost" size="sm" className="rounded-lg">
                                            Load Sample
                                        </Button>
                                        <Button
                                            onClick={runManualTest}
                                            disabled={isManualRunning}
                                            className="ml-auto h-10 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl"
                                        >
                                            {isManualRunning ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Running...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Run Manual Test
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                            </ConfigCard>
                        </motion.div>

                        {/* Results */}
                        <motion.div variants={cardVariants}>
                            <ConfigCard
                                icon={Monitor}
                                title="Execution Results"
                                description="Browser automation results with traces and screenshots"
                            >
                                <AnimatePresence mode="wait">
                                    {isPlaywrightRunning && (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <LoadingState
                                                icon={Monitor}
                                                message="Running browser automation..."
                                                subMessage="Executing test steps in the browser"
                                            />
                                        </motion.div>
                                    )}

                                    {!isPlaywrightRunning && !playwrightResult && (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <EmptyState
                                                icon={Monitor}
                                                title="No results yet"
                                                description="Generate Playwright JSON from a requirement, review it, then run the draft"
                                            />
                                        </motion.div>
                                    )}

                                    {playwrightResult && (
                                        <motion.div
                                            key="results"
                                            variants={resultsVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className="space-y-6"
                                        >
                                            {/* Status Header */}
                                            <motion.div
                                                variants={itemVariants}
                                                className={`flex items-center justify-between p-5 rounded-xl border ${playwrightResult.status === "passed"
                                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                                    : "bg-rose-500/5 border-rose-500/20"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <motion.div
                                                        className={`p-3 rounded-xl ${playwrightResult.status === "passed"
                                                            ? "bg-emerald-500/20"
                                                            : "bg-rose-500/20"
                                                            }`}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                                                    >
                                                        {playwrightResult.status === "passed" ? (
                                                            <Play className="h-6 w-6 text-emerald-500" />
                                                        ) : (
                                                            <StopCircle className="h-6 w-6 text-rose-500" />
                                                        )}
                                                    </motion.div>
                                                    <div>
                                                        <div className={`font-semibold text-lg ${playwrightResult.status === "passed" ? "text-emerald-600" : "text-rose-600"
                                                            }`}>
                                                            {playwrightResult.status === "passed" ? "Test Passed" : "Test Failed"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Execution #{playwrightResult.execution_id}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {playwrightResult.browser_type}
                                                </Badge>
                                            </motion.div>

                                            {/* Metrics */}
                                            <motion.div
                                                className="grid grid-cols-3 gap-3"
                                                variants={itemVariants}
                                            >
                                                {[
                                                    { value: `${(playwrightResult.duration_ms / 1000).toFixed(1)}s`, label: "Duration" },
                                                    { value: playwrightResult.steps.length, label: "Steps" },
                                                    { value: playwrightResult.network_logs_count, label: "Requests" }
                                                ].map((metric, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center"
                                                        whileHover={{ scale: 1.05 }}
                                                        transition={{ type: "spring", stiffness: 400 }}
                                                    >
                                                        <div className="text-xl font-bold text-foreground">{metric.value}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>

                                            {/* Actions */}
                                            <motion.div className="flex gap-2 flex-wrap" variants={itemVariants}>
                                                {playwrightResult.trace_path && (
                                                    <Button variant="outline" size="sm" onClick={downloadTrace} className="rounded-lg">
                                                        <FileDown className="mr-2 h-4 w-4" />
                                                        Download Trace
                                                    </Button>
                                                )}
                                                {playwrightResult.screenshot_path && (
                                                    <Button variant="outline" size="sm" onClick={downloadScreenshot} className="rounded-lg">
                                                        <Camera className="mr-2 h-4 w-4" />
                                                        View Screenshot
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" onClick={fetchPlaywrightStatus} className="rounded-lg">
                                                    <RefreshCw className="mr-2 h-4 w-4" />
                                                    Refresh
                                                </Button>
                                            </motion.div>

                                            {/* Error */}
                                            <AnimatePresence>
                                                {playwrightResult.error_message && (
                                                    <motion.div
                                                        className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                    >
                                                        <div className="text-sm font-medium text-rose-600">Error</div>
                                                        <div className="text-sm text-rose-500 mt-1 font-mono">
                                                            {playwrightResult.error_message}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Defect */}
                                            <AnimatePresence>
                                                {playwrightResult.defect_id && (
                                                    <motion.div
                                                        className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                    >
                                                        <div className="text-sm font-medium text-amber-600">
                                                            Defect Created: DEF-{playwrightResult.defect_id}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Steps */}
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                <Label className="text-sm font-medium">Execution Steps</Label>
                                                {playwrightResult.steps.map((step, idx) => (
                                                    <motion.div
                                                        key={step.step_number}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                    >
                                                        <StepResult
                                                            stepNumber={step.step_number}
                                                            description={step.description}
                                                            status={step.status}
                                                            durationMs={step.duration_ms}
                                                            actionType={step.action_type}
                                                            selector={step.selector || undefined}
                                                            error={step.error}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </ConfigCard>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}

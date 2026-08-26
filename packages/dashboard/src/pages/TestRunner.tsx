import { useState, useEffect } from "react";
import { Play, Upload, FileCode, Loader2, Sparkles, Globe } from "lucide-react";
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
    TestRunnerHeader,
    EmptyState,
    ConfigCard,
    ResultsSummary,
    StepResult,
    TestCaseSelector,
    LoadingState,
    ScenarioCard,
} from "@/components/test-runner";

// Animation variants
const tabContentVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
            staggerChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.98,
        transition: { duration: 0.3 }
    }
};

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
interface StepResultType {
    step_number: number;
    description: string;
    status: "passed" | "failed" | "skipped";
    duration_ms: number;
    details?: string;
    error?: string;
}

interface TestCaseResult {
    title: string;
    status: "passed" | "failed" | "skipped";
    duration_ms: number;
    steps: StepResultType[];
    error?: string;
}

interface TrialRunResponse {
    total_cases: number;
    passed: number;
    failed: number;
    skipped: number;
    total_duration_ms: number;
    results: TestCaseResult[];
}



const SAMPLE_TEST_CASES = `{
  "target_base_url": "https://api.example.com",
  "test_cases": [
    {
      "title": "API Health Check",
      "description": "Verify API is responding",
      "test_type": "Positive",
      "priority": 1,
      "expected_result": "API returns 200 OK",
      "steps": [
        {
          "type": "http",
          "description": "GET health endpoint",
          "method": "GET",
          "url": "/health",
          "expected_status": 200,
          "expected_contains": "healthy"
        }
      ]
    }
  ]
}`;

export default function TestRunner() {
    const { toast } = useToast();
    const [testInput, setTestInput] = useState("");
    const [baseUrl, setBaseUrl] = useState("http://localhost:8000");
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<TrialRunResponse | null>(null);

    // Cascading dropdowns
    const [projects, setProjects] = useState<any[]>([]);
    const [requirements, setRequirements] = useState<any[]>([]);
    const [testCases, setTestCases] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedRequirementId, setSelectedRequirementId] = useState("");
    const [selectedTestCaseId, setSelectedTestCaseId] = useState("");

    const [isGeneratingScenarios, setIsGeneratingScenarios] = useState(false);
    const [scenarios, setScenarios] = useState<any[]>([]);
    const [currentScenario, setCurrentScenario] = useState(0);
    const [isConvertingToJson, setIsConvertingToJson] = useState(false);

    // Load projects
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const response = await fetch("/api/projects");
                const data = await response.json();
                setProjects(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error loading projects:", error);
            }
        };
        loadProjects();
    }, []);

    // Load requirements when project changes
    useEffect(() => {
        if (!selectedProjectId) {
            setRequirements([]);
            setSelectedRequirementId("");
            return;
        }
        const loadRequirements = async () => {
            try {
                const response = await fetch(`/api/requirements/${selectedProjectId}`);
                const data = await response.json();
                setRequirements(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error loading requirements:", error);
            }
        };
        loadRequirements();
    }, [selectedProjectId]);

    // Load test cases when requirement changes
    useEffect(() => {
        if (!selectedRequirementId) {
            setTestCases([]);
            setSelectedTestCaseId("");
            return;
        }
        const loadTestCases = async () => {
            try {
                const response = await fetch(`/api/test-cases/${selectedProjectId}`);
                const data = await response.json();
                const filtered = data.filter((tc: any) => tc.requirement_id === parseInt(selectedRequirementId));
                setTestCases(filtered);
            } catch (error) {
                console.error("Error loading test cases:", error);
            }
        };
        loadTestCases();
    }, [selectedRequirementId, selectedProjectId]);



    const handleGenerateAndRunScenarios = async () => {
        if (!selectedTestCaseId) {
            toast({
                title: "Missing selection",
                description: "Please select project, requirement, and test case",
                variant: "destructive",
            });
            return;
        }

        setIsGeneratingScenarios(true);
        setScenarios([]);
        setCurrentScenario(0);

        try {
            const selectedCase = testCases.find(tc => tc.id === parseInt(selectedTestCaseId));
            const selectedReq = requirements.find(r => r.id === parseInt(selectedRequirementId));

            toast({ title: "Generating scenarios...", description: "AI is creating 5 test scenarios" });

            const response = await fetch("/api/copilot/generate-scenarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testCase: selectedCase, requirement: selectedReq, count: 5 }),
            });

            if (!response.ok) throw new Error("Scenario generation failed");

            const data = await response.json();
            const generatedScenarios = data.scenarios;
            setScenarios(generatedScenarios);

            toast({ title: "Scenarios ready", description: `${generatedScenarios.length} scenarios generated` });

            for (let i = 0; i < generatedScenarios.length; i++) {
                setCurrentScenario(i + 1);
                const runResponse = await fetch("/api/trial/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        test_cases: [generatedScenarios[i]],
                        target_base_url: baseUrl,
                    }),
                });
                const runResult = await runResponse.json();
                generatedScenarios[i].result = runResult;
                setScenarios([...generatedScenarios]);
            }

            toast({ title: "All scenarios completed", description: "Check results below" });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to generate/run scenarios",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingScenarios(false);
            setCurrentScenario(0);
        }
    };

    const loadSample = () => {
        setTestInput(SAMPLE_TEST_CASES);
        toast({ title: "Sample loaded", description: "Example test cases ready to run" });
    };

    const handleLoadFromDatabase = async () => {
        if (!selectedTestCaseId) {
            toast({ title: "No selection", description: "Please select a test case", variant: "destructive" });
            return;
        }

        setIsConvertingToJson(true);
        try {
            const selectedCase = testCases.find(tc => tc.id === parseInt(selectedTestCaseId));
            const response = await fetch("/api/copilot/convert-test-to-json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testCase: selectedCase }),
            });

            if (!response.ok) throw new Error("Conversion failed");

            const data = await response.json();
            setTestInput(JSON.stringify(data.json_format, null, 2));
            toast({ title: "Test case loaded", description: `${selectedCase.title} converted to JSON` });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to convert test case",
                variant: "destructive",
            });
        } finally {
            setIsConvertingToJson(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setTestInput(e.target?.result as string);
                toast({ title: "File loaded", description: `${file.name} loaded successfully` });
            };
            reader.readAsText(file);
        }
    };

    const runTests = async () => {
        if (!testInput.trim()) {
            toast({ title: "No test cases", description: "Please provide test cases to run", variant: "destructive" });
            return;
        }

        try {
            setIsRunning(true);
            setResults(null);

            const parsed = JSON.parse(testInput);
            const response = await fetch("/api/trial/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    test_cases: parsed.test_cases || [],
                    target_base_url: parsed.target_base_url || baseUrl,
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data: TrialRunResponse = await response.json();
            setResults(data);
            toast({
                title: "Tests completed",
                description: `${data.passed} passed, ${data.failed} failed`,
            });
        } catch (error: any) {
            toast({
                title: "Execution failed",
                description: error.message || "Failed to run tests",
                variant: "destructive",
            });
        } finally {
            setIsRunning(false);
        }
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
                    <TestRunnerHeader />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Configuration Card */}
                        <motion.div variants={cardVariants}>
                            <ConfigCard
                                icon={FileCode}
                                title="Test Configuration"
                                description="Configure and run API tests with JSON specifications"
                            >
                                {/* Base URL */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Target Base URL</Label>
                                    <Input
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder="http://localhost:8000"
                                        className="font-mono text-sm h-10 rounded-lg border-border/50 focus:border-accent"
                                    />
                                </div>

                                {/* AI Scenarios Section */}
                                <motion.div
                                    className="p-5 rounded-xl bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 border border-violet-500/20 space-y-4"
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                >
                                    <div className="flex items-start gap-3">
                                        <motion.div
                                            className="p-2 rounded-lg bg-violet-500/20"
                                            animate={{ rotate: [0, 5, -5, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                                        >
                                            <Sparkles className="h-4 w-4 text-violet-500" />
                                        </motion.div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">AI-Powered Scenarios</h4>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Generate and run 5 test scenarios automatically
                                            </p>
                                        </div>
                                    </div>

                                    <TestCaseSelector
                                        projects={projects}
                                        requirements={requirements}
                                        testCases={testCases}
                                        selectedProjectId={selectedProjectId}
                                        selectedRequirementId={selectedRequirementId}
                                        selectedTestCaseId={selectedTestCaseId}
                                        onProjectChange={setSelectedProjectId}
                                        onRequirementChange={setSelectedRequirementId}
                                        onTestCaseChange={setSelectedTestCaseId}
                                    />

                                    <motion.div whileTap={{ scale: 0.98 }}>
                                        <Button
                                            onClick={handleGenerateAndRunScenarios}
                                            disabled={isGeneratingScenarios || !selectedTestCaseId}
                                            className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-medium"
                                        >
                                            {isGeneratingScenarios ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {currentScenario > 0 ? `Running ${currentScenario}/5...` : "Generating..."}
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    Generate & Auto-Run 5 Scenarios
                                                </>
                                            )}
                                        </Button>
                                    </motion.div>

                                    {/* Scenario Results */}
                                    <AnimatePresence>
                                        {scenarios.length > 0 && (
                                            <motion.div
                                                className="space-y-2 pt-2"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                {scenarios.map((scenario, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                    >
                                                        <ScenarioCard
                                                            index={idx}
                                                            title={scenario.title}
                                                            result={scenario.result}
                                                            isRunning={currentScenario === idx + 1}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Manual JSON Input */}
                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    <Label className="text-sm font-medium">Manual JSON Input</Label>
                                    <div className="flex gap-2 mb-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleLoadFromDatabase}
                                            disabled={isConvertingToJson || !selectedTestCaseId}
                                            className="rounded-lg"
                                        >
                                            {isConvertingToJson ? (
                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="mr-2 h-3.5 w-3.5" />
                                            )}
                                            Convert with AI
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={loadSample} className="rounded-lg">
                                            <FileCode className="mr-2 h-3.5 w-3.5" />
                                            Load Sample
                                        </Button>
                                        <Button variant="outline" size="sm" asChild className="rounded-lg">
                                            <label className="cursor-pointer">
                                                <Upload className="mr-2 h-3.5 w-3.5" />
                                                Upload
                                                <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                                            </label>
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={testInput}
                                        onChange={(e) => setTestInput(e.target.value)}
                                        placeholder='{"test_cases": [...]}'
                                        className="font-mono text-sm min-h-[200px] rounded-xl border-border/50 focus:border-accent bg-muted/30"
                                    />
                                    <motion.div whileTap={{ scale: 0.98 }}>
                                        <Button
                                            onClick={runTests}
                                            disabled={isRunning || !testInput.trim()}
                                            className="w-full h-11 bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90 text-white rounded-xl"
                                        >
                                            {isRunning ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Running Tests...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Run Tests
                                                </>
                                            )}
                                        </Button>
                                    </motion.div>
                                </div>
                            </ConfigCard>
                        </motion.div>

                        {/* Results Card */}
                        <motion.div variants={cardVariants}>
                            <ConfigCard
                                icon={Play}
                                title="Execution Results"
                                description="Real-time test execution feedback and metrics"
                            >
                                <AnimatePresence mode="wait">
                                    {isRunning && (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <LoadingState message="Executing tests..." subMessage="This may take a moment" />
                                        </motion.div>
                                    )}

                                    {!isRunning && !results && (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <EmptyState
                                                icon={Play}
                                                title="Ready to test"
                                                description="Configure your tests on the left and click Run to see results here"
                                            />
                                        </motion.div>
                                    )}

                                    {results && (
                                        <motion.div
                                            key="results"
                                            variants={resultsVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className="space-y-6"
                                        >
                                            <motion.div variants={itemVariants}>
                                                <ResultsSummary
                                                    total={results.total_cases}
                                                    passed={results.passed}
                                                    failed={results.failed}
                                                    skipped={results.skipped}
                                                    durationMs={results.total_duration_ms}
                                                />
                                            </motion.div>

                                            {/* Test Case Details */}
                                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                                {results.results.map((result, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3"
                                                        variants={itemVariants}
                                                        whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-medium text-foreground">{result.title}</h4>
                                                            <Badge className={
                                                                result.status === "passed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                                    result.status === "failed" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                                        "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                            }>
                                                                {result.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {result.steps.map((step) => (
                                                                <StepResult
                                                                    key={step.step_number}
                                                                    stepNumber={step.step_number}
                                                                    description={step.description}
                                                                    status={step.status}
                                                                    durationMs={step.duration_ms}
                                                                    details={step.details}
                                                                    error={step.error}
                                                                />
                                                            ))}
                                                        </div>
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

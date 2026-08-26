import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LoadTestSummaryModal } from "@/components/modals/LoadTestSummaryModal";
import {
    Zap,
    Users,
    TrendingUp,
    Clock,
    Play,
    FileDown,
    Loader2,
    CheckCircle2,
    XCircle,
    Activity,
    BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface Project {
    id: number;
    name: string;
}

interface LoadTestJob {
    id: string;
    project_id: number | null;
    project_name: string | null;
    base_url: string;
    users: number;
    spawn_rate: number;
    run_time: string;
    endpoints: string[];
    status: "running" | "completed" | "failed";
    created_at: string;
    report_path: string | null;
}

export default function LoadTesting() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [baseUrl, setBaseUrl] = useState("http://localhost:8000");
    const [users, setUsers] = useState(100);
    const [spawnRate, setSpawnRate] = useState(10);
    const [runTime, setRunTime] = useState("1m");
    const [endpoints, setEndpoints] = useState("/\n/api/projects");
    const [isRunning, setIsRunning] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [jobs, setJobs] = useState<LoadTestJob[]>([]);
    const [selectedJob, setSelectedJob] = useState<LoadTestJob | null>(null);
    const [summaryJobId, setSummaryJobId] = useState<string>("");
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);

    // Fetch projects
    useEffect(() => {
        fetchProjects();
        fetchJobs();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch("/api/projects/", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                }
            });
            const data = await response.json();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        }
    };

    const fetchJobs = async () => {
        try {
            const response = await fetch("/api/load-testing/jobs", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                }
            });
            const data = await response.json();
            setJobs(data.jobs || []);
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        }
    };

    const startLoadTest = async () => {
        if (!baseUrl) {
            toast.error("Please enter a base URL");
            return;
        }

        setIsRunning(true);
        setLogs([]);

        try {
            const endpointsList = endpoints.split("\n").filter(e => e.trim());

            const response = await fetch("/api/load-testing/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify({
                    project_id: selectedProjectId ? parseInt(selectedProjectId) : null,
                    base_url: baseUrl,
                    users,
                    spawn_rate: spawnRate,
                    run_time: runTime,
                    endpoints: endpointsList,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to start load test");
            }

            const data = await response.json();
            setCurrentJobId(data.job_id);

            // Connect to SSE
            const token = localStorage.getItem("authToken") || "";
            const eventSource = new EventSource(
                `/api/load-testing/${data.job_id}/events?token=${encodeURIComponent(token)}`
            );

            eventSource.onmessage = (event) => {
                const message = event.data;
                setLogs((prev) => [...prev, message]);
            };

            eventSource.addEventListener("done", () => {
                eventSource.close();
                setIsRunning(false);
                toast.success("Load test completed!");
                fetchJobs();
            });

            eventSource.onerror = () => {
                eventSource.close();
                setIsRunning(false);
                toast.error("Connection lost");
            };

        } catch (error) {
            toast.error("Failed to start load test");
            setIsRunning(false);
            console.error(error);
        }
    };

    const downloadPDF = async (jobId: string) => {
        try {
            const response = await fetch(
                `/api/load-testing/${jobId}/report/pdf`,
                {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                    }
                }
            );
            if (!response.ok) throw new Error("PDF download failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `load_test_report_${jobId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Report downloaded");
        } catch (error) {
            toast.error("Failed to download PDF");
            console.error(error);
        }
    };

    const viewReport = (jobId: string) => {
        setSummaryJobId(jobId);
        setSummaryModalOpen(true);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "failed":
                return <XCircle className="h-5 w-5 text-red-500" />;
            case "running":
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
            default:
                return <Activity className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Zap className="h-8 w-8 text-yellow-500" />
                        Load & Stress Testing
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Simulate thousands of concurrent users to test your application's performance and scalability
                    </p>
                </div>

                <Tabs defaultValue="configure" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="configure">Configure Test</TabsTrigger>
                        <TabsTrigger value="results">Test History</TabsTrigger>
                    </TabsList>

                    {/* Configuration Tab */}
                    <TabsContent value="configure">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Configuration Form */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Test Configuration
                                    </CardTitle>
                                    <CardDescription>
                                        Configure your load test parameters
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Project Selection */}
                                    <div className="space-y-2">
                                        <Label>Project (Optional)</Label>
                                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a project..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projects.map((p) => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Base URL */}
                                    <div className="space-y-2">
                                        <Label>Target URL</Label>
                                        <Input
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder="https://example.com"
                                        />
                                    </div>

                                    {/* Users */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Total Users</Label>
                                            <Input
                                                type="number"
                                                value={users}
                                                onChange={(e) => setUsers(parseInt(e.target.value))}
                                                min={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Spawn Rate (users/sec)</Label>
                                            <Input
                                                type="number"
                                                value={spawnRate}
                                                onChange={(e) => setSpawnRate(parseInt(e.target.value))}
                                                min={1}
                                            />
                                        </div>
                                    </div>

                                    {/* Run Time */}
                                    <div className="space-y-2">
                                        <Label>Run Time</Label>
                                        <Select value={runTime} onValueChange={setRunTime}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="30s">30 seconds</SelectItem>
                                                <SelectItem value="1m">1 minute</SelectItem>
                                                <SelectItem value="5m">5 minutes</SelectItem>
                                                <SelectItem value="10m">10 minutes</SelectItem>
                                                <SelectItem value="30m">30 minutes</SelectItem>
                                                <SelectItem value="1h">1 hour</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Endpoints */}
                                    <div className="space-y-2">
                                        <Label>Endpoints to Test (one per line)</Label>
                                        <textarea
                                            className="w-full min-h-[120px] p-2 border rounded-md font-mono text-sm"
                                            value={endpoints}
                                            onChange={(e) => setEndpoints(e.target.value)}
                                            placeholder="/&#10;/api/users&#10;/api/products"
                                        />
                                    </div>

                                    {/* Run Button */}
                                    <Button
                                        onClick={startLoadTest}
                                        disabled={isRunning}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isRunning ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Running Load Test...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="mr-2 h-5 w-5" />
                                                Start Load Test
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Live Output */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Test Progress
                                    </CardTitle>
                                    <CardDescription>
                                        Real-time updates on your load test
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-slate-50 dark:bg-slate-900 border-2 p-6 rounded-lg h-[500px] overflow-y-auto">
                                        {logs.length === 0 ? (
                                            <div className="text-center text-muted-foreground py-12">
                                                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                <p className="text-lg font-medium">Ready to start testing</p>
                                                <p className="text-sm mt-2">Configure your test and click "Start Load Test" to begin</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {logs.map((log, idx) => {
                                                    // Determine message type for styling
                                                    const isSuccess = log.toLowerCase().includes('completed successfully') || log.toLowerCase().includes('all') && log.toLowerCase().includes('active');
                                                    const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail') || log.toLowerCase().includes('warning');
                                                    const isProgress = log.toLowerCase().includes('running') || log.toLowerCase().includes('collecting') || log.toLowerCase().includes('starting');
                                                    const isMetric = log.toLowerCase().includes('requests per second') || log.toLowerCase().includes('response time');
                                                    const isEmpty = log.trim() === '';

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`
                                                                ${isEmpty ? 'h-2' : 'p-3 rounded-md'}
                                                                ${isSuccess ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium' : ''}
                                                                ${isError ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium' : ''}
                                                                ${isProgress && !isSuccess && !isError ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''}
                                                                ${isMetric && !isSuccess && !isError ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-sm' : ''}
                                                                ${!isSuccess && !isError && !isProgress && !isMetric && !isEmpty ? 'bg-white dark:bg-slate-800/50 text-gray-700 dark:text-gray-300' : ''}
                                                            `}
                                                        >
                                                            {!isEmpty && (
                                                                <span className="leading-relaxed">{log}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Results Tab */}
                    <TabsContent value="results">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Test History
                                </CardTitle>
                                <CardDescription>
                                    View and download previous test results
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {jobs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No load tests run yet. Start a test to see results here.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {jobs.map((job) => (
                                            <Card key={job.id} className="border-2">
                                                <CardContent className="pt-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(job.status)}
                                                                <span className="font-semibold">{job.base_url}</span>
                                                                <Badge variant="outline">{job.users} users</Badge>
                                                            </div>
                                                            {job.project_name && (
                                                                <div className="text-sm text-muted-foreground">
                                                                    Project: {job.project_name}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-4 w-4" />
                                                                    {job.run_time}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <TrendingUp className="h-4 w-4" />
                                                                    {job.spawn_rate}/s spawn rate
                                                                </span>
                                                                <span>
                                                                    {new Date(job.created_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {job.status === "completed" && (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => viewReport(job.id)}
                                                                >
                                                                    <Activity className="mr-2 h-4 w-4" />
                                                                    View Report
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => downloadPDF(job.id)}
                                                                >
                                                                    <FileDown className="mr-2 h-4 w-4" />
                                                                    Download PDF
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Summary Modal */}
            <LoadTestSummaryModal
                isOpen={summaryModalOpen}
                onOpenChange={setSummaryModalOpen}
                jobId={summaryJobId}
            />
        </DashboardLayout>
    );
}

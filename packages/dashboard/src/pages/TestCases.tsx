import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useProjects } from "@/context/ProjectsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Trash2, Edit2, Info, Play, RefreshCw, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateTestCaseModal } from "@/components/modals/CreateTestCaseModal";
import { EditTestCaseModal } from "@/components/modals/EditTestCaseModal";
import { RunTestSimulationModal } from "@/components/modals/RunTestSimulationModal";
import { useCrud } from "@/hooks/use-crud";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import { normalizeStatus, parsePriority, parseSpreadsheetFile, pickImportValue } from "@/lib/spreadsheet-import";

export default function TestCases() {
  const [testCases, setTestCases] = useState([]);
  const [filteredTestCases, setFilteredTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requirementsMap, setRequirementsMap] = useState<Record<string, string>>({});
  const [requirementTitleMap, setRequirementTitleMap] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState<"ongoing" | "retest" | "pass" | "fail">("ongoing");
  const { projects, loading: projectsLoading, refresh, selectedProjectId, setSelectedProjectId } = useProjects();
  const selectedProject = selectedProjectId && selectedProjectId !== "all" ? selectedProjectId : (projects[0]?.id || "");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null);
  const [isRunTestModalOpen, setIsRunTestModalOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return "Critical";
      case 2: return "High";
      case 3: return "Medium";
      case 4: return "Low";
      case 5: return "Lowest";
      default: return "Unknown";
    }
  };

  // Define fetch function first so it can be used in useCrud and useEffect
  async function fetchTestCases() {
    if (!selectedProject) {
      setTestCases([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/test-cases/${selectedProject}?status=${currentTab}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setTestCases(data);
    } catch (err) {
      console.error("Error fetching test cases:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRequirements() {
    if (!selectedProject) {
      setRequirementsMap({});
      return;
    }
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/requirements/${selectedProject}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      const map: Record<string, string> = {};
      const titleMap: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        map[String(r.id)] = r.title;
        if (r.title) titleMap[String(r.title).toLowerCase().trim()] = String(r.id);
      });
      setRequirementsMap(map);
      setRequirementTitleMap(titleMap);
    } catch (err) {
      console.error("Error fetching requirements for test cases grouping:", err);
    }
  }

  const { delete: deleteTestCase } = useCrud({
    baseUrl: "/api/test-cases",
    onSuccess: fetchTestCases,
  });

  useEffect(() => {
    fetchTestCases();
  }, [selectedProject]);

  useEffect(() => {
    fetchRequirements();
  }, [selectedProject]);

  useEffect(() => {
    setFilteredTestCases(testCases);
  }, [testCases]);

  useEffect(() => {
    const handler = (e: any) => {
      const q = (e?.detail || "").toString().toLowerCase().trim();
      if (!q) {
        setFilteredTestCases(testCases);
        return;
      }
      const filtered = testCases.filter((t: any) => {
        const title = (t.title || "").toString().toLowerCase();
        const desc = (t.description || "").toString().toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
      setFilteredTestCases(filtered);
    };
    window.addEventListener("globalSearch", handler as EventListener);
    return () => window.removeEventListener("globalSearch", handler as EventListener);
  }, [testCases]);
  // Sync selected project when projects list changes
  useEffect(() => {
    if (!projects || projects.length === 0) {
      setSelectedProject("");
      return;
    }
    if (!projects.find((p: any) => p.id === selectedProject)) {
      setSelectedProject(projects[0].id);
    }
  }, [projects]);

  // Ensure projects are fresh when this page mounts
  useEffect(() => {
    try {
      console.debug("[TestCases] calling refresh on mount");
      refresh();
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    // refetch when tab changes
    setLoading(true);
    fetchTestCases();
  }, [currentTab]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refresh();
      fetchRequirements();
      fetchTestCases();
    } catch (e) {
      fetchRequirements();
      fetchTestCases();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this test case?")) {
      await deleteTestCase(id);
    }
  };

  const handleEdit = (testCase: any) => {
    setSelectedTestCase(testCase);
    setIsEditModalOpen(true);
  };

  const handleRunTest = (testCase: any) => {
    setSelectedTestCase(testCase);
    setIsRunTestModalOpen(true);
  };

  const handleImportTestCases = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!selectedProject) {
      toast({ title: "Select a project first", description: "Choose a project before importing test cases.", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const rows = await parseSpreadsheetFile(file);

      if (rows.length === 0) {
        toast({ title: "No data found", description: "The selected file does not contain importable rows.", variant: "destructive" });
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const title = pickImportValue(row, ["title", "test case", "test case title", "name"]);
        if (!title) {
          skippedCount += 1;
          continue;
        }

        const requirementText = pickImportValue(row, ["requirement id", "requirement_id", "requirement", "requirement title"]);
        const parsedRequirementId = Number.parseInt(requirementText, 10);
        const requirementId = Number.isFinite(parsedRequirementId)
          ? parsedRequirementId
          : requirementTitleMap[requirementText.toLowerCase().trim()];

        const payload = {
          project_id: selectedProject,
          requirement_id: requirementId || undefined,
          test_case_id: pickImportValue(row, ["test case id", "test_case_id", "id"]) || undefined,
          title,
          description: pickImportValue(row, ["description", "details", "desc"]) || undefined,
          test_type: pickImportValue(row, ["test type", "test_type", "type"]) || "manual",
          priority: parsePriority(pickImportValue(row, ["priority", "priority level"]), 3),
          status: normalizeStatus(pickImportValue(row, ["status", "state"]), ["ongoing", "retest", "pass", "fail"], "ongoing"),
        };

        const response = await fetch("/api/test-cases/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          importedCount += 1;
        } else {
          skippedCount += 1;
        }
      }

      await fetchTestCases();
      toast({
        title: "Import completed",
        description: `Imported ${importedCount} test case(s)${skippedCount ? `, skipped ${skippedCount}` : ""}.`,
      });
    } catch (error) {
      console.error("Test case import failed", error);
      toast({ title: "Import failed", description: "Could not parse or import the file.", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const token = localStorage.getItem("authToken");
    try {
      await fetch(`/api/test-cases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });
      fetchTestCases();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pass": return "default";
      case "fail": return "destructive";
      case "retest": return "secondary";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pass": return "Pass";
      case "fail": return "Fail";
      case "retest": return "Retest";
      case "ongoing": return "Ongoing";
      default: return status;
    }
  };

  if (loading) return <div className="p-6">Loading test cases...</div>;

  // Group test cases by requirement_id
  const grouped = (filteredTestCases || []).reduce((acc: any, tc: any) => {
    const rid = tc.requirement_id || "none";
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push(tc);
    return acc;
  }, {} as Record<string, any[]>);

  const groups = Object.keys(grouped).map((k) => ({
    requirementId: k,
    title: k === "none" || k === "0" ? "(No Requirement)" : (requirementsMap[k] || `Requirement ${k}`),
    testCases: grouped[k],
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Test Cases</h1>
            <p className="text-muted-foreground">Design, execute, and manage test cases</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportTestCases}
            />
            <a
              href="/templates/test_cases_template.csv"
              download="test_cases_template.csv"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              title="Download Excel/CSV Import Template"
            >
              <Upload className="h-4 w-4 mr-2 rotate-180" />
              Template
            </a>
            <Button onClick={() => importInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import File
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Test Case
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium">Filter by Project:</label>
          <select
            value={selectedProjectId || selectedProject}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="mt-2 rounded border border-input bg-background px-3 py-2"
          >
            {!Array.isArray(projects) || projects.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            )}
          </select>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded ${currentTab === "ongoing" ? "bg-accent text-accent-foreground" : "bg-muted"}`}
            onClick={() => setCurrentTab("ongoing")}
          >
            Ongoing
          </button>
          <button
            className={`px-3 py-1 rounded ${currentTab === "retest" ? "bg-accent text-accent-foreground" : "bg-muted"}`}
            onClick={() => setCurrentTab("retest")}
          >
            Retest
          </button>
          <button
            className={`px-3 py-1 rounded ${currentTab === "pass" ? "bg-accent text-accent-foreground" : "bg-muted"}`}
            onClick={() => setCurrentTab("pass")}
          >
            Pass
          </button>
          <button
            className={`px-3 py-1 rounded ${currentTab === "fail" ? "bg-accent text-accent-foreground" : "bg-muted"}`}
            onClick={() => setCurrentTab("fail")}
          >
            Fail
          </button>
        </div>

        {filteredTestCases.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                No Test Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No test cases found for this project.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Accordion type="multiple" className="space-y-4">
              {groups.map((g) => (
                <AccordionItem value={`req-${g.requirementId}`} key={String(g.requirementId)}>
                  <AccordionTrigger>
                    <div className="w-full flex items-center justify-between px-4 py-2 bg-background border border-border rounded-lg hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-lg font-semibold text-foreground">{g.title}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Click to expand and view test cases
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{g.testCases.length}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 mt-3">
                      {g.testCases.map((tc: any) => (
                        <div key={tc.id} className="p-4 border rounded-md bg-card space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <CheckSquare className="h-5 w-5 text-primary" />
                              <div>
                                <div className="font-medium text-foreground">{tc.title}</div>
                                <div className="text-sm text-muted-foreground">{tc.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleRunTest(tc)} title="Run test simulation">
                                <Play className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(tc)}>
                                <Edit2 className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Select value={tc.status || "ongoing"} onValueChange={(value) => handleStatusChange(tc.id, value)}>
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ongoing">Ongoing</SelectItem>
                                  <SelectItem value="retest">Retest</SelectItem>
                                  <SelectItem value="pass">Pass</SelectItem>
                                  <SelectItem value="fail">Fail</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(tc.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(tc.status || "ongoing")}>
                                {getStatusLabel(tc.status || "ongoing")}
                              </Badge>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Priority: </span>
                                <span className="font-semibold">{getPriorityLabel(tc.priority)}</span>
                              </div>
                              <Badge variant={tc.is_automated ? "default" : "secondary"}>{tc.is_automated ? "Auto" : "Manual"}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      <CreateTestCaseModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        projectId={selectedProject}
        onSuccess={fetchTestCases}
      />
      <EditTestCaseModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        testCase={selectedTestCase}
        onSuccess={fetchTestCases}
      />
      {selectedTestCase && (
        <RunTestSimulationModal
          isOpen={isRunTestModalOpen}
          onOpenChange={setIsRunTestModalOpen}
          testCase={selectedTestCase}
        />
      )}
    </DashboardLayout>
  );
}
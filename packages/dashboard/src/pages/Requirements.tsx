import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useProjects } from "@/context/ProjectsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Sparkles, Loader2, Beaker, Play, RefreshCw, Upload } from "lucide-react";
import { CreateRequirementModal } from "@/components/modals/CreateRequirementModal";
import { EditRequirementModal } from "@/components/modals/EditRequirementModal";
import { GeneratedTestsModal } from "@/components/modals/GeneratedTestsModal";
import { GenerateAndRunTestModal } from "@/components/modals/GenerateAndRunTestModal";
import { AnalyzeRequirementModal } from "@/components/copilot/AnalyzeRequirementModal";
import { GenerateTestCasesModal } from "@/components/copilot/GenerateTestCasesModal";
import { useCrud } from "@/hooks/use-crud";
import { useToast } from "@/components/ui/use-toast";
import { parseDelimitedList, parsePriority, parseSpreadsheetFile, pickImportValue } from "@/lib/spreadsheet-import";

export default function Requirements() {
  const [requirements, setRequirements] = useState([]);
  const [filteredRequirements, setFilteredRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { projects, loading: projectsLoading, refresh, selectedProjectId, setSelectedProjectId } = useProjects();
  const selectedProject = selectedProjectId && selectedProjectId !== "all" ? selectedProjectId : (projects[0]?.id || "");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isGenerateTestsModalOpen, setIsGenerateTestsModalOpen] = useState(false);
  const [isGenerateAndRunModalOpen, setIsGenerateAndRunModalOpen] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState<{ [key: number]: boolean }>({});
  const [generatedTests, setGeneratedTests] = useState([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

  const { toast } = useToast();

  const fetchRequirements = async () => {
    if (!selectedProject) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`/api/requirements?projectId=${selectedProject}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setRequirements(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      toast({ title: "Error", description: "Failed to fetch requirements", variant: "destructive" });
      setLoading(false);
    }
  };

  const { delete: deleteRequirement } = useCrud({
    baseUrl: "/api/requirements",
    onSuccess: () => {
      fetchRequirements();
      toast({ title: "Requirement deleted successfully." });
    },
  });

  useEffect(() => {
    fetchRequirements();
  }, [selectedProject]);

  useEffect(() => {
    setFilteredRequirements(requirements);
  }, [requirements]);

  useEffect(() => {
    const handler = (e: any) => {
      const q = (e?.detail || "").toString().toLowerCase().trim();
      if (!q) {
        setFilteredRequirements(requirements);
        return;
      }
      const filtered = requirements.filter((r: any) => {
        const title = (r.title || "").toString().toLowerCase();
        const desc = (r.description || "").toString().toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
      setFilteredRequirements(filtered);
    };
    window.addEventListener("globalSearch", handler as EventListener);
    return () => window.removeEventListener("globalSearch", handler as EventListener);
  }, [requirements]);

  // Ensure projects are fresh when this page mounts
  useEffect(() => {
    refresh();
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refresh();
      fetchRequirements();
    } catch (e) {
      fetchRequirements();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this requirement?")) {
      await deleteRequirement(id);
    }
  };

  const handleEdit = (requirement: any) => {
    setSelectedRequirement(requirement);
    setIsEditModalOpen(true);
  };

  const handleAnalyzeClarity = async (requirement: any) => {
    setSelectedRequirement(requirement);
    setIsAnalyzeModalOpen(true);
  };

  const handleGenerateTests = async (requirement: any) => {
    setSelectedRequirement(requirement);
    setIsGenerateTestsModalOpen(true);
  };

  const handleGenerateAndRun = async (requirement: any) => {
    setSelectedRequirement(requirement);
    setIsGenerateAndRunModalOpen(true);
  };

  const handleImportRequirements = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!selectedProject) {
      toast({ title: "Select a project first", description: "Choose a project before importing requirements.", variant: "destructive" });
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
        const title = pickImportValue(row, ["title", "requirement title", "requirement", "name", "summary"]);
        if (!title) {
          skippedCount += 1;
          continue;
        }

        const description = pickImportValue(row, ["description", "details", "desc"]);
        const acceptance = pickImportValue(row, ["acceptance criteria", "acceptance_criteria", "criteria"]);
        const requirementId = pickImportValue(row, ["requirement id", "requirement_id", "id"]);
        const priority = parsePriority(pickImportValue(row, ["priority", "priority level"]), 3);

        const payload = {
          project_id: selectedProject,
          requirement_id: requirementId || undefined,
          title,
          description: description || title,
          acceptance_criteria: parseDelimitedList(acceptance),
          priority,
        };

        const response = await fetch("/api/requirements/", {
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

      await fetchRequirements();
      toast({
        title: "Import completed",
        description: `Imported ${importedCount} requirement(s)${skippedCount ? `, skipped ${skippedCount}` : ""}.`,
      });
    } catch (error) {
      console.error("Requirement import failed", error);
      toast({ title: "Import failed", description: "Could not parse or import the file.", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-6">Loading requirements...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Requirements</h1>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportRequirements}
            />
            <a
              href="/templates/requirements_template.csv"
              download="requirements_template.csv"
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
              <Plus className="mr-2 h-4 w-4" /> New Requirement
            </Button>
          </div>
        </div>

        {/* Project filter dropdown */}
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

        {/* Requirements List */}
        <div className="grid gap-4">
          {filteredRequirements.map((req: any) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{req.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={req.status === "approved" ? "default" : "secondary"}>
                      {req.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleAnalyzeClarity(req)} disabled={analysisLoading[req.id]}>
                      {analysisLoading[req.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleGenerateTests(req)} disabled={analysisLoading[req.id]}>
                      {analysisLoading[req.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleGenerateAndRun(req)} title="AI generates & runs test">
                      <Play className="h-4 w-4 text-orange-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(req)}>
                      <Edit2 className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(req.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <p className="font-semibold">{getPriorityLabel(req.priority)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clarity Score</p>
                    <p className="font-semibold">
                      {req.clarity_score !== null && req.clarity_score !== undefined
                        ? `${Number(req.clarity_score).toFixed(1)}%`
                        : req.clarityScore !== null && req.clarityScore !== undefined
                          ? `${Number(req.clarityScore).toFixed(1)}%`
                          : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Testable</p>
                    <p className="font-semibold">
                      {(req.is_testable ?? req.isTestable ?? ((req.testability_score ?? req.testabilityScore ?? 0) >= 70)) ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreateRequirementModal isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} projectId={selectedProject} onSuccess={fetchRequirements} />
      <EditRequirementModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} requirement={selectedRequirement} onSuccess={fetchRequirements} />
      <GenerateAndRunTestModal
        open={isGenerateAndRunModalOpen}
        onOpenChange={setIsGenerateAndRunModalOpen}
        requirements={filteredRequirements}
      />
      {selectedRequirement && (
        <>
          <AnalyzeRequirementModal
            isOpen={isAnalyzeModalOpen}
            onOpenChange={setIsAnalyzeModalOpen}
            requirementId={selectedRequirement.id}
            requirementTitle={selectedRequirement.title}
            onSuccess={fetchRequirements}
          />
          {Boolean(selectedProject) && (
            <GenerateTestCasesModal
              isOpen={isGenerateTestsModalOpen}
              onOpenChange={setIsGenerateTestsModalOpen}
              requirementId={selectedRequirement.id}
              requirementTitle={selectedRequirement.title}
              projectId={selectedProject}
            />
          )}
        </>
      )}
    </DashboardLayout>
  );
}
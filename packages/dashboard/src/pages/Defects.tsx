import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useProjects } from "@/context/ProjectsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Plus, Trash2, Edit2, RefreshCw, Upload, CheckSquare, Layers, AlertTriangle, ExternalLink, Image as ImageIcon } from "lucide-react";
import { CreateDefectModal } from "@/components/modals/CreateDefectModal";
import { EditDefectModal } from "@/components/modals/EditDefectModal";
import { useCrud } from "@/hooks/use-crud";
import { useToast } from "@/components/ui/use-toast";
import { parseSpreadsheetFile, pickImportValue } from "@/lib/spreadsheet-import";

export default function Defects() {
  const [defects, setDefects] = useState([]);
  const [filteredDefects, setFilteredDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { projects, loading: projectsLoading, refresh, selectedProjectId, setSelectedProjectId } = useProjects();
  const selectedProject = selectedProjectId && selectedProjectId !== "all" ? selectedProjectId : (projects[0]?.id || "");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | "">("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const { delete: deleteDefect } = useCrud({
    baseUrl: "/api/defects",
    onSuccess: fetchDefects,
  });

  function fetchDefects() {
    if (!selectedProject) {
      setDefects([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("authToken");

    fetch(`/api/defects/${selectedProject}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setDefects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching defects:", err);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchDefects();
  }, [selectedProject]);

  useEffect(() => {
    const applyStatusFilter = (items: any[]) => {
      if (!statusFilter) return items;
      if (statusFilter === "open") return items.filter((d) => (d.status || "").toLowerCase() === "open");
      if (statusFilter === "completed") return items.filter((d) => {
        const s = (d.status || "").toLowerCase();
        return s === "resolved" || s === "closed";
      });
      return items;
    };

    setFilteredDefects(applyStatusFilter(defects));
  }, [defects, statusFilter]);

  useEffect(() => {
    const handler = (e: any) => {
      const q = (e?.detail || "").toString().toLowerCase().trim();
      if (!q) {
        // re-apply current status filter when clearing search
        const items = statusFilter ? defects.filter((d) => {
          const s = (d.status || "").toLowerCase();
          if (statusFilter === "open") return s === "open";
          if (statusFilter === "completed") return s === "resolved" || s === "closed";
          return true;
        }) : defects;
        setFilteredDefects(items);
        return;
      }
      const filtered = defects.filter((d: any) => {
        const title = (d.title || "").toString().toLowerCase();
        const desc = (d.description || "").toString().toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
      // respect status filter when searching
      const items = statusFilter ? filtered.filter((d) => {
        const s = (d.status || "").toLowerCase();
        if (statusFilter === "open") return s === "open";
        if (statusFilter === "completed") return s === "resolved" || s === "closed";
        return true;
      }) : filtered;
      setFilteredDefects(items);
    };
    window.addEventListener("globalSearch", handler as EventListener);
    return () => window.removeEventListener("globalSearch", handler as EventListener);
  }, [defects]);

  // Sync selected project when projects list changes
  useEffect(() => {
    if (!projects || projects.length === 0) {
      setSelectedProjectId("");
      return;
    }
    if (!projects.find((p: any) => p.id === selectedProject)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  // Ensure projects are fresh when this page mounts
  useEffect(() => {
    try {
      console.debug("[Defects] calling refresh on mount");
      refresh();
    } catch (e) {
      // ignore
    }
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refresh();
      fetchDefects();
    } catch (e) {
      fetchDefects();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this defect?")) {
      await deleteDefect(id);
    }
  };

  const handleEdit = (defect: any) => {
    setSelectedDefect(defect);
    setIsEditModalOpen(true);
  };

  const handleImportDefects = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!selectedProject) {
      toast({ title: "Select a project first", description: "Choose a project before importing defects.", variant: "destructive" });
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
        const title = pickImportValue(row, ["title", "defect", "defect title", "name"]);
        if (!title) {
          skippedCount += 1;
          continue;
        }

        const severity = pickImportValue(row, ["severity", "level"]).toLowerCase() || "medium";
        const payload = {
          project_id: selectedProject,
          defect_id: pickImportValue(row, ["defect id", "defect_id", "id"]) || undefined,
          title,
          description: pickImportValue(row, ["description", "details", "desc"]) || undefined,
          severity,
          found_by: pickImportValue(row, ["found by", "found_by", "reporter", "owner"]) || undefined,
        };

        const response = await fetch("/api/defects/", {
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

      fetchDefects();
      toast({
        title: "Import completed",
        description: `Imported ${importedCount} defect(s)${skippedCount ? `, skipped ${skippedCount}` : ""}.`,
      });
    } catch (error) {
      console.error("Defect import failed", error);
      toast({ title: "Import failed", description: "Could not parse or import the file.", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-6">Loading defects...</div>;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Defects</h1>
            <p className="text-muted-foreground">Track and manage defects across projects</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportDefects}
            />
            <a
              href="/templates/defects_template.csv"
              download="defects_template.csv"
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
              <Plus className="mr-2 h-4 w-4" />
              New Defect
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
            {projects.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            )}
          </select>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium">Status:</label>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${statusFilter === "" ? "bg-primary text-white" : "border"}`}
              onClick={() => setStatusFilter("")}
            >
              All
            </button>
            <button
              className={`px-3 py-1 rounded ${statusFilter === "open" ? "bg-primary text-white" : "border"}`}
              onClick={() => setStatusFilter("open")}
            >
              Open
            </button>
            <button
              className={`px-3 py-1 rounded ${statusFilter === "completed" ? "bg-primary text-white" : "border"}`}
              onClick={() => setStatusFilter("completed")}
            >
              Completed
            </button>
          </div>
        </div>

        {filteredDefects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                No Defects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No defects found for this project.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDefects.map((defect) => (
              <Card key={defect.id} className="border hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Bug className="h-4 w-4 text-destructive shrink-0" />
                          {defect.title}
                        </CardTitle>
                        <Badge variant={getSeverityColor(defect.severity)}>
                          {defect.severity}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{defect.status}</Badge>
                      </div>

                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {defect.description}
                      </p>

                      {/* Linked Context: Test Case & Requirement */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {(defect.test_case_title || defect.testCaseTitle) && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1 font-medium">
                            <CheckSquare className="h-3 w-3" />
                            Test Case: {defect.test_case_title || defect.testCaseTitle}
                          </Badge>
                        )}
                        {(defect.requirement_title || defect.requirementTitle) && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 text-xs flex items-center gap-1 font-medium">
                            <Layers className="h-3 w-3" />
                            Requirement: {defect.requirement_title || defect.requirementTitle}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(defect)}
                        title="Edit defect"
                      >
                        <Edit2 className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(defect.id)}
                        title="Delete defect"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Root Cause Analysis & Suggested Fix */}
                  {(defect.root_cause_analysis || defect.rootCauseAnalysis || defect.suggested_fix || defect.suggestedFix) && (
                    <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1.5">
                      {(defect.root_cause_analysis || defect.rootCauseAnalysis) && (
                        <div>
                          <span className="font-semibold text-foreground flex items-center gap-1 mb-0.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            Failure Reason & Root Cause:
                          </span>
                          <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed pl-4">
                            {defect.root_cause_analysis || defect.rootCauseAnalysis}
                          </p>
                        </div>
                      )}
                      {(defect.suggested_fix || defect.suggestedFix) && (
                        <div className="pt-1 border-t border-border/50">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Suggested Fix:{" "}
                          </span>
                          <span className="text-muted-foreground">
                            {defect.suggested_fix || defect.suggestedFix}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata Bar & Artifacts */}
                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground border-t">
                    <div className="flex items-center gap-4">
                      <span>ID: <strong className="font-mono text-foreground">{defect.defect_id || defect.id}</strong></span>
                      {defect.created_at && (
                        <span>Logged: <strong>{new Date(defect.created_at || defect.createdAt).toLocaleString()}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(defect.screenshot_url || defect.screenshotUrl) && (
                        <a
                          href={defect.screenshot_url || defect.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Screenshot
                        </a>
                      )}
                      {(defect.trace_url || defect.traceUrl) && (
                        <a
                          href={defect.trace_url || defect.traceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Trace
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateDefectModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        projectId={selectedProject}
        onSuccess={fetchDefects}
      />
      <EditDefectModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        defect={selectedDefect}
        onSuccess={fetchDefects}
      />
    </DashboardLayout>
  );
}

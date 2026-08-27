import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useProjects } from "@/context/ProjectsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Plus, Trash2, Edit2, RefreshCw, Upload, CheckSquare, Layers, AlertTriangle, ExternalLink, Image as ImageIcon, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
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
  const [expandedDefects, setExpandedDefects] = useState<Record<string | number, boolean>>({});
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const toggleExpand = (id: string | number) => {
    setExpandedDefects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    const areAllExpanded = filteredDefects.length > 0 && filteredDefects.every((d) => expandedDefects[d.id]);
    const next: Record<string | number, boolean> = {};
    filteredDefects.forEach((d) => {
      next[d.id] = !areAllExpanded;
    });
    setExpandedDefects(next);
  };

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
            {filteredDefects.length > 0 && (
              <Button
                onClick={handleExpandAll}
                variant="outline"
                size="sm"
                className="gap-1.5"
                title="Expand or collapse all defect details"
              >
                <ChevronsUpDown className="h-4 w-4" />
                {filteredDefects.every((d) => expandedDefects[d.id]) ? "Collapse All" : "Expand All"}
              </Button>
            )}
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

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Project:</label>
            <select
              value={selectedProjectId || selectedProject}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm"
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

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <div className="flex gap-1.5">
              <button
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${statusFilter === "" ? "bg-primary text-white" : "border bg-background hover:bg-muted"}`}
                onClick={() => setStatusFilter("")}
              >
                All ({defects.length})
              </button>
              <button
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${statusFilter === "open" ? "bg-primary text-white" : "border bg-background hover:bg-muted"}`}
                onClick={() => setStatusFilter("open")}
              >
                Open ({defects.filter((d) => (d.status || "").toLowerCase() === "open").length})
              </button>
              <button
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${statusFilter === "completed" ? "bg-primary text-white" : "border bg-background hover:bg-muted"}`}
                onClick={() => setStatusFilter("completed")}
              >
                Completed ({defects.filter((d) => ["resolved", "closed"].includes((d.status || "").toLowerCase())).length})
              </button>
            </div>
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
          <div className="space-y-2.5">
            {filteredDefects.map((defect) => {
              const isExpanded = !!expandedDefects[defect.id];
              const testCaseTitle = defect.test_case_title || defect.testCaseTitle;
              const reqTitle = defect.requirement_title || defect.requirementTitle;
              const rootCause = defect.root_cause_analysis || defect.rootCauseAnalysis;
              const suggestedFix = defect.suggested_fix || defect.suggestedFix;
              const screenshotUrl = defect.screenshot_url || defect.screenshotUrl;
              const traceUrl = defect.trace_url || defect.traceUrl;

              return (
                <Card
                  key={defect.id}
                  className={`border transition-all ${
                    isExpanded ? "shadow-sm border-primary/40 bg-card" : "hover:border-border/80 bg-card/70 hover:bg-card"
                  }`}
                >
                  {/* Compressed Header Row */}
                  <div
                    onClick={() => toggleExpand(defect.id)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded hover:bg-muted"
                        aria-label={isExpanded ? "Collapse defect" : "Expand defect"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <Bug className="h-4 w-4 text-destructive shrink-0" />

                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate max-w-[280px] sm:max-w-md">
                          {defect.title}
                        </span>

                        <Badge variant={getSeverityColor(defect.severity)} className="text-[10px] py-0 px-1.5 h-4 font-semibold uppercase">
                          {defect.severity}
                        </Badge>

                        <Badge
                          variant={["resolved", "closed"].includes((defect.status || "").toLowerCase()) ? "outline" : "secondary"}
                          className={`text-[10px] py-0 px-1.5 h-4 capitalize font-medium ${
                            ["resolved", "closed"].includes((defect.status || "").toLowerCase()) ? "border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" : ""
                          }`}
                        >
                          {defect.status}
                        </Badge>

                        {testCaseTitle && (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] py-0 px-1.5 h-4 flex items-center gap-1 font-normal truncate max-w-[180px]">
                            <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{testCaseTitle}</span>
                          </Badge>
                        )}

                        {reqTitle && (
                          <Badge variant="outline" className="bg-purple-500/5 text-purple-700 dark:text-purple-300 border-purple-300 text-[10px] py-0 px-1.5 h-4 flex items-center gap-1 font-normal truncate max-w-[180px]">
                            <Layers className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{reqTitle}</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right Action Icons & Date */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {defect.created_at && (
                        <span className="text-[11px] text-muted-foreground hidden md:inline-block font-mono">
                          {new Date(defect.created_at || defect.createdAt).toLocaleDateString()}
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(defect)}
                        title="Edit defect"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDelete(defect.id)}
                        title="Delete defect"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* One-line preview if collapsed and description exists */}
                  {!isExpanded && defect.description && (
                    <div
                      onClick={() => toggleExpand(defect.id)}
                      className="px-3.5 pb-2.5 pt-0 -mt-1 cursor-pointer"
                    >
                      <p className="text-xs text-muted-foreground line-clamp-1 pl-6 font-mono">
                        {defect.description}
                      </p>
                    </div>
                  )}

                  {/* Expanded Body View */}
                  {isExpanded && (
                    <CardContent className="space-y-3.5 pt-2 pb-4 px-4 border-t bg-muted/10 animate-fade-in text-xs">
                      {/* Description */}
                      {defect.description && (
                        <div className="space-y-1">
                          <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                            Description:
                          </span>
                          <p className="text-foreground whitespace-pre-line leading-relaxed pl-1 font-mono text-xs">
                            {defect.description}
                          </p>
                        </div>
                      )}

                      {/* Root Cause Analysis & Failure Reason Callout */}
                      {rootCause && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                          <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Failure Reason & Root Cause Analysis
                          </span>
                          <p className="text-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed pl-5">
                            {rootCause}
                          </p>
                        </div>
                      )}

                      {/* Suggested Fix */}
                      {suggestedFix && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                            💡 Suggested Fix & Recommendation
                          </span>
                          <p className="text-foreground whitespace-pre-wrap text-[11px] leading-relaxed pl-5">
                            {suggestedFix}
                          </p>
                        </div>
                      )}

                      {/* Screenshots & Playwright Trace */}
                      {(screenshotUrl || traceUrl) && (
                        <div className="space-y-2 pt-2 border-t">
                          <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                            Execution Artifacts:
                          </span>
                          <div className="flex flex-wrap items-center gap-3">
                            {screenshotUrl && (
                              <a
                                href={screenshotUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative rounded-lg border overflow-hidden block hover:border-primary transition-colors"
                              >
                                <img
                                  src={screenshotUrl}
                                  alt="Defect Screenshot"
                                  className="h-24 w-40 object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold gap-1">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  View Full Screenshot
                                </div>
                              </a>
                            )}

                            {traceUrl && (
                              <a
                                href={traceUrl}
                                download="playwright-trace.zip"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-300 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 font-semibold text-xs transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Download Playwright Trace ZIP
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metadata Footer */}
                      <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t">
                        <div className="flex items-center gap-4 font-mono">
                          <span>Defect ID: <strong className="text-foreground">{defect.defect_id || defect.id}</strong></span>
                          {defect.found_by && <span>Reported By: <strong>{defect.found_by}</strong></span>}
                        </div>
                        {defect.created_at && (
                          <span>Logged: {new Date(defect.created_at || defect.createdAt).toLocaleString()}</span>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
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

import { useEffect, useState } from "react";
import { useProjects } from "@/context/ProjectsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Plus, Trash2, Edit2, Sparkles, RefreshCw } from "lucide-react";
import { CreateReleaseModal } from "@/components/modals/CreateReleaseModal";
import { EditReleaseModal } from "@/components/modals/EditReleaseModal";
import { CheckReleaseReadinessModal } from "@/components/copilot/CheckReleaseReadinessModal";
import { useCrud } from "@/hooks/use-crud";

export default function Releases() {
  const [releases, setReleases] = useState([]);
  const [filteredReleases, setFilteredReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { projects, loading: projectsLoading, refresh, selectedProjectId, setSelectedProjectId } = useProjects();
  const selectedProject = selectedProjectId && selectedProjectId !== "all" ? selectedProjectId : (projects[0]?.id || "");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<any>(null);

  const { delete: deleteRelease } = useCrud({
    baseUrl: "/api/releases",
    onSuccess: fetchReleases,
  });

  function fetchReleases() {
    if (!selectedProject) {
      setReleases([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("authToken");

    fetch(`/api/releases/${selectedProject}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setReleases(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching releases:", err);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchReleases();
  }, [selectedProject]);

  useEffect(() => {
    setFilteredReleases(releases);
  }, [releases]);

  useEffect(() => {
    const handler = (e: any) => {
      const q = (e?.detail || "").toString().toLowerCase().trim();
      if (!q) {
        setFilteredReleases(releases);
        return;
      }
      const filtered = releases.filter((r: any) => {
        const version = (r.version || "").toString().toLowerCase();
        const id = (r.release_id || "").toString().toLowerCase();
        return version.includes(q) || id.includes(q);
      });
      setFilteredReleases(filtered);
    };
    window.addEventListener("globalSearch", handler as EventListener);
    return () => window.removeEventListener("globalSearch", handler as EventListener);
  }, [releases]);

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
      console.debug("[Releases] calling refresh on mount");
      refresh();
    } catch (e) {
      // ignore
    }
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refresh();
      fetchReleases();
    } catch (e) {
      fetchReleases();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this release?")) {
      await deleteRelease(id);
    }
  };

  const handleEdit = (release: any) => {
    setSelectedRelease(release);
    setIsEditModalOpen(true);
  };

  const handleCheckReadiness = (release: any) => {
    setSelectedRelease(release);
    setIsReadinessModalOpen(true);
  };

  if (loading) return <div className="p-6">Loading releases...</div>;

  const getStatusColor = (status) => {
    switch (status) {
      case "released":
        return "default";
      case "approved":
        return "secondary";
      case "in-testing":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Releases</h1>
            <p className="text-muted-foreground">Manage release governance and approvals</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Release
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

        {filteredReleases.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                No Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No releases found for this project.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReleases.map((release) => (
              <Card key={release.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Rocket className="h-5 w-5" />
                        {release.version}
                      </CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {release.release_id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusColor(release.status)}>
                        {release.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCheckReadiness(release)}
                        title="Check release readiness"
                      >
                        <Sparkles className="h-4 w-4 text-accent" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(release)}
                      >
                        <Edit2 className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(release.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{release.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk Score</p>
                      <p className="font-semibold">{release.risk_score?.toFixed(1) || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Decision</p>
                      <p className="font-semibold">
                        {release.go_no_go_decision || "Pending"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Planned Date</p>
                      <p className="font-semibold">
                        {release.planned_release_date
                          ? new Date(release.planned_release_date).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateReleaseModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        projectId={selectedProject}
        onSuccess={fetchReleases}
      />
      <EditReleaseModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        release={selectedRelease}
        onSuccess={fetchReleases}
      />
      {selectedRelease && (
        <CheckReleaseReadinessModal
          isOpen={isReadinessModalOpen}
          onOpenChange={setIsReadinessModalOpen}
          releaseId={selectedRelease.id}
          releaseVersion={selectedRelease.version || selectedRelease.release_id}
        />
      )}
    </DashboardLayout>
  );
}

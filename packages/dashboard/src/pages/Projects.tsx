import { useEffect, useState, useRef } from "react";
import { useProjects } from "@/context/ProjectsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderKanban, Plus, Trash2, Edit2, Users, UserPlus, Mail } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { EditProjectModal } from "@/components/modals/EditProjectModal";
import { useCrud } from "@/hooks/use-crud";

export default function Projects() {
  const { projects, loading: loading, refresh } = useProjects();
  const [filteredProjects, setFilteredProjects] = useState<any[]>(projects);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ [key: number]: any[] }>({});
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [addingMemberFor, setAddingMemberFor] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const fetchedProjectsRef = useRef<Set<number>>(new Set());

  const { delete: deleteProject } = useCrud({
    baseUrl: "/api/projects",
    onSuccess: async () => {
      try { await refresh(); } catch (e) { /* ignore */ }
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject(id);
    }
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  const fetchTeamMembers = async (projectId: number) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setTeamMembers(prev => ({ ...prev, [projectId]: data }));
    } catch (err) {
      console.error("Error fetching team members:", err);
      setTeamMembers(prev => ({ ...prev, [projectId]: [] }));
    }
  };

  const handleAddTeamMember = async (projectId: number) => {
    if (!newMemberName.trim() || !newMemberRole.trim()) {
      alert("Name and role are required");
      return;
    }

    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newMemberName,
          email: newMemberEmail || null,
          role: newMemberRole,
        }),
      });

      if (res.ok) {
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberRole("");
        setAddingMemberFor(null);
        await fetchTeamMembers(projectId);
      } else {
        const errorData = await res.json();
        alert(`Failed to add team member: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error adding team member:", err);
      alert("Failed to add team member. Please try again.");
    }
  };

  const handleDeleteTeamMember = async (projectId: number, memberId: number) => {
    if (!confirm("Remove this team member?")) return;

    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/projects/${projectId}/team/${memberId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeamMembers(projectId);
      }
    } catch (err) {
      console.error("Error deleting team member:", err);
    }
  };

  const handleUpdateTeamMember = async (projectId: number, memberId: number) => {
    if (!editingMember.name.trim() || !editingMember.role.trim()) {
      alert("Name and role are required");
      return;
    }

    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/projects/${projectId}/team/${memberId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingMember.name,
          email: editingMember.email || null,
          role: editingMember.role,
        }),
      });

      if (res.ok) {
        setEditingMember(null);
        await fetchTeamMembers(projectId);
      }
    } catch (err) {
      console.error("Error updating team member:", err);
    }
  };

  const toggleProjectExpansion = (projectId: number) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      if (!teamMembers[projectId]) {
        fetchTeamMembers(projectId);
      }
    }
  };

  useEffect(() => {
    setFilteredProjects(projects);
    // Fetch team members for all projects (only once per project)
    if (projects.length > 0) {
      projects.forEach((project: any) => {
        if (project.id && !fetchedProjectsRef.current.has(project.id)) {
          fetchedProjectsRef.current.add(project.id);
          fetchTeamMembers(project.id);
        }
      });
    }
  }, [projects]);

  useEffect(() => {
    const handler = (e: any) => {
      const q = (e?.detail || "").toString().toLowerCase().trim();
      if (!q) {
        setFilteredProjects(projects);
        return;
      }
      const filtered = projects.filter((p: any) => {
        const name = (p.name || "").toString().toLowerCase();
        const desc = (p.description || "").toString().toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
      setFilteredProjects(filtered);
    };
    window.addEventListener("globalSearch", handler as EventListener);
    return () => window.removeEventListener("globalSearch", handler as EventListener);
  }, [projects]);

  if (loading) return <div className="p-6">Loading projects...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your organization's projects</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => refresh()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                No Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No projects found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project: any) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{project.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          project.status === "active" || project.status === "on-track"
                            ? "default"
                            : project.status === "at-risk"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(project)}
                      >
                        <Edit2 className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {project.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-semibold">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Release Date</p>
                      <p className="font-semibold">
                        {project.target_release_date
                          ? new Date(project.target_release_date).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{project.status}</p>
                    </div>
                  </div>

                  {/* Team Members Section */}
                  <div className="mt-4 border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProjectExpansion(project.id)}
                      className="w-full justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Team Members ({teamMembers[project.id]?.length || 0})
                    </Button>

                    {expandedProject === project.id && (
                      <div className="mt-3 space-y-3">
                        {teamMembers[project.id]?.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            {editingMember?.id === member.id ? (
                              <div className="flex-1 grid grid-cols-3 gap-2">
                                <Input
                                  placeholder="Name"
                                  value={editingMember.name}
                                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                  className="h-8"
                                />
                                <Input
                                  placeholder="Email"
                                  value={editingMember.email || ""}
                                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                                  className="h-8"
                                />
                                <Input
                                  placeholder="Role"
                                  value={editingMember.role}
                                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                                  className="h-8"
                                />
                              </div>
                            ) : (
                              <div className="flex-1">
                                <div className="font-medium">{member.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {member.role}
                                  {member.email && (
                                    <span className="ml-2 inline-flex items-center">
                                      <Mail className="h-3 w-3 mr-1" />
                                      {member.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-1">
                              {editingMember?.id === member.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateTeamMember(project.id, member.id)}
                                    className="h-7 px-2"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingMember(null)}
                                    className="h-7 px-2"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingMember(member)}
                                    className="h-7 px-2"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTeamMember(project.id, member.id)}
                                    className="h-7 px-2 text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Add New Member Form */}
                        {addingMemberFor === project.id ? (
                          <div className="p-3 bg-accent/10 rounded space-y-2">
                            <Input
                              placeholder="Name *"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              className="h-8"
                            />
                            <Input
                              placeholder="Email"
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                              className="h-8"
                            />
                            <Input
                              placeholder="Role *"
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              className="h-8"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddTeamMember(project.id)}
                                className="h-8"
                              >
                                Add Member
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddingMemberFor(null);
                                  setNewMemberName("");
                                  setNewMemberEmail("");
                                  setNewMemberRole("");
                                }}
                                className="h-8"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddingMemberFor(project.id)}
                            className="w-full"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Team Member
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={refresh}
      />
      <EditProjectModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        project={selectedProject}
        onSuccess={refresh}
      />
    </DashboardLayout>
  );
}
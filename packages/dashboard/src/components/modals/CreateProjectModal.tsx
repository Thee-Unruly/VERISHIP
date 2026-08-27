import { useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCrud } from "@/hooks/use-crud";
import { useProjects } from "@/context/ProjectsContext";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface CreateProjectModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ProjectData {
    name: string;
    description: string;
    target_release_date?: string;
}

interface TeamMember {
    name: string;
    email: string;
    role: string;
}

export function CreateProjectModal({
    isOpen,
    onOpenChange,
    onSuccess,
}: CreateProjectModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [releaseDate, setReleaseDate] = useState("");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const { refresh } = useProjects();

    const { create, loading } = useCrud({
        baseUrl: "/api/projects",
        onSuccess: async () => {
            // Success handling moved to handleSubmit after team members are added
        },
    });

    const addTeamMember = () => {
        setTeamMembers([...teamMembers, { name: "", email: "", role: "" }]);
    };

    const removeTeamMember = (index: number) => {
        setTeamMembers(teamMembers.filter((_, i) => i !== index));
    };

    const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
        const updated = [...teamMembers];
        updated[index][field] = value;
        setTeamMembers(updated);
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;

        const data: any = {
            name,
            description,
        };

        if (releaseDate) {
            data.target_release_date = new Date(releaseDate).toISOString();
            data.targetReleaseDate = new Date(releaseDate).toISOString();
        }

        const result = await create(data as any);

        // If project created successfully and we have team members, add them
        if (result && result.id && teamMembers.length > 0) {
            const validMembers = teamMembers.filter(m => m.name && m.name.trim());
            const token = localStorage.getItem("authToken");

            for (const member of validMembers) {
                try {
                    const response = await fetch(`/api/projects/${result.id}/team`, {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                            name: member.name.trim(),
                            email: member.email?.trim() || undefined,
                            role: member.role?.trim() || "Developer",
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error("Failed to add team member:", errorData);
                    }
                } catch (error) {
                    console.error("Failed to add team member:", error);
                }
            }
        }

        // Now close modal and refresh
        setName("");
        setDescription("");
        setReleaseDate("");
        setTeamMembers([]);
        onOpenChange(false);
        onSuccess();
        try { await refresh(); } catch (e) { /* ignore */ }
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Create New Project"
            description="Add a new project to the platform"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                        id="name"
                        placeholder="e.g., Project Alpha"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Brief description of the project"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        rows={3}
                    />
                </div>
                <div>
                    <Label htmlFor="releaseDate">Target Release Date</Label>
                    <Input
                        id="releaseDate"
                        type="date"
                        value={releaseDate}
                        onChange={(e) => setReleaseDate(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {/* Team Members Section */}
                <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-semibold">Team Members</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTeamMember}
                            disabled={loading}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Member
                        </Button>
                    </div>

                    {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No team members added yet. Click "Add Member" to add team members.
                        </p>
                    ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {teamMembers.map((member, index) => (
                                <div key={index} className="border rounded-lg p-3 space-y-2 relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2 h-6 w-6 p-0"
                                        onClick={() => removeTeamMember(index)}
                                        disabled={loading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2 pr-8">
                                        <div>
                                            <Label className="text-xs">Name</Label>
                                            <Input
                                                placeholder="John Doe"
                                                value={member.name}
                                                onChange={(e) => updateTeamMember(index, "name", e.target.value)}
                                                disabled={loading}
                                                className="h-8"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Role</Label>
                                            <Input
                                                placeholder="QA Lead"
                                                value={member.role}
                                                onChange={(e) => updateTeamMember(index, "role", e.target.value)}
                                                disabled={loading}
                                                className="h-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={member.email}
                                            onChange={(e) => updateTeamMember(index, "email", e.target.value)}
                                            disabled={loading}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </FormModal>
    );
}

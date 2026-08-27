import { useState, useEffect } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCrud } from "@/hooks/use-crud";

interface EditProjectModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    project: any;
    onSuccess: () => void;
}

export function EditProjectModal({
    isOpen,
    onOpenChange,
    project,
    onSuccess,
}: EditProjectModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [releaseDate, setReleaseDate] = useState("");

    useEffect(() => {
        if (project && isOpen) {
            setName(project.name || "");
            setDescription(project.description || "");
            const rDate = project.target_release_date || project.targetReleaseDate;
            setReleaseDate(rDate ? rDate.split("T")[0] : "");
        }
    }, [project, isOpen]);

    const { update, loading } = useCrud({
        baseUrl: "/api/projects",
        onSuccess: () => {
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!name.trim()) return;

        const data: any = {
            name,
            description,
        };

        if (releaseDate) {
            data.target_release_date = new Date(releaseDate).toISOString();
            data.targetReleaseDate = new Date(releaseDate).toISOString();
        } else {
            data.target_release_date = null;
            data.targetReleaseDate = null;
        }

        await update(project.id, data);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Edit Project"
            description="Update project details"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
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
            </div>
        </FormModal>
    );
}

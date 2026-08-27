import { useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCrud } from "@/hooks/use-crud";

interface CreateDefectModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string | number | "";
    onSuccess: () => void;
}

export function CreateDefectModal({
    isOpen,
    onOpenChange,
    projectId,
    onSuccess,
}: CreateDefectModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState<string>("medium");
    const [foundBy, setFoundBy] = useState("");

    const { create, loading } = useCrud({
        baseUrl: "/api/defects",
        onSuccess: () => {
            setTitle("");
            setDescription("");
            setSeverity("medium");
            setFoundBy("");
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!title.trim()) return;

        await create({
            project_id: projectId,
            title,
            description,
            severity: severity as any,
            found_by: foundBy || undefined,
        } as any);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Create New Defect"
            description="Log a new defect for this project"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                        id="title"
                        placeholder="Defect title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Detailed description of the defect"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        rows={3}
                    />
                </div>
                <div>
                    <Label htmlFor="severity">Severity *</Label>
                    <Select value={severity} onValueChange={setSeverity} disabled={loading}>
                        <SelectTrigger id="severity">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="found-by">Found By</Label>
                    <Input
                        id="found-by"
                        placeholder="Tester name"
                        value={foundBy}
                        onChange={(e) => setFoundBy(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
        </FormModal>
    );
}

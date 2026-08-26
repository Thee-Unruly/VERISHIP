import { useState, useEffect } from "react";
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

interface EditRequirementModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    requirement: any;
    onSuccess: () => void;
}

export function EditRequirementModal({
    isOpen,
    onOpenChange,
    requirement,
    onSuccess,
}: EditRequirementModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<string>("draft");
    const [priority, setPriority] = useState("1");

    useEffect(() => {
        if (requirement && isOpen) {
            setTitle(requirement.title || "");
            setDescription(requirement.description || "");
            setStatus(requirement.status || "draft");
            setPriority(String(requirement.priority || 1));
        }
    }, [requirement, isOpen]);

    const { update, loading } = useCrud({
        baseUrl: "/api/requirements",
        onSuccess: () => {
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!title.trim()) return;

        await update(requirement.id, {
            title,
            description,
            status,
            priority: parseInt(priority),
        } as any);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Edit Requirement"
            description="Update requirement details and status"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
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
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus} disabled={loading}>
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="review">In Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority} disabled={loading}>
                        <SelectTrigger id="priority">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Critical</SelectItem>
                            <SelectItem value="2">High</SelectItem>
                            <SelectItem value="3">Medium</SelectItem>
                            <SelectItem value="4">Low</SelectItem>
                            <SelectItem value="5">Lowest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </FormModal>
    );
}

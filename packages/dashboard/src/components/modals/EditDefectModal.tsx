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

interface EditDefectModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defect: any;
    onSuccess: () => void;
}

export function EditDefectModal({
    isOpen,
    onOpenChange,
    defect,
    onSuccess,
}: EditDefectModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState<string>("medium");
    const [status, setStatus] = useState<string>("open");
    const [foundBy, setFoundBy] = useState("");

    useEffect(() => {
        if (defect && isOpen) {
            setTitle(defect.title || "");
            setDescription(defect.description || "");
            setSeverity(defect.severity || "medium");
            setStatus(defect.status || "open");
            setFoundBy(defect.found_by || "");
        }
    }, [defect, isOpen]);

    const { update, loading } = useCrud({
        baseUrl: "/api/defects",
        onSuccess: () => {
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!title.trim()) return;

        await update(defect.id, {
            title,
            description,
            severity,
            status,
            found_by: foundBy || undefined,
        } as any);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Edit Defect"
            description="Update defect details and status"
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
                    <Label htmlFor="severity">Severity</Label>
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
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus} disabled={loading}>
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="found-by">Found By</Label>
                    <Input
                        id="found-by"
                        value={foundBy}
                        onChange={(e) => setFoundBy(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
        </FormModal>
    );
}

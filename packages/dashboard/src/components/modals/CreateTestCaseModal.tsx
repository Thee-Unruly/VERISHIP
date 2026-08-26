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

interface CreateTestCaseModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number | "";
    onSuccess: () => void;
}

export function CreateTestCaseModal({
    isOpen,
    onOpenChange,
    projectId,
    onSuccess,
}: CreateTestCaseModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [testType, setTestType] = useState("manual");
    const [priority, setPriority] = useState("1");

    const [requirementId, setRequirementId] = useState<string>("none");
    const [requirements, setRequirements] = useState<any[]>([]);

    useEffect(() => {
        if (!projectId) return;
        const fetchReqs = async () => {
            try {
                const res = await fetch(`/api/requirements/${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRequirements(data);
                }
            } catch (err) {
                console.error("Failed to fetch requirements", err);
            }
        };
        fetchReqs();
    }, [projectId, isOpen]);

    const { create, loading } = useCrud({
        baseUrl: "/api/test-cases",
        onSuccess: () => {
            setTitle("");
            setDescription("");
            setTestType("manual");
            setPriority("1");
            setRequirementId("none");
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!title.trim()) return;

        const reqId = requirementId === "none" ? null : parseInt(requirementId);

        await create({
            project_id: projectId,
            title,
            description,
            test_type: testType,
            priority: parseInt(priority),
            requirement_id: reqId,
        } as any);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Create New Test Case"
            description="Add a new test case to this project"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                        id="title"
                        placeholder="Test case title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Steps and expected results"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        rows={3}
                    />
                </div>
                <div>
                    <Label htmlFor="requirement">Link to Requirement</Label>
                    <Select value={requirementId} onValueChange={setRequirementId} disabled={loading}>
                        <SelectTrigger id="requirement">
                            <SelectValue placeholder="Select a requirement (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- No Requirement --</SelectItem>
                            {requirements.map((req: any) => (
                                <SelectItem key={req.id} value={req.id.toString()}>
                                    {req.requirement_id || req.title}: {req.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="test-type">Test Type *</Label>
                    <Select value={testType} onValueChange={setTestType} disabled={loading}>
                        <SelectTrigger id="test-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automated">Automated</SelectItem>
                            <SelectItem value="smoke">Smoke</SelectItem>
                            <SelectItem value="regression">Regression</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
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

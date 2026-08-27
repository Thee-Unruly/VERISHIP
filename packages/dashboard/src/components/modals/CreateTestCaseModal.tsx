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
    projectId: string | number | "";
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
            className="max-w-3xl"
            submitText="Create Test Case"
            loadingText="Creating Test Case..."
        >
            <div className="space-y-4">
                {/* Title */}
                <div>
                    <Label htmlFor="create-title" className="text-sm font-semibold">Title *</Label>
                    <Input
                        id="create-title"
                        placeholder="Test case title (e.g. Verify checkout with discount code)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={loading}
                        className="mt-1"
                    />
                </div>

                {/* Horizontal Grid for Meta Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="create-requirement" className="text-sm font-semibold">Link to Requirement</Label>
                        <Select value={requirementId} onValueChange={setRequirementId} disabled={loading}>
                            <SelectTrigger id="create-requirement" className="mt-1">
                                <SelectValue placeholder="Select a requirement" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- No Requirement --</SelectItem>
                                {requirements.map((req: any) => (
                                    <SelectItem key={req.id} value={req.id.toString()}>
                                        {req.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="create-test-type" className="text-sm font-semibold">Test Type *</Label>
                        <Select value={testType} onValueChange={setTestType} disabled={loading}>
                            <SelectTrigger id="create-test-type" className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="automated">Automated</SelectItem>
                                <SelectItem value="autonomous-agent">Autonomous Agent</SelectItem>
                                <SelectItem value="smoke">Smoke</SelectItem>
                                <SelectItem value="regression">Regression</SelectItem>
                                <SelectItem value="performance">Performance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="create-priority" className="text-sm font-semibold">Priority</Label>
                        <Select value={priority} onValueChange={setPriority} disabled={loading}>
                            <SelectTrigger id="create-priority" className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Critical (P1)</SelectItem>
                                <SelectItem value="2">High (P2)</SelectItem>
                                <SelectItem value="3">Medium (P3)</SelectItem>
                                <SelectItem value="4">Low (P4)</SelectItem>
                                <SelectItem value="5">Lowest (P5)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <Label htmlFor="create-description" className="text-sm font-semibold">Description & Test Steps</Label>
                    <Textarea
                        id="create-description"
                        placeholder="Step 1: Navigate to page...&#10;Step 2: Enter valid inputs...&#10;Expected: Success message appears."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        rows={6}
                        className="mt-1 font-mono text-sm leading-relaxed"
                    />
                </div>
            </div>
        </FormModal>
    );
}

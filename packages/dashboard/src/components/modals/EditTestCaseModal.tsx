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

interface EditTestCaseModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    testCase: any;
    onSuccess: () => void;
}

export function EditTestCaseModal({
    isOpen,
    onOpenChange,
    testCase,
    onSuccess,
}: EditTestCaseModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [testType, setTestType] = useState("manual");
    const [priority, setPriority] = useState("1");
    const [isAutomated, setIsAutomated] = useState(false);

    useEffect(() => {
        if (testCase && isOpen) {
            setTitle(testCase.title || "");
            setDescription(testCase.description || "");
            setTestType(testCase.test_type || "manual");
            setPriority(String(testCase.priority || 1));
            setIsAutomated(testCase.is_automated || false);
        }
    }, [testCase, isOpen]);

    const { update, loading } = useCrud({
        baseUrl: "/api/test-cases",
        onSuccess: () => {
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!title.trim()) return;

        await update(testCase.id, {
            title,
            description,
            test_type: testType,
            priority: parseInt(priority),
            is_automated: isAutomated,
        } as any);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Edit Test Case"
            description="Update test case details"
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
                    <Label htmlFor="test-type">Test Type</Label>
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
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is-automated"
                        checked={isAutomated}
                        onChange={(e) => setIsAutomated(e.target.checked)}
                        disabled={loading}
                    />
                    <Label htmlFor="is-automated">Automated</Label>
                </div>
            </div>
        </FormModal>
    );
}

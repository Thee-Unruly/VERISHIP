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
    const [status, setStatus] = useState("ongoing");
    const [targetUrl, setTargetUrl] = useState("");
    const [isAutomated, setIsAutomated] = useState(false);

    useEffect(() => {
        if (testCase && isOpen) {
            setTitle(testCase.title || "");
            setDescription(testCase.description || "");
            const currentType = testCase.test_type || testCase.testType || "manual";
            setTestType(currentType);
            setPriority(String(testCase.priority || 1));
            setStatus(testCase.status || "ongoing");
            setTargetUrl(testCase.target_url || testCase.targetUrl || "");
            setIsAutomated(
                testCase.is_automated || 
                currentType === "automated" || 
                currentType === "autonomous-agent"
            );
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
            status,
            target_url: targetUrl || null,
            is_automated: isAutomated,
        } as any);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Edit Test Case"
            description="Update test case details and execution settings"
            onSubmit={handleSubmit}
            isLoading={loading}
            className="max-w-3xl"
            submitText="Save Changes"
            loadingText="Saving Changes..."
        >
            <div className="space-y-4">
                {/* Title */}
                <div>
                    <Label htmlFor="edit-title" className="text-sm font-semibold">Title *</Label>
                    <Input
                        id="edit-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Test case title"
                        disabled={loading}
                        className="mt-1"
                    />
                </div>

                {/* Horizontal Grid for Meta Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="edit-test-type" className="text-sm font-semibold">Test Type</Label>
                        <Select value={testType} onValueChange={setTestType} disabled={loading}>
                            <SelectTrigger id="edit-test-type" className="mt-1">
                                <SelectValue placeholder="Select type" />
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
                        <Label htmlFor="edit-priority" className="text-sm font-semibold">Priority</Label>
                        <Select value={priority} onValueChange={setPriority} disabled={loading}>
                            <SelectTrigger id="edit-priority" className="mt-1">
                                <SelectValue placeholder="Select priority" />
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

                    <div>
                        <Label htmlFor="edit-status" className="text-sm font-semibold">Execution Status</Label>
                        <Select value={status} onValueChange={setStatus} disabled={loading}>
                            <SelectTrigger id="edit-status" className="mt-1">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                                <SelectItem value="retest">Retest</SelectItem>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <Label htmlFor="edit-description" className="text-sm font-semibold">Description & Test Steps</Label>
                    <Textarea
                        id="edit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        rows={6}
                        placeholder="Detailed test steps, prerequisites, and expected results..."
                        className="mt-1 font-mono text-sm leading-relaxed"
                    />
                </div>

                {/* Target URL (Optional) */}
                <div>
                    <Label htmlFor="edit-target-url" className="text-sm font-semibold">Target Application URL (Optional)</Label>
                    <Input
                        id="edit-target-url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://yourapp.example.com/checkout"
                        disabled={loading}
                        className="mt-1"
                    />
                </div>

                {/* Automation Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="edit-is-automated"
                        checked={isAutomated}
                        onChange={(e) => setIsAutomated(e.target.checked)}
                        disabled={loading}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="edit-is-automated" className="text-sm font-medium cursor-pointer">
                        Enable autonomous AI / automated test execution
                    </Label>
                </div>
            </div>
        </FormModal>
    );
}

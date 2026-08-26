import { useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCrud } from "@/hooks/use-crud";
import { AlertCircle } from "lucide-react";

interface CreateReleaseModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number | "";
    onSuccess: () => void;
}

export function CreateReleaseModal({
    isOpen,
    onOpenChange,
    projectId,
    onSuccess,
}: CreateReleaseModalProps) {
    const [version, setVersion] = useState("");
    const [releaseDate, setReleaseDate] = useState("");

    const { create, loading } = useCrud({
        baseUrl: "/api/releases",
        onSuccess: () => {
            setVersion("");
            setReleaseDate("");
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!version.trim()) return;

        const data: any = {
            project_id: projectId,
            version,
        };

        if (releaseDate) {
            data.planned_release_date = new Date(releaseDate).toISOString();
        }

        await create(data);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Create New Release"
            description="Plan a new release for this project"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Release Requirements:</strong>
                        <ul className="mt-2 ml-4 list-disc text-sm">
                            <li>At least 80% of test cases must be completed</li>
                            <li>A Project Manager or QA must be assigned to the project</li>
                            <li>Only Project Managers and QA can approve releases</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                <div>
                    <Label htmlFor="version">Version *</Label>
                    <Input
                        id="version"
                        placeholder="e.g., v2.4.0"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Label htmlFor="release-date">Planned Release Date</Label>
                    <Input
                        id="release-date"
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

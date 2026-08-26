import { useState, useEffect } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCrud } from "@/hooks/use-crud";

interface EditReleaseModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    release: any;
    onSuccess: () => void;
}

export function EditReleaseModal({
    isOpen,
    onOpenChange,
    release,
    onSuccess,
}: EditReleaseModalProps) {
    const [version, setVersion] = useState("");
    const [status, setStatus] = useState<string>("in-testing");
    const [releaseDate, setReleaseDate] = useState("");
    const [goNoGo, setGoNoGo] = useState<string>("");

    useEffect(() => {
        if (release && isOpen) {
            setVersion(release.version || "");
            setStatus(release.status || "in-testing");
            setReleaseDate(release.planned_release_date?.split("T")[0] || "");
            setGoNoGo(release.go_no_go_decision || "");
        }
    }, [release, isOpen]);

    const { update, loading } = useCrud({
        baseUrl: "/api/releases",
        onSuccess: () => {
            onOpenChange(false);
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        if (!version.trim()) return;

        const data: any = {
            version,
            status,
        };

        if (releaseDate) {
            data.planned_release_date = new Date(releaseDate).toISOString();
        }

        if (goNoGo) {
            data.go_no_go_decision = goNoGo;
        }

        await update(release.id, data);
    };

    return (
        <FormModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="Edit Release"
            description="Update release details and status"
            onSubmit={handleSubmit}
            isLoading={loading}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="version">Version *</Label>
                    <Input
                        id="version"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus} disabled={loading}>
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="in-testing">In Testing</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="released">Released</SelectItem>
                        </SelectContent>
                    </Select>
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
                <div>
                    <Label htmlFor="go-no-go">Go/No-Go Decision</Label>
                    <Select value={goNoGo} onValueChange={setGoNoGo} disabled={loading}>
                        <SelectTrigger id="go-no-go">
                            <SelectValue placeholder="Select decision" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GO">GO</SelectItem>
                            <SelectItem value="NO-GO">NO-GO</SelectItem>
                            <SelectItem value="CONDITIONAL-GO">CONDITIONAL-GO</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </FormModal>
    );
}

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    onSubmit?: () => void;
    isLoading?: boolean;
    className?: string;
    submitText?: string;
    loadingText?: string;
}

export function FormModal({
    isOpen,
    onOpenChange,
    title,
    description,
    children,
    onSubmit,
    isLoading = false,
    className,
    submitText,
    loadingText,
}: FormModalProps) {
    const isEdit = title.toLowerCase().includes("edit") || title.toLowerCase().includes("update");
    const defaultSubmit = submitText || (isEdit ? "Save Changes" : "Create");
    const defaultLoading = loadingText || (isEdit ? "Saving..." : "Creating...");

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto", className)}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="space-y-4 pt-1">
                    {children}
                    {onSubmit && (
                        <div className="flex gap-2 justify-end pt-4 border-t mt-4">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={onSubmit} disabled={isLoading}>
                                {isLoading ? defaultLoading : defaultSubmit}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    onSubmit?: () => void;
    isLoading?: boolean;
}

export function FormModal({
    isOpen,
    onOpenChange,
    title,
    description,
    children,
    onSubmit,
    isLoading = false,
}: FormModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="space-y-4">
                    {children}
                    {onSubmit && (
                        <div className="flex gap-2 justify-end pt-4">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={onSubmit} disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

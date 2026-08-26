import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LucideIcon } from "lucide-react";

interface ToggleOptionProps {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    icon?: LucideIcon;
}

export function ToggleOption({ id, label, description, checked, onCheckedChange, icon: Icon }: ToggleOptionProps) {
    return (
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="p-1.5 rounded-lg bg-background border border-border/50">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                )}
                <div>
                    <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
                        {label}
                    </Label>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                className="data-[state=checked]:bg-accent"
            />
        </div>
    );
}

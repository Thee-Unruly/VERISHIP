import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    children?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="relative">
                {/* Decorative rings */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-xl scale-150" />
                <div className="relative rounded-2xl bg-gradient-to-br from-muted to-muted/50 p-5 border border-border/50">
                    <Icon className="h-10 w-10 text-muted-foreground" />
                </div>
            </div>
            <div className="mt-6 space-y-2">
                <p className="font-semibold text-lg text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {description}
                </p>
            </div>
            {children && <div className="mt-6">{children}</div>}
        </div>
    );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ConfigCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    children: React.ReactNode;
    className?: string;
}

export function ConfigCard({ icon: Icon, title, description, children, className = "" }: ConfigCardProps) {
    return (
        <Card className={`relative overflow-hidden rounded-2xl border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
            {/* Subtle gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/50 via-accent/30 to-transparent" />
            
            <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/10">
                        <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                            {title}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                            {description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {children}
            </CardContent>
        </Card>
    );
}

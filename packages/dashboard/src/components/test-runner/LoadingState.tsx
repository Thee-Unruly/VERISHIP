import { Loader2, LucideIcon } from "lucide-react";

interface LoadingStateProps {
    icon?: LucideIcon;
    message: string;
    subMessage?: string;
}

export function LoadingState({ icon: Icon, message, subMessage }: LoadingStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-5">
            <div className="relative">
                {/* Animated rings */}
                <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 rounded-full border-2 border-accent/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                
                <div className="relative p-4 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    {Icon && (
                        <Icon className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" />
                    )}
                </div>
            </div>
            <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">{message}</p>
                {subMessage && (
                    <p className="text-xs text-muted-foreground">{subMessage}</p>
                )}
            </div>
        </div>
    );
}

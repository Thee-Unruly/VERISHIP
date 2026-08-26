import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

interface StepResultProps {
    stepNumber: number;
    description: string;
    status: "passed" | "failed" | "skipped" | string;
    durationMs: number;
    details?: string;
    error?: string;
    actionType?: string;
    selector?: string;
}

export function StepResult({ 
    stepNumber, 
    description, 
    status, 
    durationMs, 
    details, 
    error,
    actionType,
    selector 
}: StepResultProps) {
    const statusConfig = {
        passed: {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            bg: "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10",
            dot: "bg-emerald-500"
        },
        failed: {
            icon: <XCircle className="h-4 w-4 text-rose-500" />,
            bg: "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10",
            dot: "bg-rose-500"
        },
        skipped: {
            icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
            bg: "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10",
            dot: "bg-amber-500"
        }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
        icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        bg: "bg-muted/50 border-border hover:bg-muted",
        dot: "bg-muted-foreground"
    };

    return (
        <div className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${config.bg}`}>
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    status === 'passed' ? 'bg-emerald-500/20 text-emerald-600' :
                    status === 'failed' ? 'bg-rose-500/20 text-rose-600' :
                    'bg-muted text-muted-foreground'
                }`}>
                    {stepNumber}
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm text-foreground">
                        {actionType ? `${actionType}: ` : ''}{description}
                    </div>
                    {config.icon}
                </div>
                
                {selector && (
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono block truncate">
                        {selector}
                    </code>
                )}
                
                {details && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{details}</p>
                )}
                
                {error && (
                    <div className="text-xs text-rose-500 bg-rose-500/10 rounded-lg px-3 py-2 mt-2 font-mono">
                        {error}
                    </div>
                )}
            </div>

            {/* Duration */}
            <div className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
                {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
            </div>
        </div>
    );
}

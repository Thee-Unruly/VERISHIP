import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScenarioCardProps {
    index: number;
    title: string;
    result?: {
        passed: number;
        failed: number;
    };
    isRunning?: boolean;
}

export function ScenarioCard({ index, title, result, isRunning }: ScenarioCardProps) {
    const isPassed = result && result.passed > 0;
    const isFailed = result && result.failed > 0;
    const isPending = !result && !isRunning;

    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            isPassed ? 'bg-emerald-500/5 border-emerald-500/20' :
            isFailed ? 'bg-rose-500/5 border-rose-500/20' :
            isRunning ? 'bg-accent/5 border-accent/20' :
            'bg-muted/30 border-border/50'
        }`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                    isPassed ? 'bg-emerald-500/20 text-emerald-600' :
                    isFailed ? 'bg-rose-500/20 text-rose-600' :
                    isRunning ? 'bg-accent/20 text-accent' :
                    'bg-muted text-muted-foreground'
                }`}>
                    {index + 1}
                </div>
                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {title}
                </span>
            </div>
            
            {isRunning && (
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                </Badge>
            )}
            
            {isPassed && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Passed
                </Badge>
            )}
            
            {isFailed && (
                <Badge variant="destructive" className="gap-1.5">
                    <XCircle className="h-3 w-3" />
                    Failed
                </Badge>
            )}
            
            {isPending && (
                <Badge variant="outline" className="text-muted-foreground gap-1.5">
                    <Clock className="h-3 w-3" />
                    Pending
                </Badge>
            )}
        </div>
    );
}

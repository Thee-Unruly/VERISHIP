import { CheckCircle2, XCircle, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ResultsSummaryProps {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
}

export function ResultsSummary({ total, passed, failed, skipped, durationMs }: ResultsSummaryProps) {
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    value={total}
                    label="Total Tests"
                    colorClass="bg-muted"
                    icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard
                    value={passed}
                    label="Passed"
                    colorClass="bg-emerald-500/10"
                    textColorClass="text-emerald-600 dark:text-emerald-400"
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                />
                <StatCard
                    value={failed}
                    label="Failed"
                    colorClass="bg-rose-500/10"
                    textColorClass="text-rose-600 dark:text-rose-400"
                    icon={<XCircle className="h-4 w-4 text-rose-500" />}
                />
                <StatCard
                    value={skipped}
                    label="Skipped"
                    colorClass="bg-amber-500/10"
                    textColorClass="text-amber-600 dark:text-amber-400"
                    icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                />
            </div>

            {/* Success Rate */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Success Rate</span>
                    <span className={`text-lg font-bold ${
                        successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                        successRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                        'text-rose-600 dark:text-rose-400'
                    }`}>
                        {successRate}%
                    </span>
                </div>
                <Progress 
                    value={successRate} 
                    className="h-2.5 bg-muted" 
                />
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Completed in <span className="font-medium text-foreground">{formatDuration(durationMs)}</span></span>
            </div>
        </div>
    );
}

interface StatCardProps {
    value: number;
    label: string;
    colorClass: string;
    textColorClass?: string;
    icon: React.ReactNode;
}

function StatCard({ value, label, colorClass, textColorClass = "text-foreground", icon }: StatCardProps) {
    return (
        <div className={`p-4 rounded-xl ${colorClass} border border-border/30 transition-transform hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-2">
                {icon}
            </div>
            <div className={`text-2xl font-bold ${textColorClass}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    );
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

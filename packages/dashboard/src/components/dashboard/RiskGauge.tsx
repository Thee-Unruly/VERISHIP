import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function RiskGauge({ score, label, size = "md" }: RiskGaugeProps) {
  const getRiskLevel = (score: number) => {
    if (score <= 30) return { level: "Low", color: "text-success", bg: "bg-success" };
    if (score <= 60) return { level: "Medium", color: "text-warning", bg: "bg-warning" };
    if (score <= 80) return { level: "High", color: "text-destructive", bg: "bg-destructive" };
    return { level: "Critical", color: "text-risk-critical", bg: "bg-risk-critical" };
  };

  const risk = getRiskLevel(score);
  
  const sizeClasses = {
    sm: { container: "h-24 w-24", text: "text-xl", label: "text-xs" },
    md: { container: "h-36 w-36", text: "text-3xl", label: "text-sm" },
    lg: { container: "h-48 w-48", text: "text-4xl", label: "text-base" },
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", sizeClasses[size].container)}>
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(risk.color, "transition-all duration-1000 ease-out")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(sizeClasses[size].text, "font-bold", risk.color)}>
            {score}
          </span>
          <span className={cn(sizeClasses[size].label, "text-muted-foreground")}>
            {risk.level}
          </span>
        </div>
      </div>
      <span className={cn(sizeClasses[size].label, "font-medium text-foreground")}>
        {label}
      </span>
    </div>
  );
}

import { Monitor, Globe, Sparkles, Zap } from "lucide-react";

export function TestRunnerHeader() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 p-8">
            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
            
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
                            <Zap className="h-6 w-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Test Runner
                        </h1>
                    </div>
                    <p className="text-muted-foreground max-w-lg leading-relaxed">
                        Execute your test suites with confidence. Choose between API testing with Trial Runner 
                        or browser automation with Playwright.
                    </p>
                </div>
                
                {/* Quick stats or hints */}
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">API Tests</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">E2E Tests</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

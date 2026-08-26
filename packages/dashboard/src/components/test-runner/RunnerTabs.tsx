import { Monitor, Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RunnerTabsProps {
    activeTab: string;
    onTabChange: (value: string) => void;
}

export function RunnerTabs({ activeTab, onTabChange }: RunnerTabsProps) {
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="inline-flex h-12 items-center rounded-xl bg-muted/50 p-1.5 text-muted-foreground border border-border/50">
                <TabsTrigger 
                    value="trial" 
                    className="inline-flex items-center justify-center gap-2.5 rounded-lg px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                    <Globe className="h-4 w-4" />
                    <span>Trial Runner</span>
                </TabsTrigger>
                <TabsTrigger 
                    value="playwright" 
                    className="inline-flex items-center justify-center gap-2.5 rounded-lg px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                    <Monitor className="h-4 w-4" />
                    <span>Playwright</span>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

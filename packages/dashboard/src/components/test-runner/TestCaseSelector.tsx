import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FolderKanban, FileText, TestTube } from "lucide-react";

interface TestCaseSelectorProps {
    projects: any[];
    requirements: any[];
    testCases: any[];
    selectedProjectId: string;
    selectedRequirementId: string;
    selectedTestCaseId: string;
    onProjectChange: (value: string) => void;
    onRequirementChange: (value: string) => void;
    onTestCaseChange: (value: string) => void;
    compact?: boolean;
}

export function TestCaseSelector({
    projects,
    requirements,
    testCases,
    selectedProjectId,
    selectedRequirementId,
    selectedTestCaseId,
    onProjectChange,
    onRequirementChange,
    onTestCaseChange,
    compact = false
}: TestCaseSelectorProps) {
    const containerClass = compact ? "space-y-3" : "space-y-4";
    
    return (
        <div className={containerClass}>
            <SelectField
                icon={FolderKanban}
                label={compact ? "Project" : "1. Select Project"}
                placeholder="Choose a project..."
                value={selectedProjectId}
                onChange={onProjectChange}
                options={projects.map((p) => ({ value: p.id.toString(), label: p.name }))}
                disabled={false}
            />
            
            <SelectField
                icon={FileText}
                label={compact ? "Requirement" : "2. Select Requirement"}
                placeholder="Choose a requirement..."
                value={selectedRequirementId}
                onChange={onRequirementChange}
                options={requirements.map((r) => ({ value: r.id.toString(), label: r.title }))}
                disabled={!selectedProjectId}
            />
            
            <SelectField
                icon={TestTube}
                label={compact ? "Test Case" : "3. Select Test Case"}
                placeholder="Choose a test case..."
                value={selectedTestCaseId}
                onChange={onTestCaseChange}
                options={testCases.map((tc) => ({ value: tc.id.toString(), label: tc.title }))}
                disabled={!selectedRequirementId}
            />
        </div>
    );
}

interface SelectFieldProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    disabled: boolean;
}

function SelectField({ icon: Icon, label, placeholder, value, onChange, options, disabled }: SelectFieldProps) {
    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {label}
            </Label>
            <Select value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className={`h-10 rounded-lg border-border/50 bg-background transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50 focus:border-accent'
                }`}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 shadow-lg rounded-xl">
                    {options.map((option) => (
                        <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="rounded-lg cursor-pointer focus:bg-accent/10"
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

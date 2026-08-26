import { useState } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GeneratedTestStep {
    step_number: number;
    action: string;
    selector: string | null;
    expected_result: string;
    description: string;
}

interface AITestGeneratorProps {
    onStepsGenerated: (steps: GeneratedTestStep[]) => void;
    testDescription: string;
}

export function AITestGenerator({ onStepsGenerated, testDescription }: AITestGeneratorProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [customPrompt, setCustomPrompt] = useState("");
    const [generatedSteps, setGeneratedSteps] = useState<GeneratedTestStep[]>([]);

    const generateTestSteps = async () => {
        if (!testDescription && !customPrompt) {
            toast({
                title: "Missing input",
                description: "Please provide a test description or custom prompt",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch("/api/ai/generate-test-steps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    test_description: testDescription || customPrompt,
                    context: "VeriShip Quality Governance Platform - Web App Testing",
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate test steps");
            }

            const data = await response.json();
            setGeneratedSteps(data.steps);
            onStepsGenerated(data.steps);

            toast({
                title: "Success!",
                description: `Generated ${data.steps.length} test steps`,
            });
        } catch (error: any) {
            toast({
                title: "Generation failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const regenerate = async () => {
        await generateTestSteps();
    };

    return (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    AI Test Generator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Prompt (Optional)</label>
                    <Textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g., 'Test user can login, navigate to dashboard, and create a new project'"
                        className="min-h-20"
                    />
                </div>

                {/* Generate Button */}
                <Button
                    onClick={generateTestSteps}
                    disabled={isGenerating || (!testDescription && !customPrompt)}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Test Steps with AI
                        </>
                    )}
                </Button>

                {/* Generated Steps Preview */}
                {generatedSteps.length > 0 && (
                    <div className="space-y-3 mt-6 p-4 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Generated Steps ({generatedSteps.length})</h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={regenerate}
                                disabled={isGenerating}
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Regenerate
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {generatedSteps.map((step, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                                    <div className="font-medium text-gray-900">
                                        Step {step.step_number}: {step.action}
                                    </div>
                                    <div className="text-gray-600 mt-1">{step.description}</div>
                                    {step.selector && (
                                        <div className="text-xs font-mono text-gray-500 mt-1 truncate">
                                            Selector: {step.selector}
                                        </div>
                                    )}
                                    {step.expected_result && (
                                        <div className="text-xs text-gray-600 mt-1">
                                            Expected: {step.expected_result}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

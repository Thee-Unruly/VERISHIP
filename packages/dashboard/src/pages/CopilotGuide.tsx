import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CopilotGuide() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Quality Copilot Guide</h1>
                        <p className="text-muted-foreground mt-2">
                            Where to find AI features and how to use them in the platform.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Requirement Analysis</CardTitle>
                            <CardDescription>How to analyze requirement clarity and testability</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Open the <strong>Requirements</strong> page and click the sparkles icon on any
                                requirement to run a clarity and testability analysis. The Copilot produces a
                                clarity score, lists ambiguous terms, and suggests missing acceptance criteria.
                            </p>
                            <Button asChild>
                                <a href="/requirements">Open Requirements</a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Test Cases</CardTitle>
                            <CardDescription>Create suggested test cases from a requirement</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                From the <strong>Requirements</strong> page click the test-tube icon to generate
                                suggested test cases (positive, negative, edge cases). Review and save any
                                suggestions you want to add to the project.
                            </p>
                            <Button asChild>
                                <a href="/requirements">Generate Tests</a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Release Readiness</CardTitle>
                            <CardDescription>Assess go/no-go and blocking issues</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Visit the <strong>Releases</strong> page and click the readiness icon on a
                                release to produce a risk score, go/no-go recommendation, and list of blockers.
                            </p>
                            <Button asChild>
                                <a href="/releases">Open Releases</a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Notes & API Keys</CardTitle>
                            <CardDescription>Where to set keys and configuration</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                The backend reads AI provider keys from environment variables or a
                                <code>.env</code> file under <code>backend/</code>. Configure
                                <strong>OPENROUTER_CLARITY_API_KEY</strong> and
                                <strong>OPENROUTER_TESTCASE_API_KEY</strong> to enable calls to the Copilot.
                            </p>
                            <Button asChild>
                                <a href="/settings">Open Settings</a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Tips</CardTitle>
                            <CardDescription>Best practices when using AI features</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                                <li>Review AI-generated test cases before saving to ensure accuracy.</li>
                                <li>Provide clear requirement descriptions for better AI suggestions.</li>
                                <li>Rotate and secure API keys; do not commit secrets to source control.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

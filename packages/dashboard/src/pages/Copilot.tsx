import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, History, Zap, Brain, Bot, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Same URL used by ChatBot
const N8N_WEBHOOK_URL = "https://heavily-busy-titmouse.ngrok-free.app/webhook/veriship-agent";

function generateSessionId() {
    return "copilot-" + Math.random().toString(36).substring(2, 12);
}

function getCopilotSessionId() {
    if (typeof window === "undefined") return "default-session";
    let id = sessionStorage.getItem("copilot_session_id");
    if (!id) {
        id = generateSessionId();
        sessionStorage.setItem("copilot_session_id", id);
    }
    return id;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export default function Copilot() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "👋 Hello! I'm Amira, your autonomous Quality Agent.\n\nI have full access to VeriShip's backend via my tools. I can:\n- Search and manage projects, requirements, defects, and test cases.\n- Check release readiness.\n- Fetch your quality metrics.\n\nTell me what you'd like me to do!",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(getCopilotSessionId);
    const { toast } = useToast();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSendMessage = async () => {
        if (!input.trim() || loading) return;

        const text = input.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(N8N_WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify({
                    message: text,
                    sessionId,
                    token: localStorage.getItem("authToken") || "",
                }),
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            const rawText = await res.text();
            let data: unknown;
            try {
                data = JSON.parse(rawText);
            } catch {
                data = rawText;
            }

            const replyText =
                (data as Record<string, string>)?.output ||
                (data as Record<string, string>)?.response ||
                (data as Record<string, string>)?.text ||
                (Array.isArray(data) && (data[0]?.output || data[0]?.response || data[0]?.text)) ||
                (typeof data === "string" && data) ||
                `Unknown response format. Raw: ${String(data).substring(0, 100)}...`;

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: replyText,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to connect to the agent",
                variant: "destructive",
            });
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "⚠️ I encountered a connection error connecting to the agent. Please check your network or try again later.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Bot className="h-8 w-8 text-accent" />
                            Agentic Copilot
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            A fully autonomous agent for VeriShip Quality Governance
                        </p>
                    </div>
                    <Badge className="bg-accent text-accent-foreground">Active</Badge>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Features */}
                    <div className="lg:col-span-1 space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Terminal className="h-5 w-5 text-accent" />
                                    Try asking:
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto py-2 whitespace-normal"
                                    onClick={() => setInput("Can you list all active projects for me?")}
                                >
                                    List all active projects
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto py-2 whitespace-normal"
                                    onClick={() => setInput("What is the readiness score for project 1?")}
                                >
                                    Check readiness of Project 1
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto py-2 whitespace-normal"
                                    onClick={() => setInput("Show me the high priority defects.")}
                                >
                                    Show high priority defects
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-yellow-500" />
                                    Agentic Access
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    This copilot is connected directly to VeriShip's backend using the MCP protocol.
                                    It can browse, create, edit, and orchestrate across your entire CI/CD and QA pipeline.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chat */}
                    <div className="lg:col-span-2">
                        <Card className="flex flex-col h-[600px] shadow-md border-primary/20">
                            <CardHeader className="border-b bg-muted/50 rounded-t-xl">
                                <CardTitle className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3 mr-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    Chat with Amira
                                </CardTitle>
                                <CardDescription>
                                    Your session ID: <code className="text-xs bg-muted px-1 rounded">{sessionId}</code>
                                </CardDescription>
                            </CardHeader>

                            {/* Messages */}
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 bg-background">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-5 py-3 rounded-2xl ${message.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
                                                : "bg-muted text-foreground border border-border rounded-bl-sm shadow-sm"
                                                }`}
                                        >
                                            <div className={`prose prose-sm max-w-none ${message.role === "user" ? "prose-invert text-white" : "dark:prose-invert"}`}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                            <p
                                                className={`text-[10px] mt-2 ${message.role === "user"
                                                    ? "text-primary-foreground/70 text-right"
                                                    : "text-muted-foreground"
                                                    }`}
                                            >
                                                {message.timestamp.toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted text-muted-foreground border border-border px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                                            <div className="flex gap-1.5 items-center h-5">
                                                <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                                                <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </CardContent>

                            {/* Input */}
                            <div className="border-t p-4 space-y-3 bg-card rounded-b-xl">
                                <Textarea
                                    placeholder="Ask the agent to check requirements, list defects, or execute a test..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    className="resize-none focus-visible:ring-1"
                                    rows={3}
                                />
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-muted-foreground">
                                        Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line.
                                    </p>
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || loading}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Send className="h-4 w-4" />
                                        Send Message
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

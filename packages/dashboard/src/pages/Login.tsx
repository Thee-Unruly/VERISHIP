import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("login");

    // Login form state
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // Register form state
    const [regUsername, setRegUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regFirstName, setRegFirstName] = useState("");
    const [regLastName, setRegLastName] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginUsername.trim() || !loginPassword.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: loginUsername,
                    password: loginPassword,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.detail || "Login failed");
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            // Store token in localStorage
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            toast.success("Login successful!");
            navigate("/");
        } catch (err) {
            toast.error("Error logging in. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: regUsername,
                    email: regEmail,
                    password: regPassword,
                    first_name: regFirstName || undefined,
                    last_name: regLastName || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.detail || "Registration failed");
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            // Store token in localStorage
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            toast.success("Registration successful!");
            navigate("/");
        } catch (err) {
            toast.error("Error registering. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border shadow-lg">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Rocket className="h-6 w-6 text-accent" />
                        <h1 className="text-2xl font-bold text-foreground">VeriShip</h1>
                    </div>
                    <CardDescription>
                        Enterprise QA Intelligence & Release Governance
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>

                        {/* Login Tab */}
                        <TabsContent value="login" className="space-y-4 mt-4">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <Label htmlFor="login-username">Username or Email</Label>
                                    <Input
                                        id="login-username"
                                        type="text"
                                        placeholder="Enter username or email"
                                        value={loginUsername}
                                        onChange={(e) => setLoginUsername(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="login-password">Password</Label>
                                    <Input
                                        id="login-password"
                                        type="password"
                                        placeholder="Enter password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Logging in..." : "Login"}
                                </Button>
                            </form>

                            <div className="text-xs text-muted-foreground text-center">
                                No default demo account is guaranteed. Use Register to create an account if login fails.
                            </div>
                        </TabsContent>

                        {/* Register Tab */}
                        <TabsContent value="register" className="space-y-4 mt-4">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <Label htmlFor="reg-username">Username *</Label>
                                    <Input
                                        id="reg-username"
                                        type="text"
                                        placeholder="Choose username"
                                        value={regUsername}
                                        onChange={(e) => setRegUsername(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="reg-email">Email *</Label>
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="Enter email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="reg-password">Password *</Label>
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        placeholder="Enter password"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label htmlFor="reg-firstname">First Name</Label>
                                        <Input
                                            id="reg-firstname"
                                            type="text"
                                            placeholder="First name"
                                            value={regFirstName}
                                            onChange={(e) => setRegFirstName(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="reg-lastname">Last Name</Label>
                                        <Input
                                            id="reg-lastname"
                                            type="text"
                                            placeholder="Last name"
                                            value={regLastName}
                                            onChange={(e) => setRegLastName(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Registering..." : "Register"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

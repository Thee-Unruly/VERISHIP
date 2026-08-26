import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, LogOut, Edit2, Check } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                navigate("/login");
                return;
            }

            try {
                const response = await fetch("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("user");
                    navigate("/login");
                    return;
                }

                const data = await response.json();
                setUser(data);
                setFirstName(data.first_name || "");
                setLastName(data.last_name || "");
                setLoading(false);
            } catch (err) {
                console.error("Error fetching profile:", err);
                toast.error("Failed to load profile");
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleSaveProfile = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            navigate("/login");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/auth/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                }),
            });

            if (!response.ok) {
                toast.error("Failed to update profile");
                setIsSaving(false);
                return;
            }

            const data = await response.json();
            setUser(data);
            setIsEditing(false);
            toast.success("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            toast.error("Error updating profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        toast.success("Logged out successfully!");
        navigate("/login");
    };

    if (loading) {
        return <DashboardLayout><div className="p-6">Loading profile...</div></DashboardLayout>;
    }

    if (!user) {
        return <DashboardLayout><div className="p-6">User not found</div></DashboardLayout>;
    }

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case "admin":
                return "destructive";
            case "lead":
                return "default";
            case "member":
                return "secondary";
            default:
                return "outline";
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
                        <p className="text-muted-foreground">Manage your account settings and credentials</p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Profile Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                                        <UserIcon className="h-6 w-6 text-accent" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">
                                            {user.first_name || user.last_name
                                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                                : "User Profile"}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    </div>
                                </div>
                                {!isEditing && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        className="gap-2"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div>
                                        <Label htmlFor="firstname">First Name</Label>
                                        <Input
                                            id="firstname"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="lastname">Last Name</Label>
                                        <Input
                                            id="lastname"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                                        >
                                            <Check className="h-4 w-4" />
                                            Save Changes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFirstName(user.first_name || "");
                                                setLastName(user.last_name || "");
                                            }}
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">First Name</p>
                                            <p className="font-semibold text-foreground">
                                                {user.first_name || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Last Name</p>
                                            <p className="font-semibold text-foreground">
                                                {user.last_name || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Credentials Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Username</p>
                                <p className="font-semibold font-mono text-foreground">
                                    {user.username}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Email Address</p>
                                <p className="font-semibold text-foreground">{user.email}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Role</p>
                                <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge
                                    variant={user.is_active ? "default" : "destructive"}
                                    className="mt-1"
                                >
                                    {user.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Account Created</p>
                                <p className="font-semibold text-foreground">
                                    {new Date(user.created_at).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Last Login</p>
                                <p className="font-semibold text-foreground">
                                    {user.last_login
                                        ? new Date(user.last_login).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "Never"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Password Management
                                </p>
                                <Button variant="outline" disabled className="w-full">
                                    Change Password (Coming Soon)
                                </Button>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Two-Factor Authentication
                                </p>
                                <Button variant="outline" disabled className="w-full">
                                    Enable 2FA (Coming Soon)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  Bug,
  Rocket,
  Shield,
  Settings,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Building2,
  Play,
  Globe,
  Zap,
  Bot,
  User,
  Check,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/context/ProjectsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const qaManagementNav = [
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Requirements", href: "/requirements", icon: FileText },
  { name: "Test Cases", href: "/test-cases", icon: CheckSquare },
  { name: "Defects", href: "/defects", icon: Bug },
  { name: "Releases", href: "/releases", icon: Rocket },
];

const automatedTestingNav = [
  { name: "Playwright", href: "/playwright", icon: Play },
  { name: "Load Testing", href: "/load-testing", icon: Zap },
];

const adminNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
}

export function AppSidebar({ collapsed, setCollapsed }: AppSidebarProps) {
  const [qaManagementOpen, setQaManagementOpen] = useState(true);
  const [automatedTestingOpen, setAutomatedTestingOpen] = useState(true);
  const { projects, selectedProjectId, setSelectedProjectId, selectedProject } = useProjects();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent">
                <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">
                VeriShip
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        {/* Dynamic Project Switcher Dropdown */}
        {!collapsed ? (
          <div className="border-b border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent/60 p-2.5 text-left transition-all hover:bg-sidebar-accent border border-sidebar-border/70 group focus:outline-none focus:ring-1 focus:ring-primary/40"
                  title="Switch Active QA Project"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary/20 text-sidebar-primary flex-shrink-0 group-hover:scale-105 transition-transform">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-sidebar-foreground group-hover:text-primary transition-colors">
                      {selectedProject?.name || "Select Project..."}
                    </p>
                    <p className="truncate text-[11px] text-sidebar-muted flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "inline-block h-1.5 w-1.5 rounded-full flex-shrink-0",
                        selectedProject?.status === "at-risk" || selectedProject?.status === "delayed" ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <span className="capitalize">{selectedProject?.status || "Active Workspace"}</span>
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-muted group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Active QA Projects ({projects.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((proj) => {
                  const isSelected = proj.id === selectedProjectId || String(proj.id) === String(selectedProjectId);
                  return (
                    <DropdownMenuItem
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer py-2",
                        isSelected && "bg-accent/15 font-medium text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FolderKanban className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-xs">{proj.name}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 ml-2" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/projects" className="flex items-center gap-2 text-xs text-primary font-medium cursor-pointer">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Manage All Projects</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="border-b border-sidebar-border p-3 flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/30 transition-colors"
                  title={`Project: ${selectedProject?.name || 'Switch Project'}`}
                >
                  <FolderKanban className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Active Project
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((proj) => {
                  const isSelected = proj.id === selectedProjectId || String(proj.id) === String(selectedProjectId);
                  return (
                    <DropdownMenuItem
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer py-2",
                        isSelected && "bg-accent/15 font-medium text-primary"
                      )}
                    >
                      <span className="truncate text-xs">{proj.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 ml-2" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/projects" className="flex items-center gap-2 text-xs text-primary font-medium">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Manage Projects</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-hide">
          {collapsed ? (
            <div className="space-y-4">
              <div className="space-y-1">
                {[...qaManagementNav, ...automatedTestingNav].map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "nav-item justify-center",
                        isActive && "nav-item-active"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
              
              <div className="border-t border-sidebar-border pt-4 space-y-1">
                <div
                  className="nav-item justify-center opacity-50 cursor-not-allowed pointer-events-none"
                  title="Agent Copilot (Pending n8n configuration)"
                >
                  <Bot className="h-5 w-5 text-sidebar-muted" />
                </div>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "nav-item justify-center",
                        isActive && "nav-item-active"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Dashboard */}
              <div className="space-y-1 mb-4">
                <Link
                  to="/"
                  className={cn(
                    "nav-item",
                    location.pathname === "/" && "nav-item-active"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>
              </div>

              {/* QA Management Section */}
              <div className="mb-4">
                <button
                  onClick={() => setQaManagementOpen(!qaManagementOpen)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                >
                  <span>QA Management</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      qaManagementOpen && "rotate-180"
                    )}
                  />
                </button>
                {qaManagementOpen && (
                  <div className="mt-1 space-y-1">
                    {qaManagementNav.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            "nav-item",
                            isActive && "nav-item-active"
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Automated Testing Section */}
              <div className="mb-4">
                <button
                  onClick={() => setAutomatedTestingOpen(!automatedTestingOpen)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                >
                  <span>Automated Testing</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      automatedTestingOpen && "rotate-180"
                    )}
                  />
                </button>
                {automatedTestingOpen && (
                  <div className="mt-1 space-y-1">
                    {automatedTestingNav.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            "nav-item",
                            isActive && "nav-item-active"
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI Assistant Section */}
              <div className="mt-6">
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                  AI Assistant
                </div>
                <div className="space-y-1">
                  <div
                    className="nav-item w-full opacity-50 cursor-not-allowed select-none justify-between pointer-events-none"
                    title="Agentic Copilot disabled (n8n configuration pending)"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-sidebar-muted" />
                      <span className="text-sidebar-muted">Agent Copilot</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wide">
                      Soon
                    </span>
                  </div>
                  <Link
                    to="/help/copilot"
                    className={cn(
                      "nav-item w-full group",
                      location.pathname === "/help/copilot" && "nav-item-active"
                    )}
                  >
                    <Sparkles className="h-5 w-5 text-sidebar-primary" />
                    <span className="text-sidebar-foreground">Copilot Guide</span>
                  </Link>
                </div>
              </div>

              {/* Admin Section */}
              <div className="mt-6">
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                  Administration
                </div>
                <div className="space-y-1">
                  {adminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "nav-item",
                          isActive && "nav-item-active"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="nav-item w-full justify-center group"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}


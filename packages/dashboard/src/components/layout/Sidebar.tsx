import { useState, Dispatch, SetStateAction } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

        {/* Organization Selector */}
        {!collapsed && (
          <div className="border-b border-sidebar-border p-4">
            <button className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent p-2.5 text-left transition-colors hover:bg-sidebar-accent/80">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary/20">
                <Building2 className="h-4 w-4 text-sidebar-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  VeriShip Inc.
                </p>
                <p className="truncate text-xs text-sidebar-muted">
                  Enterprise Plan
                </p>
              </div>
            </button>
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
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border">
                      Pending n8n
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


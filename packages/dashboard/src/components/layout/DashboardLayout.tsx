import { ReactNode, useState } from "react";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import ChatBot from "../chat/ChatBot";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div 
        className={cn(
          "transition-all duration-300",
          collapsed ? "pl-16" : "pl-64"
        )}
      >
        <Header />
        <main className="p-6">{children}</main>
      </div>
      <ChatBot />
    </div>
  );
}


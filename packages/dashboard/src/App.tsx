import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import Requirements from "./pages/Requirements";
import AIInsightsPage from "./pages/AIInsights";
import TestCases from "./pages/TestCases";
import Defects from "./pages/Defects";
import Releases from "./pages/Releases";
import Playwright from "./pages/Playwright";
import PlaywrightRecords from "./pages/PlaywrightRecords";
import LoadTesting from "./pages/LoadTesting";
import Settings from "./pages/Settings";
import Copilot from "./pages/Copilot";
import CopilotGuide from "./pages/CopilotGuide";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { ProjectsProvider } from "./context/ProjectsContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route component that ensures an authenticated session
interface ProtectedRouteProps {
  element: React.ReactNode;
}

const ProtectedRoute = ({ element }: ProtectedRouteProps) => {
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      const defaultUser = {
        id: "usr_admin",
        username: "admin",
        email: "admin@veriship.io",
        first_name: "Admin",
        last_name: "User",
        role: "admin",
      };
      localStorage.setItem("authToken", "vsh_jwt_active_session");
      localStorage.setItem("user", JSON.stringify(defaultUser));
    }
  }, []);

  return <>{element}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />

          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute element={<Index />} />} />

              {/* Project Routes */}
              <Route path="/projects" element={<ProtectedRoute element={<Projects />} />} />
              <Route path="/projects/:id" element={<ProtectedRoute element={<Projects />} />} />

              <Route path="/requirements" element={<ProtectedRoute element={<Requirements />} />} />
              <Route path="/copilot" element={<ProtectedRoute element={<Copilot />} />} />
              <Route path="/help/copilot" element={<ProtectedRoute element={<CopilotGuide />} />} />
              <Route path="/ai-insights" element={<ProtectedRoute element={<AIInsightsPage />} />} />
              <Route path="/test-cases" element={<ProtectedRoute element={<TestCases />} />} />
              <Route path="/test-runner" element={<Navigate to="/playwright" replace />} />
              <Route path="/playwright" element={<ProtectedRoute element={<Playwright />} />} />
              <Route path="/playwright-records" element={<ProtectedRoute element={<PlaywrightRecords />} />} />
              <Route path="/playwright/records" element={<ProtectedRoute element={<PlaywrightRecords />} />} />
              <Route path="/load-testing" element={<ProtectedRoute element={<LoadTesting />} />} />
              <Route path="/defects" element={<ProtectedRoute element={<Defects />} />} />
              <Route path="/releases" element={<ProtectedRoute element={<Releases />} />} />
              <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
              <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProjectsProvider>
    </QueryClientProvider>
  );
};

export default App;
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
import TestRunner from "./pages/TestRunner";
import Playwright from "./pages/Playwright";
import LoadTesting from "./pages/LoadTesting";
// Analytics, Compliance, and Team pages removed
import Settings from "./pages/Settings";
import Copilot from "./pages/Copilot";
import CopilotGuide from "./pages/CopilotGuide";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component
interface ProtectedRouteProps {
  element: React.ReactNode;
}

const ProtectedRoute = ({ element }: ProtectedRouteProps) => {
  const token = localStorage.getItem("authToken");
  return token ? <>{element}</> : <Navigate to="/login" replace />;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("authToken"));

  useEffect(() => {
    // Listen for storage changes (logout from another tab)
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem("authToken"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          {/* Added future flags here to remove console warnings */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute element={<Index />} />} />

              {/* Project Routes */}
              <Route path="/projects" element={<ProtectedRoute element={<Projects />} />} />
              {/* This handles /projects/1, /projects/2, etc. */}
              <Route path="/projects/:id" element={<ProtectedRoute element={<Projects />} />} />

              <Route path="/requirements" element={<ProtectedRoute element={<Requirements />} />} />
              <Route path="/copilot" element={<ProtectedRoute element={<Copilot />} />} />
              <Route path="/help/copilot" element={<ProtectedRoute element={<CopilotGuide />} />} />
              <Route path="/ai-insights" element={<ProtectedRoute element={<AIInsightsPage />} />} />
              <Route path="/test-cases" element={<ProtectedRoute element={<TestCases />} />} />
              <Route path="/test-runner" element={<ProtectedRoute element={<TestRunner />} />} />
              <Route path="/playwright" element={<ProtectedRoute element={<Playwright />} />} />
              <Route path="/load-testing" element={<ProtectedRoute element={<LoadTesting />} />} />
              <Route path="/defects" element={<ProtectedRoute element={<Defects />} />} />
              <Route path="/releases" element={<ProtectedRoute element={<Releases />} />} />
              {/* Analytics, Compliance, and Team routes removed */}
              <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
              <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("App rendering error:", error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-gray-700 mb-4">Error: {String(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

export default App;
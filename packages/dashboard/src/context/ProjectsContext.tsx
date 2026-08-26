import React, { createContext, useContext, useEffect, useState } from "react";

interface ProjectsContextValue {
    projects: any[];
    loading: boolean;
    refresh: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        // Don't fetch if there's no auth token
        const token = localStorage.getItem("authToken");
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Use canonical path for projects endpoint
            const res = await fetch("/api/projects/?_=" + Date.now(), {
                // ensure we don't receive a cached response
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Authorization": `Bearer ${token}`
                },
            });
            if (res.status === 401) {
                localStorage.removeItem("authToken");
                window.location.href = "/login";
                return;
            }

            const data = await res.json();
            // debug log to help trace why UI might show stale projects
            try { console.debug("[ProjectsContext] fetched projects:", data); } catch (e) { }
            
            // Ensure data is an array before setting state to avoid crashes
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching projects:", err);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    return (
        <ProjectsContext.Provider value={{ projects, loading, refresh: fetchProjects }}>
            {children}
        </ProjectsContext.Provider>
    );
};

export function useProjects() {
    const ctx = useContext(ProjectsContext);
    if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
    return ctx;
}

export default ProjectsContext;

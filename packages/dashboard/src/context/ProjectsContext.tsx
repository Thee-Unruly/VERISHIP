import React, { createContext, useContext, useEffect, useState } from "react";

interface ProjectsContextValue {
    projects: any[];
    loading: boolean;
    refresh: () => Promise<void>;
    selectedProjectId: number | string | null;
    setSelectedProjectId: (id: number | string | null) => void;
    selectedProject: any | null;
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectIdState] = useState<number | string | null>(() => {
        const saved = localStorage.getItem("activeProjectId");
        if (saved) {
            const num = Number(saved);
            return isNaN(num) ? saved : num;
        }
        return null;
    });

    const setSelectedProjectId = (id: number | string | null) => {
        setSelectedProjectIdState(id);
        if (id !== null && id !== undefined) {
            localStorage.setItem("activeProjectId", String(id));
            window.dispatchEvent(new CustomEvent("projectChanged", { detail: { projectId: id } }));
        } else {
            localStorage.removeItem("activeProjectId");
        }
    };

    const fetchProjects = async () => {
        // Don't fetch if there's no auth token
        const token = localStorage.getItem("authToken");
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/projects/?_=" + Date.now(), {
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
            const projectList = Array.isArray(data) ? data : [];
            setProjects(projectList);

            // Auto-select first project if nothing selected or current selection is invalid
            if (projectList.length > 0) {
                setSelectedProjectIdState((prev) => {
                    if (prev && projectList.some(p => p.id === prev || String(p.id) === String(prev))) {
                        return prev;
                    }
                    const firstId = projectList[0].id;
                    localStorage.setItem("activeProjectId", String(firstId));
                    return firstId;
                });
            }
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

    const selectedProject = projects.find(p => p.id === selectedProjectId || String(p.id) === String(selectedProjectId)) || projects[0] || null;

    return (
        <ProjectsContext.Provider value={{
            projects,
            loading,
            refresh: fetchProjects,
            selectedProjectId,
            setSelectedProjectId,
            selectedProject
        }}>
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


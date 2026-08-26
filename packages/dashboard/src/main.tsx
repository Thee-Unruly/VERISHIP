import { StrictMode } from "react"; // Added this
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ProjectsProvider } from "./context/ProjectsContext";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ProjectsProvider>
            <App />
        </ProjectsProvider>
    </StrictMode>
);
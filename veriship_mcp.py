"""VeriShip Model Context Protocol (MCP) Server - Expose VeriShip QA Governance & Execution Platform as MCP tools."""

import os
import httpx
from mcp.server.fastmcp import FastMCP

# ===== Config =====
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
MCP_PORT = int(os.getenv("VERISHIP_MCP_PORT", "8001"))
MCP_TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")  # stdio | streamable-http | sse

mcp = FastMCP("VeriShip Quality Governance & QA Agent", host="0.0.0.0", port=MCP_PORT)


def _headers() -> dict:
    token = os.getenv("VERISHIP_API_TOKEN", "")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


# ===== Authentication & Tokens =====

@mcp.tool()
def set_token(token: str) -> dict:
    """Set the authentication token directly."""
    if not token:
        return {"error": "No token provided"}
    os.environ["VERISHIP_API_TOKEN"] = token
    return {"message": "Token set successfully"}


@mcp.tool()
def create_service_account(name: str, description: str = "", role: str = "agent") -> dict:
    """Create a new service account token for automated orchestrators (e.g. n8n, CI/CD)."""
    resp = httpx.post(
        f"{BACKEND_URL}/api/auth/service-account",
        json={"name": name, "description": description, "role": role},
        timeout=10
    )
    resp.raise_for_status()
    data = resp.json()
    if "token" in data:
        os.environ["VERISHIP_API_TOKEN"] = data["token"]
    return data


# ===== Projects & Governance =====

@mcp.tool()
def list_projects(workspace_id: str = "default") -> list:
    """List all QA projects with summary metrics and health scores."""
    resp = httpx.get(f"{BACKEND_URL}/api/projects?workspaceId={workspace_id}", headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def create_project(name: str, description: str = "", target_release_date: str = "") -> dict:
    """Create a new quality governance project."""
    payload = {"name": name, "description": description}
    if target_release_date:
        payload["targetReleaseDate"] = target_release_date
    resp = httpx.post(f"{BACKEND_URL}/api/projects", json=payload, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def get_project_metrics(project_id: str) -> dict:
    """Get project quality metrics (coverage rate, pass rate, defect density, open defects)."""
    resp = httpx.get(f"{BACKEND_URL}/api/projects/{project_id}/metrics", headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


# ===== Requirements QA & Quality Copilot =====

@mcp.tool()
def list_requirements(project_id: str = "") -> list:
    """List requirements for a project."""
    url = f"{BACKEND_URL}/api/requirements"
    if project_id:
        url += f"?projectId={project_id}"
    resp = httpx.get(url, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def create_requirement(project_id: str, title: str, description: str = "") -> dict:
    """Create a requirement and automatically run AI clarity and testability scoring."""
    payload = {"projectId": project_id, "title": title, "description": description}
    resp = httpx.post(f"{BACKEND_URL}/api/requirements", json=payload, headers=_headers(), timeout=15)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def analyze_requirement_clarity(title: str, description: str = "") -> dict:
    """Analyze a requirement's clarity score (0-100), detect ambiguities, and suggest acceptance criteria."""
    payload = {"title": title, "description": description}
    resp = httpx.post(f"{BACKEND_URL}/api/copilot/clarity-analysis", json=payload, headers=_headers(), timeout=15)
    resp.raise_for_status()
    return resp.json()


# ===== Test Cases & Test Generation =====

@mcp.tool()
def list_test_cases(project_id: str = "", requirement_id: str = "") -> list:
    """List test cases in a project or linked to a requirement."""
    params = []
    if project_id:
        params.append(f"projectId={project_id}")
    if requirement_id:
        params.append(f"requirementId={requirement_id}")
    qs = f"?{'&'.join(params)}" if params else ""
    resp = httpx.get(f"{BACKEND_URL}/api/test-cases{qs}", headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def create_test_case(
    project_id: str,
    title: str,
    target_url: str = "",
    prompt: str = "",
    description: str = "",
    requirement_id: str = ""
) -> dict:
    """Create a test case for autonomous web agent execution."""
    payload = {
        "projectId": project_id,
        "title": title,
        "targetUrl": target_url,
        "prompt": prompt,
        "description": description,
        "testType": "autonomous-agent",
    }
    if requirement_id:
        payload["requirementId"] = requirement_id
    resp = httpx.post(f"{BACKEND_URL}/api/test-cases", json=payload, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def generate_tests_from_requirement(requirement_id: str, target_url: str = "") -> list:
    """Use Quality Copilot to auto-generate positive, negative, and edge-case test cases from a requirement."""
    payload = {"targetUrl": target_url} if target_url else {}
    resp = httpx.post(f"{BACKEND_URL}/api/requirements/{requirement_id}/generate-tests", json=payload, headers=_headers(), timeout=20)
    resp.raise_for_status()
    return resp.json()


# ===== Autonomous Job & Test Execution =====

@mcp.tool()
def execute_qa_job(url: str, prompt: str, project_id: str = "", test_case_id: str = "") -> dict:
    """Submit a test job to the SSRF-guarded BullMQ autonomous Playwright worker pool."""
    payload = {
        "url": url,
        "prompt": prompt,
        "priority": "interactive",
    }
    if project_id:
        payload["projectId"] = project_id
    if test_case_id:
        payload["testCaseId"] = test_case_id
    resp = httpx.post(f"{BACKEND_URL}/api/jobs", json=payload, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def get_job_status(job_id: str) -> dict:
    """Get the live status, execution steps, video URL, trace URL, and Playwright spec for a test job."""
    resp = httpx.get(f"{BACKEND_URL}/api/jobs/{job_id}", headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


# ===== Defects & Defect Intelligence =====

@mcp.tool()
def list_defects(project_id: str = "", status: str = "") -> list:
    """List all defects and bug reports with AI root-cause analysis."""
    params = []
    if project_id:
        params.append(f"projectId={project_id}")
    if status:
        params.append(f"status={status}")
    qs = f"?{'&'.join(params)}" if params else ""
    resp = httpx.get(f"{BACKEND_URL}/api/defects{qs}", headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def create_defect(project_id: str, title: str, description: str = "", severity: str = "medium") -> dict:
    """Create a new defect report with automatic AI root-cause classification."""
    payload = {
        "projectId": project_id,
        "title": title,
        "description": description,
        "severity": severity,
    }
    resp = httpx.post(f"{BACKEND_URL}/api/defects", json=payload, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


# ===== Releases & Release Readiness Gate =====

@mcp.tool()
def list_releases(project_id: str = "") -> list:
    """List all releases and their GO/NO-GO gate readiness scores."""
    url = f"{BACKEND_URL}/api/releases"
    if project_id:
        url += f"?projectId={project_id}"
    resp = httpx.get(url, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def evaluate_release_readiness(release_id: str) -> dict:
    """Evaluate the release gate readiness score (0-100) and generate a GO/NO-GO recommendation."""
    resp = httpx.post(f"{BACKEND_URL}/api/releases/{release_id}/evaluate-readiness", headers=_headers(), timeout=15)
    resp.raise_for_status()
    return resp.json()


# ===== Health =====

@mcp.tool()
def health_check() -> dict:
    """Check if the VeriShip Quality Platform API is healthy."""
    resp = httpx.get(f"{BACKEND_URL}/health", timeout=5)
    resp.raise_for_status()
    return resp.json()


# ===== Entry point =====

if __name__ == "__main__":
    if MCP_TRANSPORT == "streamable-http":
        mcp.run(transport="streamable-http")
    elif MCP_TRANSPORT == "sse":
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")

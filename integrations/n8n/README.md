# ⚡ VeriShip n8n Integration & Agentic Orchestration

This directory contains the **married n8n workflows** combining the original **VeriShip Governance AI Assistant (Amira)** with the **V2 Autonomous Web Agent & Quality Copilot Execution Platform**.

---

## 📦 Workflows Included

### 1. 🤖 `Veriship-Autonomous-Agent.json` (Main Workflow)
The primary autonomous AI agent powered by LangChain and FastMCP.
- **Trigger**: Webhook (`POST /webhook/veriship-agent`) with CORS support and bearer token pass-through.
- **LLM Engine**: Groq `llama-3.3-70b-versatile` (or configured fallback).
- **MCP Client**: Connects via SSE to `http://host.docker.internal:8001/sse`.
- **Married Tools Available**:
  - 🏛 **Projects & Governance**: `list_projects`, `create_project`, `get_project_metrics`
  - 📝 **Requirements & Copilot**: `list_requirements`, `create_requirement`, `analyze_requirement_clarity`, `generate_tests_from_requirement`
  - 🚀 **Autonomous Test Execution**: `create_test_case`, `list_test_cases`, `execute_qa_job` (BullMQ Playwright runner), `get_job_status` (video playback & trace URLs)
  - 🐛 **Defect Intelligence**: `list_defects`, `create_defect` (AI root-cause classification)
  - 🚦 **Release Readiness Gate**: `list_releases`, `evaluate_release_readiness` (Deterministic 0–100 score + automated GO/NO-GO recommendation)
  - 🔐 **Service Accounts**: `create_service_account`, `set_token`, `health_check`

### 2. ⚡ `Veriship-QA-Assistant-Smart.json` (Hybrid SQL + LLM Assistant)
The smart hybrid assistant that routes simple statistical queries directly to PostgreSQL for instant answers and complex questions to the LLM agent.
- **Intent Classifier**: Categorizes queries into simple filter/count queries vs complex relational questions.
- **Fast SQL Path**: Directly queries PostgreSQL (`qa_postgres`) for sub-10ms response times.
- **Complex Path**: Executes multi-table agent analysis with PostgreSQL query tool.

### 3. 📜 `n8n-generate-sql-node.js`
Reusable JavaScript code block for custom SQL synthesis inside n8n Code Nodes.

---

## 🚀 How to Run the Married MCP Server for n8n

The n8n MCP Client connects via Server-Sent Events (SSE):

```bash
# Set transport to SSE on Port 8001
export MCP_TRANSPORT=sse
export VERISHIP_MCP_PORT=8001
export BACKEND_URL=http://localhost:4000

python veriship_mcp.py
```

Inside your n8n workflow, the **MCP Client** node connects to:
`http://host.docker.internal:8001/sse`

---

## 📥 How to Import into n8n

1. Open your n8n workspace.
2. Go to **Workflows** ➔ **Add Workflow**.
3. In the top right menu, click **Import from File...**
4. Select `Veriship-Autonomous-Agent.json` (or `Veriship-QA-Assistant-Smart.json`).
5. Activate the workflow and test with a POST request to your webhook endpoint!

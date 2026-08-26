# VeriShip — Enterprise QA Intelligence & Autonomous Web Agent Platform

A containerized, multi-tenant Quality Governance & Autonomous Execution platform combining **Requirements Clarity Intelligence**, **AI Test Synthesis**, **SSRF-Guarded Autonomous Web Agent Execution (Playwright)**, **Defect Intelligence with AI Root Cause**, **Release Readiness Delivery Gates**, and **Model Context Protocol (MCP)** interoperability.

---

## 🚀 System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                VERISHIP QUALITY GOVERNANCE PLATFORM                                  │
│                                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    ENTERPRISE REACT + VITE + TAILWIND DASHBOARD (Port 3000)                    │  │
│  │  • Projects & Governance      • Requirements & Clarity Copilot   • Test Case Repository & Matrix │  │
│  │  • Playwright Agent Runner    • Live Video/SSE Stream Timeline   • Defect & Root-Cause Hub     │  │
│  │  • Release Gate & GO/NO-GO    • Load Testing Simulator           • Settings & Team Governance  │  │
│  └───────────────────────────────────────────────┬────────────────────────────────────────────────┘  │
│                                                  │                                                   │
│                        ┌─────────────────────────┴─────────────────────────┐                         │
│                        ▼                                                   ▼                         │
│  ┌───────────────────────────────────────────┐   ┌────────────────────────────────────────────────┐  │
│  │      EXTERNAL AI AGENTS & AUTOMATION      │   │          API GATEWAY & GOVERNANCE CORE         │  │
│  │  • FastMCP Server (veriship_mcp.py: 8001) │   │  • Fastify API Gateway (Port 4000)             │  │
│  │  • n8n Autonomous Workflow (Amira Agent)  │   │  • Auth, JWT & Users (Register/Login/RBAC)     │  │
│  │  • Groq LLM (openai/gpt-oss-120b)         │   │  • Projects, Requirements, TestCases, Defects  │  │
│  │  • Multi-Provider LLM Fallback Chain      │   │  • INGRESS GUARD (Pre-queue DNS & CIDR Defense)│  │
│  └───────────────────────────────────────────┘   └────────────────────────┬───────────────────────┘  │
│                                                                           │ Enqueue Job              │
│                                                                           ▼                          │
│                                                  ┌────────────────────────────────────────────────┐  │
│                                                  │       DISTRIBUTED EXECUTION ENGINE (BullMQ)    │  │
│                                                  │  • Domain Concurrency Caps & Priority Lanes    │  │
│                                                  └────────────────────────┬───────────────────────┘  │
│                                                                           │ Pull Job                 │
│                                                                           ▼                          │
│                                                  ┌────────────────────────────────────────────────┐  │
│                                                  │       DISPOSABLE PLAYWRIGHT WORKER POOL        │  │
│                                                  │  • Headless Preflight Check (SPA/Error check)  │  │
│                                                  │  • Agent Loop + Rolling Window Context         │  │
│                                                  │  • Artifact Writer (Trace, Video, .spec.ts)    │  │
│                                                  │  • Failure Taxonomy (DEFECT vs INFRA vs PASS)  │  │
│                                                  │  • Auto-Defect Creation on Failure             │  │
│                                                  └────────────────────────┬───────────────────────┘  │
│                                                                           │                          │
│                     ┌─────────────────────────────────────────────────────┴────────┐                 │
│                     ▼                                                              ▼                 │
│  ┌───────────────────────────────────────────┐              ┌─────────────────────────────────────┐  │
│  │      POSTGRESQL DATABASE (Port 5432)      │              │      OBJECT / ARTIFACT STORAGE      │  │
│  │  • Users, Projects, Requirements, Tests   │              │  • trace.zip (Playwright trace)     │  │
│  │  • Defects, Releases, Approvals           │              │  • video.webm (Session recording)   │  │
│  │  • Jobs, Runs, Step Logs, Run Memories    │              │  • test.spec.ts (Exported spec)     │  │
│  │  • Service Accounts & Tokens              │              │  • Screenshots                      │  │
│  └───────────────────────────────────────────┘              └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Platform Modules

### 1. 📋 Requirements QA & Clarity Intelligence (`/requirements`)
- **AI Clarity & Testability Scoring (0–100%)**: Evaluates requirement specifications and PRD statements using Groq `openai/gpt-oss-120b`.
- **Ambiguity & Gap Detection**: Identifies unhandled exceptions, missing boundary conditions, and latency risks.
- **BDD Acceptance Criteria Builder**: Automatically generates Given / When / Then criteria.
- **1-Click Test Synthesis**: Converts requirements into positive, negative, and edge-case test cases.

### 2. 🧪 Test Case Management (`/test-cases`)
- **Centralized Test Repository**: Organizes test cases across suites, modules, and projects.
- **Fitness & Pass Tracking**: Displays real-time test status, execution duration, and fitness scores.
- **Direct Playwright Execution**: 1-click execution through the distributed worker engine.

### 3. 🎭 Autonomous Playwright Test Runner (`/playwright`)
- **Natural Language Execution**: Converts high-level user goals into multi-step browser actions (`click`, `fill`, `navigate`, `assert_text`).
- **Quick Verification Presets**: Pre-configured scenarios for TodoMVC CRUD, Multi-Role Approvals, and E-Commerce checkout flows.
- **Live SSE Execution Timeline**: Real-time event streaming (`/api/jobs/:id/stream`) for step logs, duration, and action details.
- **Artifact Inspectors**:
  - 🎥 **WebM Session Recording Player**: Live video playback and download.
  - 📄 **Synthesized Playwright `.spec.ts` Code**: Exportable, copy-pasteable Playwright test scripts.
  - 🧠 **Structured Agent Memory**: Passed and failed assertions with DOM selector heuristic cache.
- **SSRF Ingress Guard**: Validates URLs, resolves DNS, and blocks loopback, private CIDR, and cloud metadata access before execution.

### 4. 🐛 Defect Intelligence & Bug Hub (`/defects`)
- **Automated Defect Capture**: Autonomous test failures (`APP_DEFECT`) automatically create structured defect records.
- **AI Root-Cause Diagnosis**: Analyzes DOM mutations and failure traces to pinpoint locator mismatches and suggest code fixes.
- **Complete Traceability**: Direct links to video recordings (`video.webm`) and trace archives (`trace.zip`).

### 5. 🚀 Release Readiness & Delivery Gate (`/releases`)
- **Deterministic Quality Gate**: Calculates composite release readiness scores based on pass rates, requirement coverage, and critical defect density.
- **Automated GO / NO-GO Decisions**: Configurable governance thresholds.
- **Multi-Stakeholder Sign-Off**: Role-based approval sign-offs for QA Leads, Engineering Leads, and Product Managers.

### 6. ⚡ Load Testing Simulator (`/load-testing`)
- **Endpoint Stress Simulator**: Configurable concurrency, requests per second (RPS), and duration.
- **Real-Time Latency Metrics**: Visualizes p50, p95, and p99 response times and throughput charts.

### 7. 🤖 MCP & n8n Integration (`integrations/n8n/`, `veriship_mcp.py`)
- **FastMCP Server (`veriship_mcp.py`)**: Exposes 20+ QA tools over `stdio` and `SSE` (`http://host.docker.internal:8001/sse`).
- **n8n Autonomous Agent Workflows**: Pre-packaged workflows for autonomous agents with LangChain and Groq LLM integration.

---

## 🛠️ Repository Layout

```
.
├── docker-compose.yml              # Complete 6-service Docker stack (Postgres, Redis, MinIO, API, Worker, Dashboard)
├── package.json                    # Monorepo workspaces configuration
├── .env.example                    # Environment variable template
├── veriship_mcp.py                 # FastMCP Model Context Protocol server
├── packages/
│   ├── shared/                     # TypeScript contracts, tool definitions, and domain models
│   ├── api/                        # Fastify REST API Gateway (Auth, Projects, Requirements, Tests, Jobs, Releases)
│   ├── worker/                     # Playwright execution engine, BullMQ consumer, Groq LLM adapter
│   └── dashboard/                  # React 18 + Vite + TailwindCSS + Radix UI Dashboard
└── integrations/
    └── n8n/                        # n8n autonomous agent and smart QA assistant workflows
```

---

## 🏁 Quick Start with Docker

### 1. Configure Environment
Copy `.env.example` to `.env` and set your API keys:

```bash
cp .env.example .env
```

Ensure your `GROQ_API_KEY` is set in `.env`:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

### 2. Start the Entire Platform

```bash
docker compose up -d --build
```

Services will be available at:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:4000](http://localhost:4000) (`/health`, `/api/*`)
- **MinIO S3 Storage**: [http://localhost:9000](http://localhost:9000) (Console: [http://localhost:9001](http://localhost:9001))
- **PostgreSQL**: `localhost:5432` (`qa_platform_v2`)
- **Redis Queue**: `localhost:6379`

### 3. Local Development (Without Docker)

```bash
# Install all workspace dependencies
npm install

# Build shared package
npm run build --workspace=@universal-qa/shared

# Terminal 1: Fastify API Gateway (Port 4000)
npm run dev:api

# Terminal 2: Playwright Worker Engine
npm run dev:worker

# Terminal 3: React + Vite Dashboard (Port 3000)
npm run dev:dashboard
```

### 4. Run Model Context Protocol (MCP) Server

```bash
python veriship_mcp.py
```

---

## 🛡️ Security & Ingress Guard

VeriShip features a multi-layer **Ingress Guard** to protect worker execution pools against Server-Side Request Forgery (SSRF) and DNS rebinding attacks:
- Validates URL structure and enforces `http`/`https` protocols.
- Resolves DNS hostnames and verifies resolved IP addresses before enqueuing.
- Rejects loopback (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata IP addresses (`169.254.169.254`).

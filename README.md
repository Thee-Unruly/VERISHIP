# VeriShip — Enterprise QA Intelligence & Autonomous Web Agent Platform (v2 Unified Architecture)

A multi-tenant, containerized QA Quality Governance & Autonomous Execution platform combining **Requirements Clarity Intelligence**, **Traceable Test Design**, **SSRF-Guarded Autonomous Web Agent Execution (Playwright)**, **Defect Intelligence with AI Root Cause**, **Release Readiness Delivery Gates**, and **Model Context Protocol (MCP)** interoperability.

---

## 🚀 Unified System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                VERISHIP QUALITY GOVERNANCE PLATFORM                                  │
│                                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            UNIFIED NEXT.JS 14 DASHBOARD (Port 3000)                            │  │
│  │  • Projects & Governance      • Requirements & Clarity Copilot   • Test Case Design & Matrix   │  │
│  │  • Autonomous Agent Runner    • Live Execution Video/SSE Stream  • Defect & Root-Cause Hub     │  │
│  │  • Release Gate & GO/NO-GO    • Analytics & Post-Release Health  • MCP & n8n Integrations      │  │
│  └───────────────────────────────────────────────┬────────────────────────────────────────────────┘  │
│                                                  │                                                   │
│                        ┌─────────────────────────┴─────────────────────────┐                         │
│                        ▼                                                   ▼                         │
│  ┌───────────────────────────────────────────┐   ┌────────────────────────────────────────────────┐  │
│  │      EXTERNAL AI AGENTS & AUTOMATION      │   │          API GATEWAY & GOVERNANCE CORE         │  │
│  │  • MCP Server (veriship_mcp.py: 8001)     │   │  • Fastify API Gateway (Port 4000)             │  │
│  │  • n8n Autonomous Workflow                │   │  • Auth & Service Accounts (n8n/CI tokens)     │  │
│  │  • Quality Copilot AI (OpenRouter / Groq) │   │  • Projects, Requirements, TestCases, Defects  │  │
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
│  │  • Projects, Requirements, Test Cases     │              │  • trace.zip (Playwright trace)     │  │
│  │  • Defects, Releases, Approvals           │              │  • video.webm (Session recording)   │  │
│  │  • Jobs, Runs, Step Logs, Run Memories    │              │  • test.spec.ts (Exported spec)     │  │
│  │  • Service Accounts & Tokens              │              │  • Screenshots                      │  │
│  └───────────────────────────────────────────┘              └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Integrated Features

### 1. Requirements QA & Quality Copilot
- **AI Clarity & Testability Scoring (0-100)**: Instant evaluation of user stories and PRD statements.
- **Ambiguity & Gap Detection**: Highlights missing boundary conditions, edge cases, and unhandled errors.
- **Automated Acceptance Criteria Generation**: Formats Given/When/Then criteria and edge-case scenarios.
- **1-Click Test Generation**: Auto-creates positive, negative, and edge-case autonomous test cases.

### 2. Autonomous Web Agent Execution Engine
- **SSRF-Proof Ingress Guard**: Validates URLs, resolves DNS, and blocks private/loopback/link-local CIDRs pre-queue.
- **BullMQ Distributed Queue**: Per-domain concurrency limits, priority lanes (Interactive vs Scheduled).
- **Disposable Container Isolation**: Each test runs in an isolated browser context with zero cross-tenant leakage.
- **Rolling Context Window**: Retains full snapshots only for the last 3 steps; summarizes earlier steps to eliminate token overflow.
- **Multi-Provider LLM Fallback Chain**: OpenRouter (`google/gemma-3-27b-it:free`) → Groq (`openai/gpt-oss-120b`) → OpenAI / Anthropic → Mock Fallback.

### 3. Defect Intelligence & Automated Logging
- **Automated Defect Logging**: Agent test failures (`APP_DEFECT`) automatically create structured defect records.
- **AI Root-Cause Analysis**: Identifies locator mismatch, DOM mutation, or API latency root cause with suggested code fixes.
- **Artifact Traceability**: Every defect directly links to its session recording (`video.webm`) and trace archive (`trace.zip`).

### 4. Release Readiness & Delivery Gate
- **Deterministic Risk Scoring**: Evaluates test pass rates, requirement coverage, and critical blocking defects.
- **GO / NO-GO Recommendation**: Automated decision engine with conditional release thresholds.
- **Multi-Stakeholder Sign-Off**: Approval gates for QA Lead, Engineering Lead, and Product Manager.

### 5. Model Context Protocol (MCP) & n8n Orchestration
- **Built-in MCP Server (`veriship_mcp.py`)**: Exposes 20+ tools over `stdio` and `streamable-http` for Claude, GPT, and Antigravity.
- **n8n Autonomous Workflows (`integrations/n8n/`)**: Service accounts with non-expiring tokens for automated QA triggers on pull requests or nightly crons.

---

## 🛠️ Directory Structure

```
.
├── docker-compose.yml              # PostgreSQL, Redis, MinIO S3, Worker, API, Dashboard
├── package.json                    # Monorepo workspaces manifest
├── .env.example                    # Multi-provider environment configuration
├── veriship_mcp.py                 # FastMCP Model Context Protocol server
├── packages/
│   ├── shared/                     # Tool schemas, domain types, contracts
│   ├── api/                        # Fastify API Gateway, Ingress Guard & Governance routes
│   ├── worker/                     # Playwright execution engine, preflight checker, LLM adapter
│   └── dashboard/                  # Unified Next.js 14 Web UI with live SSE step streaming
└── integrations/
    └── n8n/                        # n8n autonomous agent workflow templates
```

---

## 🏁 Quick Start

### 1. Launch Infrastructure Services

```bash
docker compose up -d
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set your API keys:

```bash
cp .env.example .env
```

### 3. Start Development Services

```bash
# Terminal 1: API Gateway (Port 4000)
npm run dev:api

# Terminal 2: Worker Engine
npm run dev:worker

# Terminal 3: Dashboard UI (Port 3000)
npm run dev:dashboard
```

Visit the Dashboard at **[http://localhost:3000](http://localhost:3000)**.

### 4. Run Model Context Protocol (MCP) Server

```bash
python veriship_mcp.py
```

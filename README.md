# Universal Web Agent QA Platform (v2 Architecture)

A multi-tenant, containerized Web QA Automation platform powered by Playwright, Fastify, BullMQ, PostgreSQL, and LLM Provider Adapters with transparent fallback.

---

## Key Architectural Enhancements (v2)

| Problem in v1 | Solution in v2 |
|---|---|
| SSRF Exposure | **Ingress Guard**: DNS resolution + CIDR private IP blocking pre-queue |
| Trace-file collisions | Every artifact namespaced by `runId`, written to S3 / Object Storage |
| Unbounded context growth | **Rolling Window**: Only last 3 DOM snapshots kept; older steps summarized |
| Undefined `select_dropdown` | 1:1 schema-to-executor contract test covering native `<select>` and ARIA comboboxes |
| Shallow health check | **Real Preflight**: Headless load, networkidle wait, JS error capture, empty body check |
| Groq single point of failure | **LLM Provider Adapter**: Transparent provider chain with fallback |

---

## Directory Structure

```
.
├── docker-compose.yml       # Postgres (5432), Redis (6379), MinIO S3 (9000)
├── package.json             # Root monorepo workspace manifest
├── .env.example             # Multi-provider environment configuration
├── universal-qa-agent-architecture-v2.md
└── packages/
    ├── shared/              # Tool schemas, contract definitions, domain types
    ├── api/                 # Fastify API Gateway & Ingress Guard SSRF defense
    ├── worker/              # Playwright execution engine & preflight checker
    └── dashboard/           # Next.js 14 Web UI with live SSE step streaming
```

---

## Quick Start

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

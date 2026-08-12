# Universal Web Agent QA Platform — Architecture v2

This revises the original design to fix five concrete problems it had — SSRF exposure, trace-file collisions under concurrency, unbounded context growth, an undefined tool (`select_dropdown`), and shallow health checks — and adds the operational layers a multi-tenant system actually needs: isolation, observability, cost control, and provider portability.

---

## 1. What changed and why

| Problem in v1 | Fix in v2 |
|---|---|
| Any user-supplied URL is fetched server-side and browsed → SSRF risk | URL allow/deny-list + private-IP/link-local blocking at the **Ingress Guard**, before any job is queued |
| `trace.zip` hardcoded → concurrent jobs overwrite each other | Every artifact namespaced by `runId`, written to object storage, never local disk |
| Full ARIA snapshot appended to messages every step → context blows up on long/complex pages | Rolling window: only last N snapshots kept; older steps summarized to one line each |
| `select_dropdown` documented but never implemented | All 6 tools implemented 1:1 between schema and executor, enforced by a contract test |
| Preflight = "did the URL return <400" → misses SPAs that 200 but never render | Preflight does a real headless load: wait for network-idle, check for a console/JS error, screenshot the result |
| Groq hardcoded, no fallback | LLM calls go through a provider adapter so you can fall back to a second model on rate-limit/outage |
| No resource/job isolation | Each run gets its own browser context in its own worker container, killed on timeout, no shared state across tenants |

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD (Next.js)                                                        │
│  URL + prompt input → job submitted → SSE stream of live steps → artifacts  │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │ POST /jobs
┌───────────────────────────────▼───────────────────────────────────────────┐
│  API GATEWAY (Fastify)                                                      │
│  ├─ AuthN/AuthZ (per workspace)                                            │
│  ├─ INGRESS GUARD  ← new: SSRF / URL validation happens HERE, pre-queue    │
│  ├─ Rate limiter (per workspace, per target domain)                        │
│  └─ Job Registrar → Postgres (job metadata) + Redis (queue)                │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │ enqueue
┌───────────────────────────────▼───────────────────────────────────────────┐
│  QUEUE (BullMQ / Redis)                                                     │
│  ├─ Per-target-domain concurrency cap (don't hammer one site)              │
│  └─ Priority lanes (interactive/dashboard runs vs scheduled/batch runs)    │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │ pull job
┌───────────────────────────────▼───────────────────────────────────────────┐
│  WORKER POOL (containerized, autoscaled)                                    │
│  One job = one disposable container = one browser context. No sharing.     │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │ PREFLIGHT: real render check (not just HTTP status)                │    │
│  │ AGENT LOOP: ARIA snapshot → LLM Adapter → tool call → execute       │    │
│  │ CONTEXT MANAGER: rolling snapshot window, step summarization        │    │
│  │ RETRY/RECOVERY: alternate locator strategies on action failure      │    │
│  │ ARTIFACT WRITER: trace, screenshots, action log → object storage    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────────────┐
│ Postgres       │      │ Object Storage    │      │ LLM PROVIDER ADAPTER │
│ jobs, runs,    │      │ (S3-compatible)   │      │ Groq → fallback →    │
│ step history,  │      │ trace.zip,        │      │ Anthropic/OpenAI     │
│ fitness score  │      │ screenshots,      │      │ (interface-based)    │
└───────────────┘      │ generated .spec   │      └──────────────────────┘
                        └──────────────────┘
```

Key structural change from v1: **Redis is queue-only.** All durable state (job status, run history, artifacts) lives in Postgres + object storage. This means a worker crash or Redis restart doesn't lose test history — v1 didn't specify a durable store at all, which is a problem the moment you want to show a customer "here's your test history."

---

## 3. Ingress Guard (new layer — closes the SSRF gap)

Runs **before** a job is queued, not as part of the agent's preflight:

```typescript
// api/src/security/ingressGuard.ts
import { isIP } from 'net';
import dns from 'dns/promises';

const BLOCKED_RANGES = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
  '127.0.0.0/8', '169.254.0.0/16', '::1/128', 'fc00::/7'
];

export async function validateTargetUrl(rawUrl: string): Promise<{ ok: boolean; reason?: string }> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return { ok: false, reason: 'Malformed URL' }; }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: 'Only http/https allowed' };
  }

  // Resolve DNS ourselves — don't trust the hostname string alone,
  // since it can resolve to an internal address at request time (DNS rebinding).
  const addresses = await dns.resolve(url.hostname).catch(() => []);
  for (const addr of addresses) {
    if (isPrivateOrLinkLocal(addr)) {
      return { ok: false, reason: `Target resolves to a non-routable address (${addr})` };
    }
  }

  return { ok: true };
}
```

The worker's browser process should also run with **no route to internal networks** (separate egress network namespace / firewall rule at the container level), so even a redirect-based bypass of the DNS check still can't reach internal infra. Belt and suspenders — app-layer check + network-layer isolation.

---

## 4. Tool contract enforcement (closes the `select_dropdown` gap)

Instead of hand-maintaining the schema array and the `if/elif` executor separately (where they can drift, as in v1), define tools once and derive both:

```typescript
// agent/tools.ts
export const TOOL_DEFS = {
  navigate_to:      { params: { url: 'string' }, handler: 'navigateTo' },
  click_element:    { params: { role: 'string', name: 'string' }, handler: 'clickElement' },
  fill_input:       { params: { label: 'string', value: 'string' }, handler: 'fillInput' },
  select_dropdown:  { params: { label: 'string', option: 'string' }, handler: 'selectDropdown' },
  assert_condition: { params: { assertion_type: 'string', expected_value: 'string' }, handler: 'assertCondition' },
  finish_test:      { params: { summary: 'string' }, handler: 'finishTest' },
} as const;
```

A startup contract test asserts every key in `TOOL_DEFS` has a matching handler function, and every handler function has a matching tool def — so a mismatch fails CI instead of failing silently at runtime on whatever page happens to need a dropdown.

`select_dropdown` implementation:

```python
elif fn_name == "select_dropdown":
    locator = page.get_by_label(args["label"])
    if locator.evaluate("el => el.tagName") == "SELECT":
        locator.select_option(label=args["option"])
    else:
        # ARIA combobox pattern: click to open, then click the option by role
        locator.click()
        page.get_by_role("option", name=args["option"]).click(timeout=5000)
    result = f"Selected '{args['option']}' in '{args['label']}'"
```

---

## 5. Context management (closes the unbounded-growth gap)

v1 appended every ARIA snapshot to the message list forever. v2 keeps a **rolling window**:

```python
MAX_FULL_SNAPSHOTS = 3

def trim_context(messages, max_full=MAX_FULL_SNAPSHOTS):
    """Keep the system prompt, the original goal, and only the last N
    full snapshots. Older snapshot messages get collapsed to a one-line
    summary of what action was taken, not the full DOM tree."""
    snapshot_indices = [i for i, m in enumerate(messages) if m.get("_type") == "snapshot"]
    for i in snapshot_indices[:-max_full]:
        messages[i] = {
            "role": "user",
            "content": f"[Step {messages[i]['_step']} snapshot summarized: action taken was {messages[i]['_action_taken']}]"
        }
    return messages
```

This bounds token usage regardless of how many steps a test takes, and it means cost scales with test complexity per-step, not with total step count.

---

## 6. Real preflight (closes the shallow health-check gap)

```typescript
// worker/preflight.ts — runs inside the actual browser context, not via axios
export async function realPreflight(page: Page, url: string) {
  const consoleErrors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  if (!response || response.status() >= 400) {
    return { ok: false, category: 'TARGET_UNREACHABLE', detail: `HTTP ${response?.status()}` };
  }
  if (consoleErrors.length > 0) {
    return { ok: false, category: 'APP_RENDER_ERROR', detail: consoleErrors.slice(0, 3) };
  }
  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (bodyText.trim().length < 20) {
    return { ok: false, category: 'APP_RENDER_ERROR', detail: 'Page rendered empty body' };
  }
  return { ok: true };
}
```

This catches the class of failure v1's `axios.get()` preflight structurally can't: a 200-status SPA that fails to hydrate.

---

## 7. LLM provider adapter (removes the Groq lock-in / single point of failure)

```typescript
interface LLMProvider {
  complete(messages: Message[], tools: ToolDef[]): Promise<AgentResponse>;
}

class ProviderChain implements LLMProvider {
  constructor(private providers: LLMProvider[]) {}
  async complete(messages, tools) {
    for (const provider of this.providers) {
      try { return await provider.complete(messages, tools); }
      catch (e) {
        if (isRateLimitOrOutage(e)) continue; // try next provider
        throw e;
      }
    }
    throw new Error('All LLM providers exhausted');
  }
}
```

This turns "Groq rate limit → whole job dies" (v1's Layer 3 problem, listed but never actually solved) into "Groq rate limit → transparently retried on the fallback model."

---

## 8. Isolation and lifecycle

- **One job = one container = one browser context.** No pooling browser contexts across tenants — cheap to spin up disposable Playwright containers, expensive to debug a cross-tenant state leak.
- **Hard timeout** at the container level (not just the `step < 15` loop guard), so a hung `page.get_by_text().is_visible()` can't wedge a worker slot forever.
- **`try/finally`** around the whole agent loop so `context.tracing.stop()` and `browser.close()` always run, including on uncaught exceptions — v1 only handled failures inside individual tool calls, not loop-level exceptions.
- **`headless` driven by env var**, defaulting to `true` in worker containers, `false` only in a local dev profile.

---

## 9. Artifact and failure taxonomy (kept from v1, made durable)

Same three failure domains as v1's Layer 3 table, but every run's classification is written to Postgres (queryable, trendable) instead of only surfaced as a UI pill:

- 🟢 **PASSED**
- 🟠 **APP_DEFECT** — target app misbehaved
- 🔴 **INFRA_ERROR** — worker/queue/timeout issue
- 🟡 **RECOVERED** — action failed, alternate locator succeeded (renamed from "self-healed" — it's LLM-driven retry against a fresh snapshot, not literal self-repair, so the label shouldn't overpromise)

Storing this over time is what lets you build the **Agent Fitness Score** from the original spec as an actual trend line (accuracy vs. DOM complexity, per target) instead of a one-off metric.

---

## 10. What this buys you over v1

- Can't be pointed at internal infrastructure (SSRF closed at ingress, not left to the agent's own preflight).
- Concurrent jobs can't clobber each other's artifacts.
- Long/complex test runs don't silently balloon token cost or hit context limits.
- Every documented tool actually works.
- A single Groq outage or rate-limit doesn't fail the run.
- Job history survives a Redis restart.
- "Is the app actually broken or did it just not render" is answered by the preflight itself, not left to the LLM to figure out mid-run.

# dagskra-mcp

Remote MCP server exposing the broadcast schedule (dagskrá) of Icelandic TV channels.
Runs on a Cloudflare Worker, intended to be served at **dagskra.9z.is**. Clients connect
over the internet — no local install.

## Status
- **Phase 1 (in progress):** RÚV (+ RÚV 2) and Sýn family, on their official feeds.
- **Skipped for now:** Sjónvarp Símans (no clean public feed — see "Data sources").
- **Local-dev only:** no Cloudflare deploy yet; develop against `wrangler dev` + tests.

## Architecture
```
Cron (daily 05:00 UTC) ─▶ source adapters ─▶ normalize ─▶ KV cache ─▶ McpAgent (/mcp)
```
- `src/index.ts` — Worker entry: routes `/mcp`, `/health`; `scheduled()` runs the cron.
- `src/mcp.ts` — `DagskraMCP extends McpAgent` (Cloudflare Agents SDK). Tools + resources.
- `src/cache.ts` — KV read with fetch-on-miss; `refreshAll()` warms the forward window.
- `src/sources/{ruv,syn}.ts` — fetch + parse one source into `Program[]` (`src/schema.ts`).
- `src/channels.ts` — the channel registry (id → source + upstream slug).
- MCP reads the **cache only** (via `getSchedule`), so query latency is decoupled from
  the sometimes-flaky upstreams.

## Tools & resources
- Tools: `list_channels`, `get_schedule(channel, date?)`, `whats_on(channel, at?)`,
  `search_programs(query, days?, channels?)`.
- Resources: `dagskra://channels` (catalog) and template `dagskra://schedule/{channel}/{date}`.

## Data sources (verified 2026-05-23)
- **RÚV** — `https://muninn.ruv.is/files/xml/{slug}/{from}/{to}/` (official XML). Slugs:
  `ruv`, `ruv2` (TV); `ras1`, `ras2` (radio, unused). Times are Icelandic local = **UTC**.
- **Sýn / Stöð 2** — `https://www.syn.is/api/epg/{slug}/{YYYY-MM-DD}` (JSON, Vercel-hosted
  scraper — can 504). Working slugs: `syn`, `synsport`; `synsport2/3/4` documented.
  **`stod2`/`stod2bio`/... 504'd — correct Stöð 2 slugs still unknown** (sniff
  syn.is/sjonvarp/dagskra network calls to find them).
- **Do not use:** `apis.is/tv` (dead SSL), `api.stod2.is` (404, old host).

## Commands
- `npm test` — vitest (offline, deterministic parser tests).
- `npm run type-check` — `tsc --noEmit`.
- `npm run dev` — `wrangler dev` (local KV simulation).
- Test the MCP without loading it into a chat: hit `/mcp` over JSON-RPC with curl, or
  `npx @modelcontextprotocol/inspector http://localhost:8787/mcp`.

## Conventions
- npm/npx (not pnpm/yarn). ESM; imports use `.js` extensions. Keep upstream Icelandic text.
- Surface tradeoffs before fighting a library's conventions; surgical changes only.
- Before deploy: create a real KV namespace and replace the placeholder id in `wrangler.jsonc`.

> Persistent cross-session notes live in the agent memory dir (see MEMORY.md there):
> user profile, project decisions, the full data-source dossier, and the agentic workflow.

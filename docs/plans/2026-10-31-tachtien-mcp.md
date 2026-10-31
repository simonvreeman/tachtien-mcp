# Tachtien MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A stateless MCP server at `https://mcp.tachtien.nl/mcp` with five tools and one resource over the tachtien.nl dictionary entry.

**Architecture:** One Cloudflare Worker. `src/worker.js` routes `/` (info page) and `/mcp` (MCP via `createMcpHandler`). Content is static data in `src/entry.js`; the playful logic is pure functions in `src/playful.js`; `src/mcp.js` only wires them to tools. See `2026-10-31-tachtien-mcp-design.md`.

**Tech Stack:** Vanilla JS (ESM, no build), `agents`, `@modelcontextprotocol/server` v2, `zod` 4, `wrangler`, `vitest` + `@cloudflare/vitest-plugin`. Same stack and idiom as `~/Documents/GitHub/seo`.

---

### Task 1: Scaffold

**Files:**
- Create: `package.json`, `wrangler.jsonc`, `vitest.config.js`, `src/worker.js` (404 stub)

**Steps:**
1. `package.json`: `"type": "module"`, scripts `dev`, `deploy`, `test` (`vitest run`), `check:drift` (`node scripts/check-drift.mjs`). Deps: `agents`, `@modelcontextprotocol/server`, `zod`. Dev: `wrangler`, `vitest`, `@cloudflare/vitest-plugin`.
2. `wrangler.jsonc`: name `tachtien-mcp`, `main: src/worker.js`, `compatibility_date: 2026-10-01`, `nodejs_compat`, `workers_dev: false`, `preview_urls: false`, `routes: [{ pattern: "mcp.tachtien.nl", custom_domain: true }]`, observability on.
3. `vitest.config.js`: `cloudflareTest({ miniflare: { compatibilityDate, compatibilityFlags } })`.
4. `npm install`; confirm `npx vitest run` starts (no tests yet) and `createMcpHandler` is exported from `agents/mcp/server`.
5. Commit: `Scaffold Worker project`.

### Task 2: Entry data

**Files:**
- Create: `src/entry.js`, `test/entry.test.js`

**Step 1: Failing test** — `entry` has word `tachtien`, IPA `tɑxtin`, definition `Ontelbaar veel.`; 2 examples; 14 mentions (4 twitter, 4 press, 6 cityguys) each with `title`, `source`, `url` (http(s) or `null`); `entryMarkdown()` starts with `# tach·tien` and contains every example line and mention title.
**Step 2:** run, expect FAIL (module not found).
**Step 3:** implement `entry` (frozen object) and `entryMarkdown()`.
**Step 4:** run, expect PASS. **Step 5:** commit `Add the dictionary entry as data`.

### Task 3: tachtienify

**Files:**
- Create: `src/playful.js`, `test/playful.test.js`

**Step 1: Failing tests:**
- `tachtienify("Ik heb heel veel bier gedronken")` → `{ text: "Ik heb tachtien bier gedronken", replacements: 1 }`
- `"Honderden mensen en a lot of beers"` → `"Tachtien mensen en tachtien beers"`, 2
- `"Thousands of reasons"` → `"Tachtien reasons"`
- `"tigmaal"` and `"80 biertjes"` unchanged, 0 (whole words only; numbers are counted)
- longest phrase wins: `"ontelbaar veel"` → `"tachtien"`, not `"ontelbaar tachtien"`
**Steps 2–4:** fail, implement one regex built from the phrase list sorted longest first with `\b`-style Unicode-aware boundaries, `gi`, capitalise when the match starts uppercase; pass.
**Step 5:** commit `Add tachtienify`.

### Task 4: isTachtien

**Files:**
- Modify: `src/playful.js`, `test/playful.test.js`

**Step 1: Failing tests:**
- `isTachtien(18)` and `"18"` → `isTachtien: false`, reason mentions `achttien`
- `isTachtien(80)` → false, reason mentions `tachtig`
- `isTachtien(3)` → false, reason says it was counted
- `isTachtien(Infinity)`, `"Infinity"`, `"heel veel"`, `"Tachtien"`, `"geen idee"`, `"te veel om te tellen"` → true
- `isTachtien("een paar")` → false
**Steps 2–4:** fail, implement (vague check reuses the tachtienify phrase list), pass.
**Step 5:** commit `Add isTachtien`.

### Task 5: MCP server

**Files:**
- Create: `src/mcp.js`, `test/mcp.test.js`

**Step 1: Failing tests** (same `rpc`/`parse` helpers as `seo/test/mcp.test.js`):
- `initialize` → 200; `tools/list` → `["define","examples","is_tachtien","mentions","tachtienify"]`
- `define` → JSON with `ipa: "tɑxtin"`
- `examples` with `random: true` → exactly one example
- `mentions` with `source: "press"` → 4 items, all `source: "press"`
- `tachtienify` → replaced text; `text: ""` → `isError` with `Input validation error`
- `is_tachtien` with `amount: 18` → `isTachtien: false`
- `resources/list` contains `tachtien://entry`; `resources/read` returns `text/markdown`
**Steps 2–4:** fail, implement `handleMcp(request, env, ctx)` with module-scope `TOOLS`, `text()`/`toolError()` helpers and a per-request `McpServer` with `CfWorkerJsonSchemaValidator`; pass.
**Step 5:** commit `Add MCP server with tools and entry resource`.

### Task 6: Worker routing

**Files:**
- Modify: `src/worker.js`; Create: `test/worker.test.js`

**Step 1: Failing tests:** `GET /` → 200 `text/html` containing `https://mcp.tachtien.nl/mcp`; `HEAD /` → 200; `POST /mcp` tools/list → 200; `GET /nope` → 404; trailing slash `/mcp/` routes to MCP.
**Steps 2–4:** fail, implement, pass. **Step 5:** commit `Route / and /mcp`.

### Task 7: Drift check, docs, local verification

**Files:**
- Create: `scripts/check-drift.mjs`, `README.md`, `CLAUDE.md`

1. `check-drift.mjs`: fetch `https://tachtien.nl/`, decode `&middot;` etc., check definition, IPA, each example line and each mention URL appear; exit 1 listing what is missing.
2. Run `npm run check:drift`; expect `OK`.
3. `wrangler dev`; `curl` initialize, tools/list and a tools/call against `http://localhost:8787/mcp`.
4. README (what, endpoint, client config, commands) and CLAUDE.md (in the `seo` style).
5. Commit `Add drift check and docs`.

Deploy (`npm run deploy`) and `gh repo create` only after the user says so.

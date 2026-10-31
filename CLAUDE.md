# Tachtien MCP

Stateless MCP server for the word *tachtien* (ontelbaar veel) on one Cloudflare Worker. Content mirrors https://tachtien.nl, whose static site lives in the separate repo `~/Documents/GitHub/tachtien`.

**Live**: https://mcp.tachtien.nl/mcp (custom domain `mcp.tachtien.nl`, Worker `tachtien-mcp`)

## Commands

```bash
npm install
npm run dev            # wrangler dev at http://localhost:8787
npm test               # vitest in workerd (@cloudflare/vitest-plugin)
npm run check:drift    # src/entry.js vs the live tachtien.nl; exits 1 on drift
npm run deploy         # wrangler deploy
```

## Architecture

```
mcp.tachtien.nl  →  src/worker.js
  GET|HEAD /    inline HTML info page
  *        /mcp src/mcp.js (createMcpHandler from agents/mcp/server, stateless)
  else          404
```

**Key files:**
- `src/entry.js` — the dictionary entry as frozen data, `entryMarkdown()`. Only content source.
- `src/playful.js` — `tachtienify(text)`, `isTachtien(amount)`; pure, no MCP imports. `VAGUE_AMOUNTS` drives both.
- `src/mcp.js` — tool schemas and descriptions at module scope; `createServer()` registers five read-only tools and resource `tachtien://entry`.
- `scripts/check-drift.mjs` — Node script, not a test, so `npm test` never hits the network.

## Code style

- Vanilla JS, ESM, no TypeScript, no build step. Same stack and idiom as `~/Documents/GitHub/seo`.
- Runtime deps: `agents`, `@modelcontextprotocol/server`, `zod`. Dev: `wrangler`, `vitest`, `@cloudflare/vitest-plugin`.
- JSDoc on exported functions. Tool descriptions in English, content and `is_tachtien` reasons in Dutch.
- Tests in `test/`, one file per module.

## Gotchas

- **Change the site first, then `entry.js`.** After editing tachtien.nl, update `entry.js` and run `npm run check:drift`; tests pin counts (2 examples, 14 mentions: 4 twitter, 4 press, 6 cityguys).
- **`createMcpHandler` takes a factory** (`() => McpServer`). Passing a server instance selects the deprecated SDK v1 path.
- **Every tool has an `outputSchema`** and returns `structuredContent` plus the same data as JSON text. The SDK validates the result against the schema, so a new field in `entry.js` must be added to the schema too.
- **Exact numbers are never tachtien**, by design: `tachtienify` leaves digits alone and `is_tachtien` answers false for any finite number.
- **Invalid tool input is a tool error** (`isError: true`, "Input validation error ..."), not a JSON-RPC error; the SDK validates before the tool body runs.

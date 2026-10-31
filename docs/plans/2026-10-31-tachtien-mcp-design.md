# Tachtien MCP at mcp.tachtien.nl

**Date:** 2026-10-31
**Status:** Approved

## Goal

An MCP server that lets AI assistants look up the word *tachtien* as it is
defined on https://tachtien.nl (definition, pronunciation, origin, examples,
external mentions), plus two playful tools that apply the word.

## Decisions

- **Separate Worker, separate repo** `~/Documents/GitHub/tachtien-mcp`, not a
  Pages Function in the site repo. The site stays a dependency-free static page.
- **Custom domain** `mcp.tachtien.nl`, endpoint `https://mcp.tachtien.nl/mcp`.
  `/` answers a small HTML page that points to the endpoint and the site.
- **Stateless MCP** via `createMcpHandler` from `agents`, `McpServer` from
  `@modelcontextprotocol/server`, like the `seo` Worker. No Durable Object, no
  storage, no secrets, no auth: every request builds a server over static data.
- **Vanilla JS, ESM, no TypeScript, no build step**, matching the other Workers.
- **Content is data in `src/entry.js`**, copied from the site's `index.html`.
  Tool descriptions are English (models choose tools better), content is Dutch
  as on the site.
- **Drift check is a script, not a test.** `npm run check:drift` fetches the
  live tachtien.nl and fails when a line of `entry.js` no longer appears there.
  `npm test` never touches the network.

Rejected: a Pages Function at `tachtien.nl/mcp` (would add a `package.json` and
build to the static site); a hand-written JSON-RPC handler (protocol drift
becomes our problem); `McpAgent` with Durable Objects (state we do not need);
a rate limiter (static data, nothing expensive to protect).

## Architecture

```
mcp.tachtien.nl  →  src/worker.js
  GET  /       small HTML page: what this is, endpoint URL, link to tachtien.nl
  *    /mcp    src/mcp.js (createMcpHandler, stateless)
  else         404

src/entry.js    the dictionary entry: word, pronunciation, definition, origin, examples, mentions
src/playful.js  tachtienify(text), isTachtien(amount): pure functions, no MCP imports
src/mcp.js      registers tools and the resource over entry.js and playful.js
```

## Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `define` | none | word, syllables `tach·tien`, part of speech `hoofdtelwoord`, IPA `tɑxtin`, definition `Ontelbaar veel.`, origin (who, when, links), site URL |
| `examples` | `random?: boolean` | the example dialogues; one at random when `random` is true |
| `mentions` | `source?: "twitter" \| "press" \| "cityguys"` | external mentions with title, source and URL (`null` for the Cityguys jury report, which has no link) |
| `tachtienify` | `text: string` (1–5000 chars) | the text with vague large amounts replaced by *tachtien*, plus the number of replacements |
| `is_tachtien` | `amount: string \| number` | `{ isTachtien, reason }` with a tongue-in-cheek Dutch reason |

Resource `tachtien://entry` (text/markdown): the whole entry as one Markdown
document, for clients that read resources instead of calling tools.

### tachtienify

Replaces vague large quantities, Dutch and English, with `tachtien`:
`heel veel`, `ontzettend veel`, `enorm veel`, `ontelbaar veel`, `superveel`,
`een heleboel`, `een hoop`, `talloze`, `tig`, `honderden`, `duizenden`,
`miljoenen`, `a lot of`, `lots of`, `loads of`, `tons of`, `countless`,
`umpteen`, `a gazillion`, `a zillion`, `hundreds of`, `thousands of`,
`millions of`. Whole words only, case-insensitive; a capitalised match becomes
`Tachtien`. Exact numbers are left alone: they were counted, so they are not
tachtien.

### is_tachtien

Tachtien means *ontelbaar veel*, so:

- Anything you can state as an exact number was counted, so it is not tachtien
  (`18` is achttien, `80` is tachtig, each with its own reason).
- Vague amounts (the `tachtienify` list, `tachtien` itself, `ontelbaar`,
  `te veel om te tellen`, `geen idee`, `Infinity`) are tachtien.
- Anything else is not, with a reason that says so.

## Errors

Input validation is the SDK's job (schemas in zod); it answers with a tool
error, not a JSON-RPC error. Tool bodies are pure and cannot fail on valid
input; an unexpected exception is logged and returned as a generic tool error.

## Testing

`vitest` in workerd via `@cloudflare/vitest-plugin`, one file per module:
`playful.test.js` (replacement and judgement rules), `mcp.test.js` (initialize,
tools/list, each tool through tools/call, resources/read, validation errors),
`worker.test.js` (routing: `/`, `/mcp`, 404). Then a local `wrangler dev` with
real JSON-RPC calls before any deploy.

## Deploy

`wrangler deploy` with `routes: [{ pattern: "mcp.tachtien.nl", custom_domain: true }]`
creates DNS and certificate, provided the `tachtien.nl` zone is in the same
Cloudflare account. Deploying and creating the GitHub repo are separate,
explicit steps after the local version works.

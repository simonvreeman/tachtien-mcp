# Tachtien MCP

An MCP server for the Dutch word [tachtien](https://tachtien.nl): *ontelbaar
veel*, uncountably many. Look up the word, its examples and mentions, rewrite
vague amounts as tachtien, or ask whether something counts as tachtien.

**Endpoint:** `https://mcp.tachtien.nl/mcp` (Streamable HTTP, stateless, no auth)
**Server card:** [`/.well-known/mcp/server-card.json`](https://mcp.tachtien.nl/.well-known/mcp/server-card.json)

## Connect

```bash
claude mcp add --transport http tachtien https://mcp.tachtien.nl/mcp
```

## ChatGPT

In ChatGPT on the web: open **Plugins**, choose **+** and then **Add custom
MCP server**. Name it, for example, `Tachtien`, enter
`https://mcp.tachtien.nl/mcp` as the endpoint, choose no authentication and
finish creating it. Then install the plugin and use `@Tachtien` in a new chat.

Whether you can add your own MCP servers depends on your ChatGPT plan and your
workspace settings.

## Other compatible MCP clients

```json
{ "mcpServers": { "tachtien": { "type": "http", "url": "https://mcp.tachtien.nl/mcp" } } }
```

## Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `define` | none | syllables, part of speech, IPA, definition, origin |
| `examples` | `random?: boolean` | example dialogues, or one at random |
| `mentions` | `source?: "twitter" \| "press" \| "cityguys"` | external mentions with title, source and URL |
| `tachtienify` | `text: string` | text with vague large amounts replaced by *tachtien*, and the count |
| `is_tachtien` | `amount: number \| string` | `{ isTachtien, reason }` |

Resource `tachtien://entry` is the whole entry as Markdown. Content is Dutch,
as on the site; tool descriptions are English.

```bash
curl -s https://mcp.tachtien.nl/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tachtienify","arguments":{"text":"heel veel kopstootjes"}}}'
```

## Develop

```bash
npm install
npm run dev           # wrangler dev at http://localhost:8787 (MCP at /mcp)
npm test              # vitest in workerd
npm run check:drift   # compare src/entry.js with the live tachtien.nl
npm run deploy        # wrangler deploy to mcp.tachtien.nl
```

The first deploy creates the `mcp.tachtien.nl` DNS record and certificate,
provided the `tachtien.nl` zone is in the same Cloudflare account.

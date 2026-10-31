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
| `tachtienify` | `text: string` | text with vague large amounts and estimates of 20 or more replaced by *tachtien*, the count, and each replaced phrase with its index |
| `is_tachtien` | `amount: number \| string` | `{ isTachtien, reason }` |

Estimates ("ongeveer honderd", "zo'n 30", "~200", "100+") are tachtien from
20 up, because nobody counted them. Exact numbers, smaller estimates and
years ("rond 2014") are not.

## Prompts

| Prompt | Arguments | What it does |
| --- | --- | --- |
| `uitleg` | `taal?: "Nederlands" \| "English"` | explains the word, with the entry embedded |
| `herschrijf` | `tekst: string` | runs `tachtienify` on the server, then asks the model to fix the grammar |
| `zin` | `onderwerp?: string` | asks for a new example sentence in the style of the site |

`taal` and `onderwerp` support `completion/complete`.

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

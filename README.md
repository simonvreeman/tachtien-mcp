# Tachtien MCP

[![M8ven Score](https://m8ven.ai/badge/mcp/simonvreeman-tachtien-mcp-1sqwbn?v=f29c77532839c08436d8a1300bcdd3d7)](https://m8ven.ai/mcp/simonvreeman-tachtien-mcp-1sqwbn?s=readme)

An MCP server for the Dutch word [tachtien](https://tachtien.nl): *ontelbaar
veel*, uncountably many. Look up the word, its examples and mentions, rewrite
vague amounts as tachtien, or ask whether something counts as tachtien.

**Endpoint:** `https://mcp.tachtien.nl/mcp` (Streamable HTTP, stateless, no auth)
**Server card:** [`/.well-known/mcp/server-card.json`](https://mcp.tachtien.nl/.well-known/mcp/server-card.json)

## Connect

```bash
claude mcp add --transport http tachtien https://mcp.tachtien.nl/mcp
```

## Cursor

Add this to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for all
projects:

```json
{
  "mcpServers": {
    "tachtien": { "url": "https://mcp.tachtien.nl/mcp" }
  }
}
```

## ChatGPT

In ChatGPT on the web: open **Plugins**, choose **+** and then **Add custom
MCP server**. Name it, for example, `Tachtien`, enter
`https://mcp.tachtien.nl/mcp` as the endpoint, choose no authentication and
finish creating it. Then install the plugin and use `@Tachtien` in a new chat.

Whether you can add your own MCP servers depends on your ChatGPT plan and your
workspace settings. See the [official ChatGPT setup guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) for current steps.

## Other compatible MCP clients

```json
{ "mcpServers": { "tachtien": { "type": "http", "url": "https://mcp.tachtien.nl/mcp" } } }
```

## Examples

Ask Claude, or any MCP client, things like these. The answers are in Dutch,
like the content.

- **"What does the Dutch word tachtien mean, how do you pronounce it, and where
  does it come from?"** uses `define`: *ontelbaar veel*, IPA `tɑxtin`, a slip
  of the tongue from 2014, with sources.
- **"Rewrite this message with tachtien: 'Gisteren heel veel kopstootjes
  gedronken met ongeveer honderd man, en vandaag 3 aspirines.'"** uses
  `tachtienify`: "Gisteren tachtien kopstootjes gedronken met tachtien man, en
  vandaag 3 aspirines." The exact 3 stays, because it was counted.
- **"I have more than 50 unread emails. Does that count as tachtien? And what
  about exactly 80?"** uses `is_tachtien`: more than 50 is tachtien, because
  nobody counted; 80 is not, that is *tachtig*.
- **"Where has tachtien been mentioned in the press?"** uses `mentions` with
  `source: "press"`: four articles with links.

## Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `define` | none | syllables, part of speech, IPA, definition, origin |
| `examples` | `random?: boolean` | example dialogues, or one at random |
| `mentions` | `source?: "twitter" \| "press" \| "cityguys"` | external mentions with title, source and URL |
| `tachtienify` | `text: string` | text with vague large amounts and estimates of 50 or more replaced by *tachtien*, the count, and each replaced phrase with its index |
| `is_tachtien` | `amount: number \| string` | `{ isTachtien, reason }` |

Estimates ("ongeveer honderd", "zo'n 60", "~200", "100+") and lower bounds
("meer dan 50", "ruim honderd") are tachtien from 50 up, because nobody
counted them. Exact numbers, smaller estimates and
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

## Author

Made by [Simon Vreeman](https://vreeman.com).

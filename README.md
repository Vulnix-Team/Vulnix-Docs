# Vulnix Docs

The public documentation site for [Vulnix](https://vulnix.dev), served at
`docs.vulnix.dev`. A standalone Next.js + [Fumadocs](https://fumadocs.dev)
app, deployed as its own Vercel project so every path is clean (no `/docs`
prefix) - it's vendored into the main `Vulnix` repo as a git submodule at
`vulnix-docs/`.

## Local dev

```bash
npm install
npm run dev
```

## Structure

- `content/` - the actual documentation, as MDX + `meta.json` sidebar config.
- `app/[[...slug]]/page.tsx` - renders every doc page from `content/`.
- `app/api/search` - the search index (`fumadocs-core`'s `createFromSource`).
- `app/api/markdown/[[...slug]]` - serves a page's raw Markdown, used by the
  "Copy Markdown" / "Open in ChatGPT" etc. page actions.
- `lib/source.ts` - the Fumadocs loader, `baseUrl: "/"` (root - this app has
  nothing else running in it, unlike the client/marketing app it's split
  out from).

## Editing content

Edit the `.mdx` files under `content/` directly, or use the "Open in GitHub"
action on any live doc page to jump straight to its source file here.

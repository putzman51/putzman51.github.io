# falling spoon

Poems by Robert (Bob) Corrigan — https://fallingspoon.com

## Adding a poem
Paste a new block at the top of `POEMS` in `index.html`, same as always.

When you push, the **Build poem pages** GitHub Action runs `tools/build.mjs`, which
creates a real page for every poem at `/poems/<title>/`, the `/poems/` archive, and
`sitemap.xml`, then commits them. Those pages are what Google and AI search read,
so don't edit files in `poems/` by hand — they're rebuilt every time.

// Builds crawlable pages from the POEMS list in index.html.
//
// You never need to run this by hand: a GitHub Action runs it every time
// index.html changes and commits the results. Keep adding poems to the top
// of POEMS in index.html exactly as before.
//
// Output:
//   poems/<slug>/index.html   one real page per poem (its own URL)
//   poems/index.html          archive of every poem
//   sitemap.xml               every page, for Google Search Console
//
// Run locally (optional):  node tools/build.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://fallingspoon.com';

const AUTHOR = {
  '@type': 'Person',
  '@id': 'https://bobcorrigan.com/#person',
  name: 'Robert Corrigan',
  alternateName: 'Bob Corrigan',
  url: 'https://bobcorrigan.com/',
};

// ── read POEMS out of index.html ────────────────────────────────
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = indexHtml.match(/const POEMS = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error('Could not find "const POEMS = [ ... ];" in index.html');
const POEMS = vm.runInNewContext(m[1]);

// ── helpers ─────────────────────────────────────────────────────
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = (s) => s.toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/['’"“”]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';

const clean = (body) => body.replace(/^\n+|\n+$/g, '');

const excerpt = (body, n = 150) => {
  const flat = clean(body).replace(/\s+/g, ' ').trim();
  return flat.length <= n ? flat : flat.slice(0, n).replace(/\s+\S*$/, '') + '…';
};

const isoDay = (d) => (d ? String(d).slice(0, 10) : '');
const prettyDate = (d) => {
  if (!d) return '';
  const dt = new Date(String(d).slice(0, 10) + 'T12:00:00Z');
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

// stable, unique slugs (a repeated title gets its id appended)
const seen = new Map();
for (const p of POEMS) {
  let s = slugify(p.title);
  if (seen.has(s)) s = `${s}-${p.id}`;
  seen.set(s, true);
  p.slug = s;
  p.url = `${SITE}/poems/${s}/`;
}

// ── shared look (matches index.html) ────────────────────────────
const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Crimson+Text:ital,wght@0,400;1,400&display=swap';

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#f6f4ef;--ink:#2b2825;--ink-soft:#8a847c;--max:560px}
html,body{background:var(--paper)}
body{font-family:'Crimson Text',Georgia,serif;color:var(--ink);font-size:19px;line-height:1.8;padding:0 1.5rem;min-height:100vh;-webkit-font-smoothing:antialiased}
::selection{background:#e4dfd5}
a{color:inherit;text-decoration:none;border-bottom:1px solid transparent;transition:color .2s,border-color .2s}
a:hover,a:focus-visible{border-bottom-color:var(--ink-soft);outline:none}
main{max-width:var(--max);margin:0 auto;padding-top:1.6in;padding-bottom:1.2in}
.top{font-family:'Cormorant Garamond',Georgia,serif;letter-spacing:.08em;color:var(--ink-soft);font-size:1.05rem;margin-bottom:1in}
h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:2rem;font-weight:400;line-height:1.25;margin-bottom:.5rem}
.byline{font-family:'Cormorant Garamond',Georgia,serif;color:var(--ink-soft);font-size:1.05rem;letter-spacing:.04em;margin-bottom:2rem}
.poem-body{white-space:pre-wrap}
.pager{display:flex;justify-content:space-between;gap:1rem;margin-top:1.6in;font-family:'Cormorant Garamond',Georgia,serif;font-size:1.1rem;letter-spacing:.06em;color:var(--ink-soft)}
.list{list-style:none}
.list li{display:flex;justify-content:space-between;gap:1rem;padding:.35rem 0;border-bottom:1px solid #e4dfd5}
.list time{color:var(--ink-soft);font-size:.9em;white-space:nowrap}
.intro{margin-bottom:2.5rem}
footer{max-width:var(--max);margin:0 auto;padding:0 0 3rem;font-family:'Cormorant Garamond',Georgia,serif;color:var(--ink-soft);font-size:1rem;line-height:1.6}
footer p+p{margin-top:.35rem}
`;

const FOOTER = `
<footer>
  <p>falling spoon is the poetry of Robert (Bob) Corrigan, an employer benefits professional, pro disc golfer, poet, and retro film photographer in Redmond, Washington, with two cats and a penchant for vintage RC models.</p>
  <p><a href="https://bobcorrigan.com/">bobcorrigan.com</a> &nbsp;·&nbsp; <a href="https://secretvendingmachine.com/">secret vending machine</a> (film photography) &nbsp;·&nbsp; <a href="https://supfrog.com/">supfrog.com</a></p>
</footer>`;

function page({ title, description, canonical, jsonld, ogType = 'article', body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="Robert Corrigan">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="falling spoon">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${FONTS}" rel="stylesheet">
  <style>${CSS}</style>
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
${body}
${FOOTER}
</body>
</html>
`;
}

// ── one page per poem ───────────────────────────────────────────
const outPoems = path.join(ROOT, 'poems');
fs.rmSync(outPoems, { recursive: true, force: true });
fs.mkdirSync(outPoems, { recursive: true });

POEMS.forEach((p, i) => {
  const newer = POEMS[i - 1];
  const older = POEMS[i + 1];
  const desc = `“${p.title},” a poem by Robert Corrigan. ${excerpt(p.body, 120)}`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${p.url}#poem`,
    genre: 'Poetry',
    name: p.title,
    headline: p.title,
    text: clean(p.body),
    inLanguage: 'en',
    url: p.url,
    datePublished: isoDay(p.date) || undefined,
    author: AUTHOR,
    creator: { '@id': AUTHOR['@id'] },
    isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'falling spoon', url: `${SITE}/` },
  };
  const body = `<main>
  <nav class="top"><a href="/">falling spoon</a> &nbsp;·&nbsp; <a href="/poems/">all poems</a></nav>
  <article>
    <h1>${esc(p.title)}</h1>
    <p class="byline">by <a href="https://bobcorrigan.com/" rel="author">Robert Corrigan</a>${p.date ? ` &nbsp;·&nbsp; <time datetime="${isoDay(p.date)}">${prettyDate(p.date)}</time>` : ''}</p>
    <div class="poem-body">${esc(clean(p.body))}</div>
  </article>
  <nav class="pager">
    <span>${newer ? `<a href="/poems/${newer.slug}/">← ${esc(newer.title)}</a>` : ''}</span>
    <span>${older ? `<a href="/poems/${older.slug}/">${esc(older.title)} →</a>` : ''}</span>
  </nav>
</main>`;
  const dir = path.join(outPoems, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page({
    title: `${p.title} — a poem by Robert Corrigan | falling spoon`,
    description: desc,
    canonical: p.url,
    jsonld,
    body,
  }));
});

// ── archive ─────────────────────────────────────────────────────
const archiveJsonld = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'All poems — falling spoon',
  url: `${SITE}/poems/`,
  author: AUTHOR,
  hasPart: POEMS.map((p) => ({ '@type': 'CreativeWork', genre: 'Poetry', name: p.title, url: p.url })),
};
fs.writeFileSync(path.join(outPoems, 'index.html'), page({
  title: 'All poems by Robert Corrigan | falling spoon',
  description: `Every poem on falling spoon, the poetry of Robert (Bob) Corrigan, a pro disc golfer, poet, and retro film photographer in Redmond, Washington. ${POEMS.length} poems, newest first.`,
  canonical: `${SITE}/poems/`,
  ogType: 'website',
  jsonld: archiveJsonld,
  body: `<main>
  <nav class="top"><a href="/">falling spoon</a></nav>
  <h1>all poems</h1>
  <p class="byline">by <a href="https://bobcorrigan.com/" rel="author">Robert Corrigan</a></p>
  <p class="intro">Poems by Robert (Bob) Corrigan, newest first. Also: <a href="/zine-march-2026.html"><em>sliding in the light</em></a>, a collection of twelve poems from early 2026.</p>
  <ul class="list">
${POEMS.map((p) => `    <li><a href="/poems/${p.slug}/">${esc(p.title)}</a>${p.date ? `<time datetime="${isoDay(p.date)}">${prettyDate(p.date)}</time>` : ''}</li>`).join('\n')}
  </ul>
</main>`,
}));

// ── sitemap ─────────────────────────────────────────────────────
const newest = isoDay(POEMS[0]?.date);
const urls = [
  { loc: `${SITE}/`, lastmod: newest },
  { loc: `${SITE}/poems/`, lastmod: newest },
  { loc: `${SITE}/zine-march-2026.html` },
  ...POEMS.map((p) => ({ loc: p.url, lastmod: isoDay(p.date) })),
];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);

console.log(`Built ${POEMS.length} poem pages, archive, and sitemap.`);

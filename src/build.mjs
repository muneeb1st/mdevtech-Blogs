#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, escapeHtml, formatDate, PUBLIC_DIR, readPosts, ROOT } from './lib.mjs';
import { validatePostCollection, validatePostSeo } from './seo/validator.mjs';

const site = {
  title: 'mdevtech Blogs',
  description: 'Practical AI tools and workflows for students, freelancers, and small local businesses.',
  author: 'muneeb1st',
  baseUrl: usableSiteUrl(process.env.SITE_URL, 'https://mdevtech.vercel.app'),
  image: '/og-default.png',
  googleTagId: usableEnvValue(process.env.GOOGLE_TAG_ID || process.env.GOOGLE_ANALYTICS_ID || process.env.NEXT_PUBLIC_GA_ID || ''),
  googleSiteVerification: usableEnvValue(process.env.GSC_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION || '')
};
const strictSeo = process.argv.includes('--strict') || process.env.STRICT_SEO === '1';

function usableEnvValue(value = '') {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^(YOUR|REPLACE)_/i.test(trimmed)) return '';
  if (/X{6,}/i.test(trimmed)) return '';
  return trimmed;
}

function usableSiteUrl(value, fallback) {
  const candidate = usableEnvValue(value);
  if (!candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return fallback;
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback;
    return parsed.origin.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function layout({ title, description, canonical, body, post }) {
  const articleJsonLd = post ? buildArticleJsonLd(post) : '';
  const faqJsonLd = post?.faq?.length ? buildFaqJsonLd(post) : '';
  const siteJsonLd = !post ? buildSiteJsonLd(canonical) : '';
  const robots = post?.status === 'archived' ? '<meta name="robots" content="noindex, follow">' : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${robots}
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="${post ? 'article' : 'website'}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="${escapeHtml(site.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(site.author)}">
  <meta name="theme-color" content="#0f766e">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/site.webmanifest">
  
  <script>
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="/rss.xml">
  ${renderGoogleTags()}
  ${siteJsonLd}
  ${articleJsonLd}
  ${faqJsonLd}
</head>
<body>
  <header class="site-header">
    <div class="header-container">
      <a class="brand" href="/" aria-label="${escapeHtml(site.title)} home">
        <img class="brand-mark" src="/logo.svg" alt="" width="28" height="28">
        <span>${escapeHtml(site.title)}</span>
      </a>
      <div class="nav-wrapper">
        <nav class="top-nav">
          <a href="/posts/">Posts</a>
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
        </nav>
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
          <svg class="sun-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
          </svg>
          <svg class="moon-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        </button>
      </div>
    </div>
  </header>
  <main>${body}</main>
  <footer class="site-footer">
    <div class="footer-container">
      <div class="footer-brand-section">
        <span class="footer-brand"><img class="footer-mark" src="/logo.svg" alt="" width="24" height="24"> ${escapeHtml(site.title)}</span>
        <p class="footer-tagline">Evergreen AI tools &amp; workflows for students, freelancers, and small businesses.</p>
      </div>
      <div class="footer-links-section">
        <div class="footer-column">
          <h4>Navigation</h4>
          <a href="/">Home</a>
          <a href="/posts/">All Posts</a>
          <a href="/about/">About Us</a>
          <a href="/contact/">Contact</a>
        </div>
        <div class="footer-column">
          <h4>Feeds</h4>
          <a href="/rss.xml">RSS Feed</a>
          <a href="/feed.json">JSON Feed</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${new Date().getFullYear()} ${escapeHtml(site.title)}. Built by ${escapeHtml(site.author)}. Autonomous publication with human-checked quality.</p>
    </div>
  </footer>
  <script>
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
      });
    }
  </script>
</body>
</html>`;
}

function nodeDivider() {
  return `<div class="node-divider" aria-hidden="true"><span></span></div>`;
}

function buildArticleJsonLd(post) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    keywords: post.focusKeywords,
    articleSection: 'AI automation',
    inLanguage: 'en',
    mainEntityOfPage: post.canonicalUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: site.author },
    publisher: { '@type': 'Organization', name: site.title }
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function buildSiteJsonLd(canonical) {
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site.baseUrl}/#organization`,
        name: site.title,
        url: site.baseUrl
      },
      {
        '@type': 'WebSite',
        '@id': `${site.baseUrl}/#website`,
        name: site.title,
        url: site.baseUrl,
        publisher: { '@id': `${site.baseUrl}/#organization` },
        inLanguage: 'en',
        mainEntityOfPage: canonical
      }
    ]
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function buildFaqJsonLd(post) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (post.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function renderGoogleTags() {
  const tags = [];

  if (site.googleSiteVerification) {
    tags.push(`<meta name="google-site-verification" content="${escapeHtml(site.googleSiteVerification)}">`);
  }

  if (site.googleTagId) {
    tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(site.googleTagId)}"></script>`);
    tags.push(`<script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${escapeHtml(site.googleTagId)}');</script>`);
  }

  return tags.join('\n  ');
}

function renderMarkdownish(text) {
  const lines = String(text || '').split('\n');
  const result = [];
  let mode = null; // 'code', 'table', 'ul', 'ol', 'p'
  let accum = [];

  const closeCurrentMode = () => {
    if (!mode) return;
    if (mode === 'code') {
      const codeText = escapeHtml(accum.join('\n'));
      result.push(`<pre><code>${codeText}</code></pre>`);
    } else if (mode === 'table') {
      result.push(renderTableHtml(accum));
    } else if (mode === 'ul') {
      result.push(`<ul>${accum.map(li => `<li>${renderInline(li)}</li>`).join('')}</ul>`);
    } else if (mode === 'ol') {
      result.push(`<ol>${accum.map(li => `<li>${renderInline(li)}</li>`).join('')}</ol>`);
    } else if (mode === 'p') {
      const pText = accum.join('\n');
      if (pText.trim()) {
        result.push(`<p>${renderInline(pText)}</p>`);
      }
    }
    accum = [];
    mode = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (mode === 'code') {
        closeCurrentMode();
      } else {
        closeCurrentMode();
        mode = 'code';
      }
      continue;
    }

    if (mode === 'code') {
      accum.push(line);
      continue;
    }

    // Headings (should be standalone, not grouped into paragraphs)
    if (trimmed.startsWith('## ')) {
      closeCurrentMode();
      result.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      closeCurrentMode();
      result.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    // Table row
    if (trimmed.startsWith('|')) {
      if (mode !== 'table') {
        closeCurrentMode();
        mode = 'table';
      }
      accum.push(line);
      continue;
    }

    // Unordered list item
    if (trimmed.startsWith('- ')) {
      if (mode !== 'ul') {
        closeCurrentMode();
        mode = 'ul';
      }
      accum.push(trimmed.slice(2));
      continue;
    }

    // Ordered list item
    if (/^\d+\.\s/.test(trimmed)) {
      if (mode !== 'ol') {
        closeCurrentMode();
        mode = 'ol';
      }
      accum.push(trimmed.replace(/^\d+\.\s/, ''));
      continue;
    }

    // Empty line
    if (trimmed === '') {
      closeCurrentMode();
      continue;
    }

    // Normal paragraph text
    if (mode !== 'p') {
      closeCurrentMode();
      mode = 'p';
    }
    accum.push(line);
  }
  closeCurrentMode();

  return result.join('\n');
}

function renderTableHtml(rows) {
  const parsedRows = rows
    .map(row => {
      const cells = row.split('|').map(c => c.trim());
      if (row.startsWith('|')) cells.shift();
      if (row.endsWith('|')) cells.pop();
      return cells;
    })
    .filter(cells => {
      return !cells.every(cell => /^[-:]+$/.test(cell) || cell === '');
    });

  if (parsedRows.length === 0) return '';

  const headerCells = parsedRows[0];
  const bodyRows = parsedRows.slice(1);

  const ths = headerCells.map(cell => `<th>${renderInline(cell)}</th>`).join('');
  const trs = bodyRows
    .map(row => {
      const tds = row.map(cell => `<td>${renderInline(cell)}</td>`).join('');
      return `<tr>${tds}</tr>`;
    })
    .join('\n');

  return `<div class="table-container">
    <table>
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>
  </div>`;
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function postCard(post) {
  return `<article class="card">
    <p class="meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time> &middot; ${escapeHtml(post.searchIntent)}</p>
    <h2><a href="/posts/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h2>
    <p>${escapeHtml(post.excerpt)}</p>
    <div class="card-footer">
      ${renderTags(post.tags)}
      <a class="card-cta" href="/posts/${escapeHtml(post.slug)}/">Read guide &rarr;</a>
    </div>
  </article>`;
}

function renderTags(tags = []) {
  if (!tags.length) return '';
  return `<div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`;
}

function relatedPosts(posts, currentSlug) {
  const related = posts.filter((post) => post.slug !== currentSlug).slice(0, 3);
  if (!related.length) return '';
  return `<aside class="related">
    <h2>Related AI workflow guides</h2>
    <ul>${related.map((post) => `<li><a href="/posts/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></li>`).join('')}</ul>
  </aside>`;
}

function breadcrumbs(title) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumbs">
    <a href="/">Home</a> <span>/</span> <span>${escapeHtml(title)}</span>
  </nav>`;
}

async function build() {
  const posts = await readPosts();
  await fs.rm(PUBLIC_DIR, { recursive: true, force: true });
  await ensureDir(path.join(PUBLIC_DIR, 'posts'));
  await ensureDir(path.join(PUBLIC_DIR, 'about'));
  await ensureDir(path.join(PUBLIC_DIR, 'contact'));
  await copyStaticFiles();

  const postsIndexBody = `<section class="hero">
    <p class="eyebrow">All guides</p>
    <h1>Every AI workflow guide on mdevtech Blogs.</h1>
    <p>Browse the full archive of practical, SEO-focused posts for students, freelancers, and small businesses.</p>
  </section>
  <section class="grid">${posts.map(postCard).join('\n')}</section>`;
  await fs.writeFile(path.join(PUBLIC_DIR, 'posts', 'index.html'), layout({
    title: `Posts | ${site.title}`,
    description: 'Browse all AI workflow guides on mdevtech Blogs.',
    canonical: `${site.baseUrl}/posts/`,
    body: postsIndexBody
  }));

  const css = await fs.readFile(path.join(ROOT, 'src', 'styles.css'), 'utf8');
  await fs.writeFile(path.join(PUBLIC_DIR, 'styles.css'), css);

  const indexBody = `<section class="hero">
    <p class="eyebrow">AI tools & workflows</p>
    <h1>Practical guides that help you get real work done.</h1>
    <p>Clear, actionable AI workflows for students, freelancers, and small businesses. Each guide walks through a tested process from start to finish.</p>
    <div class="hero-promise" aria-label="What each guide includes">
      <span>Prompt templates</span>
      <span>Tool choices</span>
      <span>Verification checklists</span>
    </div>
    <div class="hero-note">
      <strong>Built for people who need a usable workflow, not another AI tools list.</strong>
      <p>Every guide turns one real task into steps, prompts, review checks, and publish-ready next actions.</p>
    </div>
  </section>
  ${nodeDivider()}
  <section class="intro-grid">
    <article>
      <div class="intro-icon-wrapper">
        <svg class="feature-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" stroke="var(--teal)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <h2>SEO-first content</h2>
      <p>Every article targets a specific long-tail keyword with meta tags, FAQ schema, internal links, and structured data.</p>
    </article>
    <article>
      <div class="intro-icon-wrapper">
        <svg class="feature-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" stroke="var(--teal)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      </div>
      <h2>Autonomous publishing</h2>
      <p>Hermes Agent researches and drafts each guide, with deterministic fallback when needed.</p>
    </article>
    <article>
      <div class="intro-icon-wrapper">
        <svg class="feature-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" stroke="var(--teal)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 11 11 13 15 9"></polyline>
        </svg>
      </div>
      <h2>Human-checked quality</h2>
      <p>Every AI draft includes claim checks so facts can be verified before publishing.</p>
    </article>
  </section>
  ${nodeDivider()}
  <section class="section-heading">
    <p class="eyebrow">Latest guides</p>
    <h2>Fresh workflows ready to use</h2>
  </section>
  <section class="grid" aria-label="Latest workflow guides">${posts.map(postCard).join('\n') || '<p>No posts yet. Run <code>npm run generate</code>.</p>'}</section>`;

  await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), layout({
    title: `${site.title} | AI workflow guides`,
    description: site.description,
    canonical: `${site.baseUrl}/`,
    body: indexBody
  }));

  const report = { generatedAt: new Date().toISOString(), summary: { posts: posts.length, errors: 0, warnings: 0 }, posts: [] };

  for (const post of posts) {
    const dir = path.join(PUBLIC_DIR, 'posts', post.slug);
    await ensureDir(dir);
    const validation = validatePostSeo(post, { strict: strictSeo, siteUrl: site.baseUrl });
    report.summary.errors += validation.errors.length;
    report.summary.warnings += validation.warnings.length;
    report.posts.push({ slug: post.slug, seoScore: post.seoScore, ...validation });

    const body = `<article class="post">
      ${breadcrumbs(post.title)}
      <p class="meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time> &middot; By ${escapeHtml(site.author)} &middot; ${escapeHtml(post.searchIntent)}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="lede">${escapeHtml(post.excerpt)}</p>
      ${renderTags(post.tags)}
      ${renderMarkdownish(post.body)}
      ${renderFaq(post.faq)}
      ${relatedPosts(posts, post.slug)}
    </article>`;

    await fs.writeFile(path.join(dir, 'index.html'), layout({
      title: `${post.title} | ${site.title}`,
      description: post.metaDescription || post.excerpt,
      canonical: post.canonicalUrl || `${site.baseUrl}/posts/${post.slug}/`,
      body,
      post
    }));
  }

  await fs.writeFile(path.join(PUBLIC_DIR, 'about', 'index.html'), layout({
    title: `About ${site.title}`,
    description: `About ${site.title}, written by ${site.author}.`,
    canonical: `${site.baseUrl}/about/`,
    body: `<section class="page">
      <h1>About mdevtech Blogs</h1>
      <p>mdevtech Blogs publishes practical AI workflow guides for students, freelancers, and small local businesses. The site focuses on long-tail SEO, useful examples, and human-checked content.</p>
    </section>`
  }));

  await fs.writeFile(path.join(PUBLIC_DIR, 'contact', 'index.html'), layout({
    title: `Contact ${site.title}`,
    description: `Contact ${site.title}.`,
    canonical: `${site.baseUrl}/contact/`,
    body: `<section class="page">
      <h1>Contact</h1>
      <p>For collaborations, corrections, or SEO feedback, contact <strong>muneeb1st</strong>.</p>
    </section>`
  }));

  await writeRss(posts);
  await writeAtom(posts);
  await writeSitemap(posts);
  await writeRobots(posts);
  await writeFeedJson(posts);
  await writeOpenSearch();

  const collectionValidation = validatePostCollection(posts, { strict: strictSeo });
  report.collection = collectionValidation;
  report.summary.errors += collectionValidation.errors.length;
  report.summary.warnings += collectionValidation.warnings.length;

  await fs.writeFile(path.join(PUBLIC_DIR, 'seo-report.json'), JSON.stringify(report, null, 2));

  console.log(`Built ${posts.length} post(s) into ${PUBLIC_DIR}`);
  console.log(`SEO report: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
  if (strictSeo && report.summary.errors > 0) {
    throw new Error(`Strict SEO build failed with ${report.summary.errors} error(s).`);
  }
}

async function copyStaticFiles() {
  const staticDir = path.join(ROOT, 'static');
  const entries = await fs.readdir(staticDir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const from = path.join(staticDir, entry.name);
    const to = path.join(PUBLIC_DIR, entry.name);
    if (entry.isDirectory()) {
      await fs.cp(from, to, { recursive: true });
    } else if (entry.isFile()) {
      await fs.copyFile(from, to);
    }
  }
}

function renderFaq(faq = []) {
  if (!faq.length) return '';
  return `<section class="faq"><h2>Frequently asked questions</h2>${faq.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${renderInline(item.answer)}</p></details>`).join('\n')}</section>`;
}

async function writeRss(posts) {
  const rssItems = posts.map((post) => `<item><title>${escapeHtml(post.title)}</title><link>${site.baseUrl}/posts/${post.slug}/</link><guid>${site.baseUrl}/posts/${post.slug}/</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escapeHtml(post.metaDescription || post.excerpt)}</description></item>`).join('');
  await fs.writeFile(path.join(PUBLIC_DIR, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>${escapeHtml(site.title)}</title><link>${site.baseUrl}</link><description>${escapeHtml(site.description)}</description>${rssItems}</channel></rss>`);
}

async function writeAtom(posts) {
  const updated = posts[0]?.date || new Date().toISOString();
  const entries = posts.map((post) => `  <entry>
    <title>${escapeHtml(post.title)}</title>
    <link rel="alternate" type="text/html" href="${site.baseUrl}/posts/${post.slug}/"/>
    <id>${site.baseUrl}/posts/${post.slug}/</id>
    <published>${new Date(post.date).toISOString()}</published>
    <updated>${new Date(post.date).toISOString()}</updated>
    <summary>${escapeHtml(post.metaDescription || post.excerpt)}</summary>
    <author><name>${escapeHtml(site.author)}</name></author>
  </entry>`).join('\n');

  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeHtml(site.title)}</title>
  <subtitle>${escapeHtml(site.description)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${site.baseUrl}/atom.xml"/>
  <link rel="alternate" type="text/html" href="${site.baseUrl}/"/>
  <id>${site.baseUrl}/</id>
  <updated>${new Date(updated).toISOString()}</updated>
  <author><name>${escapeHtml(site.author)}</name></author>
${entries}
</feed>
`;

  await fs.writeFile(path.join(PUBLIC_DIR, 'atom.xml'), atom);
}

async function writeSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { path: '/', lastmod: today, priority: '1.0' },
    { path: '/posts/', lastmod: today, priority: '0.8' },
    { path: '/about/', lastmod: today, priority: '0.6' },
    { path: '/contact/', lastmod: today, priority: '0.5' },
    ...posts.map((post) => ({
      path: `/posts/${post.slug}/`,
      lastmod: new Date(post.date).toISOString().slice(0, 10),
      priority: '0.8'
    }))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${site.baseUrl}${url.path}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${site.baseUrl}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`;

  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap-index.xml'), sitemapIndex);
}

async function writeRobots(posts) {
  await fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap-index.xml\nSitemap: ${site.baseUrl}/sitemap.xml\nSitemap: ${site.baseUrl}/atom.xml\n`);
}

async function writeFeedJson(posts) {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: site.title,
    home_page_url: `${site.baseUrl}/`,
    feed_url: `${site.baseUrl}/feed.json`,
    description: site.description,
    authors: [{ name: site.author }],
    items: posts.map((post) => ({
      id: `${site.baseUrl}/posts/${post.slug}/`,
      url: `${site.baseUrl}/posts/${post.slug}/`,
      title: post.title,
      summary: post.excerpt,
      date_published: post.date,
      tags: post.tags
    }))
  };
  await fs.writeFile(path.join(PUBLIC_DIR, 'feed.json'), JSON.stringify(feed, null, 2));
}

async function writeOpenSearch() {
  const xml = `<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"><ShortName>${escapeHtml(site.title)}</ShortName><Description>Search ${escapeHtml(site.title)}</Description><InputEncoding>UTF-8</InputEncoding><Url type="text/html" template="${site.baseUrl}/?q={searchTerms}"/></OpenSearchDescription>`;
  await fs.writeFile(path.join(PUBLIC_DIR, 'opensearch.xml'), xml);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

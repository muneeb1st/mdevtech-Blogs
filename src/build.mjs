#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, escapeHtml, formatDate, PUBLIC_DIR, readPosts, ROOT } from './lib.mjs';
import { validatePostSeo } from './seo/validator.mjs';

const site = {
  title: 'mdevtech Blogs',
  description: 'Practical AI tools and workflows for students, freelancers, and small local businesses.',
  author: 'muneeb1st',
  baseUrl: (process.env.SITE_URL || 'https://mdevtech.vercel.app').replace(/\/$/, ''),
  image: '/og-default.png',
  googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || process.env.NEXT_PUBLIC_GA_ID || '',
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION || '',
  googleAdsenseId: process.env.GOOGLE_ADSENSE_ID || ''
};

function layout({ title, description, canonical, body, post }) {
  const articleJsonLd = post ? buildArticleJsonLd(post) : '';
  const faqJsonLd = post?.faq?.length ? buildFaqJsonLd(post) : '';
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
  
  <script>
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Space+Grotesk:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="/rss.xml">
  ${renderGoogleTags()}
  ${articleJsonLd}
  ${faqJsonLd}
</head>
<body>
  <header class="site-header">
    <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
    <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
    <div class="header-container">
      <a class="brand" href="/">${escapeHtml(site.title)}</a>
      <div class="nav-wrapper">
        <nav class="top-nav">
          <a href="/posts/">Posts</a>
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
        </nav>
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
          <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
          </svg>
          <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        </button>
      </div>
    </div>
  </header>
  <main>${body}</main>
  <footer class="site-footer">
    <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
    <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
    <div class="footer-container">
      <div class="footer-brand-section">
        <span class="footer-brand">${escapeHtml(site.title)}</span>
        <p class="footer-tagline">Evergreen AI tools & workflows for students, freelancers, and small businesses.</p>
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

  if (site.googleAdsenseId) {
    tags.push(`<meta name="google-adsense-account" content="${escapeHtml(site.googleAdsenseId)}">`);
    tags.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(site.googleAdsenseId)}" crossorigin="anonymous"></script>`);
  }

  if (site.googleAnalyticsId) {
    tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(site.googleAnalyticsId)}"></script>`);
    tags.push(`<script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${escapeHtml(site.googleAnalyticsId)}');</script>`);
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
    <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
    <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
    <p class="meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time> · ${escapeHtml(post.searchIntent)}</p>
    <h2><a href="/posts/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h2>
    <p>${escapeHtml(post.excerpt)}</p>
    <div class="card-footer">
      ${renderTags(post.tags)}
      <a class="card-cta" href="/posts/${escapeHtml(post.slug)}/">READ GUIDE →</a>
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
    <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
    <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
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
  await writeAdsTxt();

  const indexBody = `<section class="hero">
    <p class="eyebrow">AI tools and workflows</p>
    <h1>Practical AI guides that help students, freelancers, and small businesses get real work done.</h1>
    <p>${escapeHtml(site.description)} Each post is built for long-tail search intent, clear structure, and useful implementation steps.</p>
  </section>
  <section class="intro-grid">
    <article>
      <div class="intro-icon-wrapper">
        <svg class="feature-icon" viewBox="0 0 24 24" width="32" height="32" stroke="var(--safety-accent)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </div>
      <h2>SEO-first content</h2>
      <p>Every article targets a specific long-tail keyword with meta tags, FAQ schema, internal links, and structured data.</p>
    </article>
    <article>
      <div class="intro-icon-wrapper">
        <svg class="feature-icon" viewBox="0 0 24 24" width="32" height="32" stroke="var(--safety-accent)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
          <path d="M12 9v2M9 10h6"></path>
        </svg>
      </div>
      <h2>Autonomous publishing</h2>
      <p>The system uses Hermes Agent for research and drafting, with deterministic fallback when needed.</p>
    </article>
    <article>
      <div class="intro-icon-wrapper">
        <svg class="feature-icon" viewBox="0 0 24 24" width="32" height="32" stroke="var(--safety-accent)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 11 11 13 15 9"></polyline>
        </svg>
      </div>
      <h2>Human-checked quality</h2>
      <p>AI drafts include claim checks so facts can be verified before publishing.</p>
    </article>
  </section>
  <section class="grid">${posts.map(postCard).join('\n') || '<p>No posts yet. Run <code>npm run generate</code>.</p>'}</section>`;

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
    const validation = validatePostSeo(post, { strict: process.env.STRICT_SEO === '1' });
    report.summary.errors += validation.errors.length;
    report.summary.warnings += validation.warnings.length;
    report.posts.push({ slug: post.slug, ...validation });

    const body = `<article class="post">
      <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
      <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
      ${breadcrumbs(post.title)}
      <p class="meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time> · By ${escapeHtml(site.author)} · ${escapeHtml(post.searchIntent)}</p>
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
      <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
      <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
      <h1>About mdevtech Blogs</h1>
      <p>mdevtech Blogs publishes practical AI workflow guides for students, freelancers, and small local businesses. The site focuses on long-tail SEO, useful examples, and human-checked content.</p>
    </section>`
  }));

  await fs.writeFile(path.join(PUBLIC_DIR, 'contact', 'index.html'), layout({
    title: `Contact ${site.title}`,
    description: `Contact ${site.title}.`,
    canonical: `${site.baseUrl}/contact/`,
    body: `<section class="page">
      <span class="corner-cross tl">+</span><span class="corner-cross tr">+</span>
      <span class="corner-cross bl">+</span><span class="corner-cross br">+</span>
      <h1>Contact</h1>
      <p>For collaborations, corrections, or SEO feedback, contact <strong>muneeb1st</strong>.</p>
    </section>`
  }));

  await writeRss(posts);
  await writeSitemap(posts);
  await writeRobots(posts);
  await writeFeedJson(posts);
  await writeOpenSearch();
  await fs.writeFile(path.join(PUBLIC_DIR, 'seo-report.json'), JSON.stringify(report, null, 2));

  console.log(`Built ${posts.length} post(s) into ${PUBLIC_DIR}`);
  console.log(`SEO report: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
}

async function writeAdsTxt() {
  if (!site.googleAdsenseId) return;
  await fs.writeFile(path.join(PUBLIC_DIR, 'ads.txt'), `google.com, pub-${site.googleAdsenseId.replace(/^pub-/, '')}, DIRECT, f08c47fec0942fa0\n`);
}

function renderFaq(faq = []) {
  if (!faq.length) return '';
  return `<section class="faq"><h2>Frequently asked questions</h2>${faq.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${renderInline(item.answer)}</p></details>`).join('\n')}</section>`;
}

async function writeRss(posts) {
  const rssItems = posts.map((post) => `<item><title>${escapeHtml(post.title)}</title><link>${site.baseUrl}/posts/${post.slug}/</link><guid>${site.baseUrl}/posts/${post.slug}/</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escapeHtml(post.metaDescription || post.excerpt)}</description></item>`).join('');
  await fs.writeFile(path.join(PUBLIC_DIR, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>${escapeHtml(site.title)}</title><link>${site.baseUrl}</link><description>${escapeHtml(site.description)}</description>${rssItems}</channel></rss>`);
}

async function writeSitemap(posts) {
  const urls = ['/', '/posts/', '/about/', '/contact/', ...posts.map((post) => `/posts/${post.slug}/`)];
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${site.baseUrl}${url}</loc><lastmod>${new Date().toISOString()}</lastmod><changefreq>weekly</changefreq><priority>${url === '/' ? '1.0' : '0.8'}</priority></url>`).join('')}</urlset>`);
}

async function writeRobots(posts) {
  const sitemap = `${site.baseUrl}/sitemap.xml`;
  await fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`);
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

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const POSTS_DIR = path.join(ROOT, 'content', 'posts');
export const PUBLIC_DIR = path.join(ROOT, 'public');

export function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function escapeHtml(input = '') {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
}

export function currentSlot(now = new Date()) {
  const slotHour = now.getUTCHours() < 12 ? '00' : '12';
  return `${now.toISOString().slice(0, 10)}-${slotHour}`;
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readPosts() {
  await ensureDir(POSTS_DIR);
  const entries = await fs.readdir(POSTS_DIR).catch(() => []);
  const posts = [];
  for (const entry of entries.filter((name) => name.endsWith('.json'))) {
    const raw = await fs.readFile(path.join(POSTS_DIR, entry), 'utf8');
    posts.push(normalizePostShape(JSON.parse(raw)));
  }
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function normalizePostShape(post) {
  const siteUrl = (process.env.SITE_URL || 'https://mdevtech.vercel.app').replace(/\/$/, '');
  const tags = Array.isArray(post.tags) && post.tags.length ? post.tags : ['AI automation', post.niche || 'AI workflows'];
  const body = post.body || post.bodyMarkdown || '';
  const excerpt = post.excerpt || body.slice(0, 155).replace(/\s+/g, ' ').trim();
  const focusKeywords = Array.isArray(post.focusKeywords) && post.focusKeywords.length ? post.focusKeywords : [tags[0]];
  const metaTitle = post.metaTitle || post.title;
  const metaDescription = post.metaDescription || excerpt;

  return {
    ...post,
    body,
    tags,
    excerpt,
    metaTitle,
    metaDescription,
    focusKeywords,
    searchIntent: post.searchIntent || 'informational',
    faq: Array.isArray(post.faq) ? post.faq : [],
    internalLinks: Array.isArray(post.internalLinks) ? post.internalLinks : [],
    canonicalUrl: post.canonicalUrl || `${siteUrl}/posts/${post.slug}/`,
    jsonLd: post.jsonLd || {
      headline: post.title,
      description: metaDescription,
      keywords: focusKeywords,
      articleSection: 'AI automation'
    },
    seoScore: typeof post.seoScore === 'number' ? post.seoScore : 0.65,
    claimsNeedingHumanCheck: Array.isArray(post.claimsNeedingHumanCheck) ? post.claimsNeedingHumanCheck : ['Legacy post missing Hermes SEO fields; regenerate for final publishing.']
  };
}

export async function writePost(post) {
  await ensureDir(POSTS_DIR);
  const target = path.join(POSTS_DIR, `${post.slug}.json`);
  await fs.writeFile(target, `${JSON.stringify(post, null, 2)}\n`);
  return target;
}

export async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

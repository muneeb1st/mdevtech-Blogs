#!/usr/bin/env node
import 'dotenv/config';
import path from 'node:path';
import { buildFallbackPost, buildSeoPrompt } from './agents/seo-prompt.mjs';
import { generateWithHermes } from './agents/hermes-runner.mjs';
import { currentSlot, fileExists, POSTS_DIR, readPosts, slugify, writePost } from './lib.mjs';
import { loadKeywordClusters, selectKeywordCluster } from './seo/keywords.mjs';
import { validatePostSeo } from './seo/validator.mjs';
import { recordPublishEvent, upsertPost } from './supabase.mjs';

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const offline = args.has('--offline');
const strict = args.has('--strict') || process.env.STRICT_SEO === '1';

const niche = 'AI tools and workflows for students, freelancers, and small local businesses';
const author = 'muneeb1st';
const siteUrl = usableSiteUrl(process.env.SITE_URL, 'https://mdevtech.vercel.app');

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

function readArgValue(name) {
  const equalsValue = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (equalsValue) return equalsValue.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  if (index !== -1) return rawArgs[index + 1];
  return '';
}

function resolveNow() {
  const override = readArgValue('--now') || readArgValue('--date');
  if (!override) return new Date();
  const parsed = new Date(override);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --date/--now value: ${override}`);
  }
  return parsed;
}

function ensureInternalLinks(post, existingPosts) {
  const defaults = [
    { slug: 'ai-tools-students-note-taking-research', anchor: 'AI tools for students: note-taking and research workflow' },
    { slug: 'ai-proposal-writing-freelancers', anchor: 'AI proposal writing workflow for freelancers' },
    { slug: 'ai-content-calendar-local-business', anchor: 'Local business AI content calendar' }
  ];

  const candidates = [
    ...(post.internalLinks || []),
    ...existingPosts.map((existingPost) => ({ slug: existingPost.slug, anchor: existingPost.title })),
    ...defaults
  ];

  const seen = new Set();
  return candidates
    .filter((link) => link?.slug && link?.anchor && link.slug !== post.slug)
    .filter((link) => {
      if (seen.has(link.slug)) return false;
      seen.add(link.slug);
      return true;
    })
    .slice(0, 3);
}

function normalizePost(raw, cluster, now) {
  const slot = currentSlot(now);
  const baseSlug = cluster.slug || slugify(cluster.primaryKeyword);
  const title = raw.title || `${cluster.primaryKeyword}: practical workflow for ${cluster.audience}`;
  const slug = `${slot}-${slugify(raw.slug || baseSlug)}`;
  const body = raw.body || raw.bodyMarkdown || '';

  const baseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: raw.metaDescription || '',
    keywords: Array.isArray(raw.focusKeywords) ? raw.focusKeywords : [cluster.primaryKeyword],
    articleSection: 'AI automation'
  };
  const jsonLd = raw.jsonLd && typeof raw.jsonLd === 'object'
    ? { ...baseJsonLd, ...raw.jsonLd, '@context': 'https://schema.org', '@type': 'BlogPosting' }
    : baseJsonLd;

  const post = {
    title,
    slug,
    date: raw.date || now.toISOString(),
    niche,
    author,
    excerpt: raw.excerpt || body.slice(0, 155).replace(/\s+/g, ' ').trim(),
    tags: Array.isArray(raw.tags) ? raw.tags : [cluster.primaryKeyword, cluster.audience, 'AI automation'],
    body,
    metaTitle: raw.metaTitle || title,
    metaDescription: raw.metaDescription || body.slice(0, 155).replace(/\s+/g, ' ').trim(),
    focusKeywords: Array.isArray(raw.focusKeywords) ? raw.focusKeywords : [cluster.primaryKeyword],
    searchIntent: raw.searchIntent || cluster.searchIntent || 'informational',
    faq: Array.isArray(raw.faq) ? raw.faq : [],
    internalLinks: Array.isArray(raw.internalLinks) ? raw.internalLinks : [],
    canonicalUrl: `${siteUrl.replace(/\/$/, '')}/posts/${slug}/`,
    jsonLd,
    seoScore: typeof raw.seoScore === 'number' ? raw.seoScore : 0.85,
    claimsNeedingHumanCheck: Array.isArray(raw.claimsNeedingHumanCheck) ? raw.claimsNeedingHumanCheck : ['Verify tool names, prices, dates, and statistics before publishing.']
  };

  const validation = validatePostSeo(post, { strict: false, siteUrl });
  if (!validation.passed || validation.warnings.length > 0) {
    console.warn('[SEO] Pre-cleanup validation notes:', [...validation.errors, ...validation.warnings].join(' | '));
  }

  return post;
}

async function makePost({ cluster, existingPosts, now = new Date() }) {
  const prompt = buildSeoPrompt({ cluster, existingPosts });

  function finalizePost(candidateRaw, mode) {
    const post = normalizePost(candidateRaw, cluster, now);
    post.internalLinks = ensureInternalLinks(post, existingPosts);
    const finalValidation = validatePostSeo(post, { strict, siteUrl });
    if (!finalValidation.passed) {
      if (strict) {
        throw new Error(`SEO validation failed after internal link cleanup: ${finalValidation.errors.join('; ')}`);
      }
      console.warn('[SEO] Post warnings after internal link cleanup:', finalValidation.warnings.join(' | '));
    }
    post.generationMode = mode;
    return post;
  }

  if (!offline) {
    try {
      const hermesRaw = await generateWithHermes(prompt);
      return finalizePost(hermesRaw, 'hermes');
    } catch (error) {
      console.warn('[Hermes] Generation or SEO validation failed; falling back to deterministic offline generation.');
      console.warn(`[Hermes] ${error.message}`);
    }
  }

  const fallbackRaw = buildFallbackPost({ cluster, now, existingPosts });
  return finalizePost(fallbackRaw, 'offline');
}

async function main() {
  const now = resolveNow();
  const slot = currentSlot(now);
  const clusters = await loadKeywordClusters();
  const cluster = selectKeywordCluster(slot, clusters);
  const target = path.join(POSTS_DIR, `${slot}-${slugify(cluster.slug || cluster.primaryKeyword)}.json`);

  if (!force && await fileExists(target)) {
    console.log(`Post already exists: ${target}`);
    process.exit(0);
  }

  const existingPosts = await readPosts();
  const post = await makePost({ cluster, existingPosts, now });
  const written = path.join(POSTS_DIR, `${post.slug}.json`);

  if (dryRun) {
    console.log(JSON.stringify(post, null, 2));
    process.exit(0);
  }

  await writePost(post);
  console.log(`Generated post: ${written}`);

  try {
    const syncedPost = await upsertPost(post);
    if (syncedPost) {
      await recordPublishEvent(syncedPost, {
        slug: post.slug,
        generationMode: post.generationMode
      });
    }
  } catch (error) {
    console.warn('[Supabase] Failed to sync post.');
    console.warn(error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

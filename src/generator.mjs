#!/usr/bin/env node
import 'dotenv/config';
import path from 'node:path';
import { buildFallbackPost, buildSeoPrompt } from './agents/seo-prompt.mjs';
import { generateWithHermes } from './agents/hermes-runner.mjs';
import { currentSlot, fileExists, POSTS_DIR, readPosts, slugify, writePost } from './lib.mjs';
import { loadKeywordClusters, selectKeywordCluster } from './seo/keywords.mjs';
import { validatePostSeo } from './seo/validator.mjs';
import { upsertPost } from './supabase.mjs';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const offline = args.has('--offline');
const strict = args.has('--strict') || process.env.STRICT_SEO === '1';

const niche = 'AI tools and workflows for students, freelancers, and small local businesses';
const author = 'muneeb1st';
const siteUrl = process.env.SITE_URL || 'https://mdevtech.vercel.app';

function normalizePost(raw, cluster, now) {
  const slot = currentSlot(now);
  const baseSlug = cluster.slug || slugify(cluster.primaryKeyword);
  const title = raw.title || `${cluster.primaryKeyword}: practical workflow for ${cluster.audience}`;
  const slug = `${slot}-${slugify(raw.slug || baseSlug)}`;
  const body = raw.body || raw.bodyMarkdown || '';

  const jsonLd = raw.jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description: raw.metaDescription || '',
      keywords: Array.isArray(raw.focusKeywords) ? raw.focusKeywords : [cluster.primaryKeyword],
      articleSection: 'AI automation'
    };

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

  const validation = validatePostSeo(post, { strict });
  if (!validation.passed) {
    if (strict) {
      throw new Error(`SEO validation failed: ${validation.errors.join('; ')}`);
    }
    console.warn('[SEO] Post warnings:', validation.warnings.join(' | '));
  }

  return post;
}

async function makePost({ cluster, existingPosts, now = new Date() }) {
  const prompt = buildSeoPrompt({ cluster, existingPosts });

  let raw;
  let generationMode = 'offline';

  if (!offline) {
    try {
      raw = await generateWithHermes(prompt);
      generationMode = 'hermes';
    } catch (error) {
      console.warn('[Hermes] Generation failed; falling back to deterministic offline generation.');
      console.warn(`[Hermes] ${error.message}`);
      raw = buildFallbackPost({ cluster, now, existingPosts });
    }
  } else {
    raw = buildFallbackPost({ cluster, now, existingPosts });
  }

  const post = normalizePost(raw, cluster, now);
  post.internalLinks = (post.internalLinks || []).filter((link) => link.slug !== post.slug);
  post.generationMode = generationMode;
  return post;
}

async function main() {
  const now = new Date();
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
    await upsertPost(post);
  } catch (error) {
    console.warn('[Supabase] Failed to sync post.');
    console.warn(error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

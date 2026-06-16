#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR, readPosts } from '../src/lib.mjs';
import { validatePostCollection, validatePostSeo } from '../src/seo/validator.mjs';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict') || process.env.STRICT_SEO === '1';

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

async function main() {
  const reportPath = path.join(PUBLIC_DIR, 'seo-report.json');
  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');

  const checks = [];
  const add = (name, pass, detail = '') => checks.push({ name, pass, detail });

  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const sitemap = await fs.readFile(sitemapPath, 'utf8');
  const robots = await fs.readFile(robotsPath, 'utf8');
  const posts = await readPosts();

  const baseUrl = usableSiteUrl(process.env.SITE_URL, 'https://mdevtech.vercel.app');
  add('seo-report.json exists', true);
  add('sitemap.xml exists', true);
  add('robots.txt exists', true);
  add('sitemap contains homepage', sitemap.includes(`<loc>${baseUrl}/</loc>`));
  add('robots contains sitemap', robots.includes('Sitemap:'));
  add('no blocking noindex by default', !robots.includes('Disallow: /'));

  const postReports = report.posts || [];
  add('posts have validation results', postReports.length > 0);
  add('all posts pass required validation', postReports.every((p) => p.passed));
  add('SEO errors count', report.summary.errors === 0);
  add('all post URLs are in sitemap', posts.every((post) => sitemap.includes(`<loc>${baseUrl}/posts/${post.slug}/</loc>`)));
  add('robots points to canonical sitemap', robots.includes(`Sitemap: ${baseUrl}/sitemap.xml`));

  const livePostReports = posts.map((post) => ({ slug: post.slug, seoScore: post.seoScore, ...validatePostSeo(post, { strict, siteUrl: baseUrl }) }));
  add('source posts pass current quality gates', livePostReports.every((post) => post.passed), livePostReports.filter((post) => !post.passed).map((post) => post.slug).join(', '));

  const collectionReport = validatePostCollection(posts, { strict });
  add('collection passes originality and long-tail checks', collectionReport.passed, [...collectionReport.errors, ...collectionReport.warnings].join(' | '));

  if (strict) {
    const weakPosts = livePostReports.filter((post) => !post.passed || post.warnings?.length);
    add('strict SEO has no weak posts', weakPosts.length === 0, weakPosts.map((p) => p.slug).join(', '));
    const lowScores = livePostReports.filter((post) => Number(post.seoScore || 0) < 0.88);
    add('strict SEO scores are 0.88+', lowScores.length === 0, lowScores.map((p) => p.slug).join(', '));
  }

  const errors = checks.filter((c) => !c.pass);
  if (errors.length) {
    console.log('SEO audit failed:');
    for (const e of errors) console.log(`- ${e.name}${e.detail ? `: ${e.detail}` : ''}`);
    process.exit(1);
  }

  console.log('SEO audit passed.');
  console.log(`Posts checked: ${postReports.length}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  if (strict) console.log('Strict mode: passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

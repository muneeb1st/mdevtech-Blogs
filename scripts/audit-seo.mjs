#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR } from '../src/lib.mjs';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict') || process.env.STRICT_SEO === '1';

async function main() {
  const reportPath = path.join(PUBLIC_DIR, 'seo-report.json');
  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');

  const checks = [];
  const add = (name, pass, detail = '') => checks.push({ name, pass, detail });

  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const sitemap = await fs.readFile(sitemapPath, 'utf8');
  const robots = await fs.readFile(robotsPath, 'utf8');

  const baseUrl = process.env.SITE_URL || 'https://mdevtech.vercel.app';
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

  if (strict) {
    const weakPosts = postReports.filter((post) => !post.passed || post.warnings?.length);
    add('strict SEO has no weak posts', weakPosts.length === 0, weakPosts.map((p) => p.slug).join(', '));
    const lowScores = postReports.filter((post) => Number(post.seoScore || 0) < 0.85);
    add('strict SEO scores are 0.85+', lowScores.length === 0, lowScores.map((p) => p.slug).join(', '));
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

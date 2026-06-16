# mdevtech Blogs

Autonomous SEO-first static blog for `mdevtech.vercel.app`, powered by Hermes Agent, Supabase, and Vercel.

## Niche

Practical AI tools and workflows for students, freelancers, and small local businesses.

## Commands

```bash
npm run generate -- --dry-run --offline
npm run generate -- --offline
npm run generate
npm run build
npm run audit:seo
npm run dev
```

Default `npm run generate` calls Hermes using the default Hermes model/provider. Set `HERMES_MODEL` or `HERMES_PROVIDER` only if you want to override the configured default.

## Hermes Agent Integration

The generator uses:

```bash
hermes -z "<SEO prompt>"
```

It sends Hermes a strict SEO prompt that asks for:
- long-tail keyword targeting
- search intent
- meta title and description
- FAQ
- internal links
- JSON-LD-ready fields
- claim checks
- SEO score

If Hermes is unavailable or fails, the generator falls back to deterministic offline content unless `--strict` blocks weak output.

## Supabase

Run `automation/supabase_schema.sql` in your Supabase SQL editor.

For disaster recovery or moving publishing to a new server, use:

```txt
automation/new-server-hermes-cron-runbook.md
```

Required local env vars:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Public optional env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

If Supabase credentials are missing, generation/build continues locally and logs a warning.

## Vercel

Deploy this repo to Vercel.

Vercel settings are in `vercel.json`:
- build command: `npm ci && npm run build`
- output directory: `public`

Autonomous generation happens in GitHub Actions every 12 hours, then Vercel deploys from the pushed static build.

Required Vercel environment variables:
- `SITE_URL=https://mdevtech.vercel.app`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `HERMES_MODEL`
- `HERMES_PROVIDER`
- `HERMES_SKILLS`
- `HERMES_TOOLSETS`
- `PREFER_LOW_DIFFICULTY_KEYWORDS=1`
- `GOOGLE_TAG_ID` or `GOOGLE_ANALYTICS_ID`
- `GOOGLE_SITE_VERIFICATION` or `GSC_VERIFICATION`

Ads are intentionally not wired yet. Add ad scripts only after the site has meaningful search traffic and the layout can be checked again for Core Web Vitals impact.

## SEO System

The build generates:
- semantic HTML
- canonical URLs
- meta titles/descriptions
- Open Graph tags
- Twitter card tags
- Organization and WebSite JSON-LD
- BlogPosting JSON-LD
- FAQPage JSON-LD
- `sitemap.xml`
- `robots.txt`
- `rss.xml`
- `feed.json`
- `opensearch.xml`
- `seo-report.json`

Run:

```bash
npm run audit:seo
npm run audit:seo:strict
```

Strict SEO mode is the cron gate. It blocks posts that are too generic, too similar to existing posts, missing internal links, missing copy-paste prompts, missing verification/checklist sections, missing tool comparison tables, using bad canonicals, or using weak structured data.

## Google Search Console

After deploying to Vercel:
1. Add the HTML tag token to `GOOGLE_SITE_VERIFICATION` or `GSC_VERIFICATION`.
2. Verify `mdevtech.vercel.app`.
3. Submit `https://mdevtech.vercel.app/sitemap.xml`.
4. Request indexing for the homepage and first posts.
5. Monitor queries, coverage, and Core Web Vitals.

## Google Analytics

Set `GOOGLE_TAG_ID` or `GOOGLE_ANALYTICS_ID` to the GA4 Measurement ID, then redeploy. The build only injects the Google tag when that value is present.

## DOX

Read `AGENTS.md` before editing.

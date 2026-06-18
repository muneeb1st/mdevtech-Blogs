# mdevtech Blogs

## Purpose

mdevtech Blogs is an autonomous SEO-first static blogging system for `mdevtech.vercel.app`. It publishes practical evergreen posts about AI tools and workflows for students, freelancers, and small local businesses under the author name `muneeb1st`.

The goal is to maximize Google ranking potential through keyword targeting, Hermes-driven research, original content, semantic HTML, structured data, internal linking, Supabase-backed content storage, and Vercel deployment.

## Ownership

- Root `AGENTS.md` owns project-wide SEO, publishing, automation, and deployment rules.
- Source code lives in `src/`.
- Generated/public web output lives in `public/`.
- Blog data lives in `content/posts/`.
- Keyword research data lives in `content/keyword-clusters.json`.
- Automation and database schema live in `automation/`.

## Local Contracts

- Before editing, read this file and any child `AGENTS.md` on the path being changed.
- Every post must include: `title`, `slug`, `date`, `niche`, `excerpt`, `tags`, `body`, `metaTitle`, `metaDescription`, `focusKeywords`, `searchIntent`, `faq`, `internalLinks`, `canonicalUrl`, `jsonLd`, `seoScore`, and `claimsNeedingHumanCheck`.
- The generator must use Hermes Agent by default through `hermes -z` and fall back to deterministic offline generation only when Hermes is unavailable or `--offline` is passed.
- The default Hermes model/provider must be used unless `HERMES_MODEL`, `HERMES_PROVIDER`, or CLI flags are specified.
- Hermes must receive strict SEO instructions: research the topic, target long-tail ranking intent, create original practical content, include FAQ, internal links, meta fields, and JSON-LD-ready fields.
- Avoid scraped or copyrighted content. Posts must be original, practical, evergreen, and human-checkable.
- Google #1 cannot be guaranteed. The system optimizes ranking factors: keyword intent, quality, technical SEO, internal links, structured data, indexing, and consistency.
- Autonomous publishing must prefer low-difficulty long-tail workflow keywords unless `PREFER_LOW_DIFFICULTY_KEYWORDS=0` is explicitly set.
- Strict SEO validation must block generic AI filler, duplicated post bodies, machine-looking repeated titles, missing copy-paste prompts, missing verification guidance, missing checklist sections, missing tool comparison tables, self-links, weak internal linking, bad canonicals, and weak structured data.
- Homepage and footer copy should emphasize practical workflows, tested process, and human review checkpoints. Do not market the site as AI-generated/autonomous publishing to readers.
- Cron/CI must run strict SEO audit before committing generated content.
- Keep dependencies minimal. Prefer Node.js standard library unless a dependency clearly buys leverage.
- Supabase credentials must never be committed. Use `.env` locally and Vercel/Supabase secrets in CI.

## Work Guidance

- Use `npm run generate` to create a post with Hermes.
- Use `npm run generate -- --offline` for deterministic fallback generation.
- Use `npm run build` to rebuild static HTML.
- Use `npm run dev` to serve `public/` locally.
- Use `npm run audit:seo` to validate SEO quality.
- Use `automation/cron.example` for a local 12-hour cron schedule.
- Use `.github/workflows/auto-blog.yml` for GitHub-hosted scheduled publishing.
- Use `automation/supabase_schema.sql` to initialize Supabase tables.
- Use `npm run supabase:backup` after strict SEO passes to back up all post JSON into Supabase.
- Use `npm run supabase:restore` on a new server to restore `content/posts/` from Supabase if AWS local disk is lost.
- Use `automation/new-server-hermes-cron-runbook.md` to rebuild the full Hermes publishing cron on another server.

## Verification

Minimum verification before reporting completion:

1. `npm run generate -- --dry-run --offline`
2. `npm run generate -- --offline`
3. `npm run build`
4. `npm run audit:seo`
5. Start local server with `npm run dev` and fetch `/` plus at least one post page.

## Child DOX Index

- `src/AGENTS.md` — source code contracts for Hermes runner, generator, build, server, SEO, and Supabase modules.
- `content/AGENTS.md` — blog post and keyword content contracts.
- `automation/AGENTS.md` — cron, Supabase, Vercel, and scheduler contracts.

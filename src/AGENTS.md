# Source Code

## Purpose

Source modules generate SEO-optimized blog content with Hermes Agent, compile static HTML, validate SEO quality, and serve the built site locally.

## Ownership

- `generator.mjs` owns post creation.
- `agents/hermes-runner.mjs` owns Hermes CLI execution and JSON parsing.
- `agents/seo-prompt.mjs` owns SEO prompt construction.
- `seo/keywords.mjs` owns keyword cluster loading and topic selection.
- `seo/validator.mjs` owns SEO quality checks.
- `build.mjs` owns static HTML, JSON-LD, RSS, sitemap, robots, and SEO report output.
- `server.mjs` owns local preview.
- `lib.mjs` owns shared helpers.
- `supabase.mjs` owns Supabase client, post backup, content versioning, restore helpers, and sync helpers.

## Local Contracts

- The default generation path must call Hermes unless `--offline` is used or Hermes is unavailable.
- Hermes must use the default model/provider configured in Hermes unless `HERMES_MODEL`, `HERMES_PROVIDER`, or CLI flags are specified.
- Generated posts must be valid JSON and pass the SEO validator before publish.
- All file writes must stay inside project folders.
- Generated slugs must be deterministic and filesystem-safe.
- Build output must be static-host compatible.
- Supabase sync must warn and continue if credentials are missing.
- Supabase backups must preserve the full post JSON in `content_versions.payload` so a new server can restore `content/posts/` without relying on AWS local disk.

## Work Guidance

- Keep modules dependency-free unless a dependency is justified.
- Prefer semantic HTML/CSS over framework complexity for this MVP.
- If Hermes generation fails, deterministic fallback must still produce a valid SEO-shaped post.
- SEO validation should warn by default and block only when `--strict` is used.

## Verification

Run `npm run generate -- --dry-run --offline`, `npm run generate -- --offline`, `npm run build`, and `npm run audit:seo` after source edits.

## Child DOX Index

None.

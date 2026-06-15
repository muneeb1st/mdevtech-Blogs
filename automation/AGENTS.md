# Automation

## Purpose

Contains scheduler examples, Supabase schema, and deployment configuration for autonomous SEO publishing.

## Ownership

- `cron.example` documents local 12-hour cron execution.
- `supabase_schema.sql` owns Supabase database schema.
- `.github/workflows/auto-blog.yml` owns GitHub scheduled publishing.
- `vercel.json` owns Vercel deployment settings.

## Local Contracts

- Automation must run `npm run generate` before `npm run build`.
- Hermes generation must use the default Hermes model/provider unless explicitly overridden.
- Automation should commit generated posts and public output only when files changed.
- Secrets/API keys must never be committed.
- Supabase sync must be optional when credentials are missing.

## Work Guidance

- Default schedule: every 12 hours.
- Keep commands explicit and easy to copy.
- Use `npm run audit:seo` before enabling live scheduled publishing.

## Verification

Dry-run locally before enabling live scheduled publishing.

## Child DOX Index

None.

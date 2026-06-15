# SEO Mastery + Hermes Agent Blogging System Replan

> **For Hermes:** Use this plan as the binding implementation contract. Do not implement in one giant patch. Execute task-by-task and verify after each task.

**Goal:** Build an automated blogging system that uses Hermes Agent as the content-generation LLM, creates SEO-optimized research-backed posts, stores posts/SEO metadata in Supabase, builds a technical-SEO-first static site, and deploys to Vercel.

**Reality Check:** Google #1 cannot be guaranteed. The system can only maximize ranking potential through keyword targeting, strong content, technical SEO, structured data, internal linking, indexing, and consistent publishing.

**Architecture:**
1. **Hermes Agent Runner:** `src/agents/hermes-runner.mjs` calls `hermes -z` with strict SEO prompts.
2. **SEO Content Contract:** Every generated post must include keyword intent, title, slug, meta title, meta description, outline, article body, FAQ, internal links, tags, canonical URL, and JSON-LD-ready fields.
3. **Static SEO Build:** `src/build.mjs` renders semantic HTML, meta tags, JSON-LD, RSS, sitemap, robots, and internal links.
4. **Supabase Storage:** `posts` table stores generated content, SEO metadata, publication status, and analytics fields.
5. **Vercel Deployment:** Static output from `public/` deployed to Vercel with environment variables configured.
6. **Verification:** Local build checks, SEO validator checks, Supabase upsert checks, Vercel preview checks.

**Tech Stack:**
- Hermes Agent CLI (`hermes -z`)
- Node.js ESM
- Supabase (`@supabase/supabase-js`)
- Vercel static hosting
- Optional local Lighthouse audit

---

## Task 0: Update DOX Contracts for SEO Scope
**Objective:** Make the project rules match the new SEO-first system.

**Files:**
- Modify: `AGENTS.md`
- Modify: `src/AGENTS.md`
- Modify: `content/AGENTS.md`
- Modify: `automation/AGENTS.md`

**Step 1: Update root contract**
Add SEO-specific rules:
- Posts must include `metaTitle`, `metaDescription`, `focusKeywords`, `searchIntent`, `faq`, `canonicalUrl`, and `jsonLd`.
- Hermes generation must produce original, research-backed, non-scraped content.
- Google #1 is a target, not a guarantee.
- Build must generate `sitemap.xml`, `robots.txt`, RSS, JSON-LD, canonical links, and clean semantic HTML.

**Step 2: Update child contracts**
- `src/AGENTS.md`: document Hermes runner, SEO validator, build, server.
- `content/AGENTS.md`: document required post JSON schema.
- `automation/AGENTS.md`: document 12-hour SEO publishing workflow and Supabase/Vercel env requirements.

**Verification:**
- Read changed docs and confirm no contradiction with existing DOX rules.

---

## Task 1: Define SEO Content Schema and Prompt System
**Objective:** Replace the current simple topic template with an SEO-ready content schema and Hermes prompt.

**Files:**
- Create: `src/agents/seo-prompt.mjs`
- Create: `src/agents/hermes-runner.mjs`
- Modify: `src/generator.mjs`

**Step 1: Define SEO prompt**
`src/agents/seo-prompt.mjs` exports:
- `buildSeoPrompt({ topic, keywordResearch, siteContext })`
- A strict JSON output schema Hermes must follow:
  - `title`
  - `slug`
  - `metaTitle`
  - `metaDescription`
  - `focusKeywords`
  - `searchIntent`
  - `audience`
  - `outline`
  - `bodyMarkdown`
  - `faq`
  - `internalLinks`
  - `tags`
  - `seoScore`
  - `claimsNeedingHumanCheck`

**Step 2: Hermes runner**
`src/agents/hermes-runner.mjs` calls:
```bash
hermes -z "<prompt>" --skills <optional>
```
Implementation:
- Use `child_process.spawn` or `execFile`.
- Pass prompt via stdin/args.
- Parse final JSON from stdout.
- If Hermes CLI is unavailable or fails, fall back to deterministic local generation.
- Add env knobs:
  - `HERMES_CLI_PATH`
  - `HERMES_MODEL`
  - `HERMES_PROVIDER`
  - `HERMES_SKILLS`
  - `HERMES_TIMEOUT_MS`

**Step 3: Generator integration**
`src/generator.mjs` must:
- Pick a keyword/topic slot.
- Build prompt.
- Call Hermes runner unless `--offline`.
- Validate output.
- Write post JSON to `content/posts/`.

**Verification:**
Run:
```bash
npm run generate -- --dry-run --offline
npm run generate -- --dry-run
```
Expected:
- Offline mode produces valid fallback JSON.
- Hermes mode attempts to call Hermes and either returns JSON or gracefully falls back.

---

## Task 2: Build Local SEO Keyword Research Inputs
**Objective:** Give Hermes structured keyword targets instead of vague topics.

**Files:**
- Create: `src/seo/keywords.mjs`
- Create: `content/keyword-clusters.json`
- Modify: `src/generator.mjs`

**Step 1: Create keyword clusters**
`content/keyword-clusters.json` should include long-tail, low-competition keyword groups such as:
```json
[
  {
    "cluster": "AI tools for students",
    "primaryKeyword": "AI tools for students",
    "secondaryKeywords": ["AI study planner", "AI notes summarizer", "AI flashcards"],
    "searchIntent": "informational/commercial investigation",
    "audience": "students",
    "difficulty": "low",
    "articleAngle": "Practical AI workflows for studying and assignments"
  }
]
```

**Step 2: Keyword selector**
`src/seo/keywords.mjs` exports:
- `loadKeywordClusters()`
- `selectKeywordCluster(slot)`
- `buildTopicFromCluster(cluster)`

**Step 3: Generator update**
Generator uses cluster data to build the Hermes prompt and slug.

**Verification:**
Run:
```bash
node -e "import('./src/seo/keywords.mjs').then(m => console.log(m.loadKeywordClusters().length))"
```
Expected: number > 0.

---

## Task 3: Supabase Schema and Sync
**Objective:** Store generated posts and SEO metadata in Supabase with proper indexes and RLS.

**Files:**
- Create: `automation/supabase_schema.sql`
- Create: `src/supabase.mjs`
- Create: `.env.example`
- Modify: `src/lib.mjs`
- Modify: `src/generator.mjs`
- Modify: `src/build.mjs`

**Step 1: Supabase schema**
`automation/supabase_schema.sql` must create:
- `posts`
- `seo_keywords`
- `content_versions`
- `publish_events`

Minimum `posts` columns:
- `id uuid primary key`
- `slug text unique`
- `title text`
- `body_markdown text`
- `meta_title text`
- `meta_description text`
- `focus_keywords text[]`
- `search_intent text`
- `canonical_url text`
- `json_ld jsonb`
- `faq jsonb`
- `status text`
- `published_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:
- `posts_slug_idx`
- `posts_published_at_idx`
- `posts_focus_keywords_idx` using GIN

RLS:
- Public read for published posts.
- Service role can insert/update.
- Anon can only select published posts.

**Step 2: Supabase client**
`src/supabase.mjs` initializes:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` for scripts
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` for public site if needed

Exports:
- `upsertPost(post)`
- `getPublishedPosts()`
- `recordPublishEvent(post)`

**Step 3: Sync behavior**
`src/generator.mjs`:
- Upsert post after local JSON write.
- If Supabase env vars are missing, log warning and continue local-only mode.

**Verification:**
- SQL file is syntactically readable.
- `npm run generate -- --dry-run --offline` still works without Supabase keys.
- With env vars, `npm run generate` writes to Supabase or logs a clear error.

---

## Task 4: SEO Static Build System
**Objective:** Make the generated HTML technically SEO-strong.

**Files:**
- Modify: `src/build.mjs`
- Modify: `src/lib.mjs`
- Modify: `src/styles.css`

**Step 1: Layout SEO head**
Every page must include:
- `<html lang="en">`
- canonical link
- meta title
- meta description
- Open Graph tags
- Twitter card tags
- JSON-LD script
- robots meta when applicable
- RSS link

**Step 2: Article page**
Article HTML must include:
- `<article>`
- `<h1>`
- `<time datetime>`
- author/publisher metadata
- FAQ section with `FAQPage` JSON-LD
- related posts section
- breadcrumbs
- internal links from post metadata

**Step 3: Homepage**
Homepage must include:
- H1 with primary niche keyword
- intro paragraph with secondary keywords
- latest posts
- topical cluster sections
- About/Author/Contact links

**Step 4: Static SEO files**
Generate:
- `robots.txt`
- `sitemap.xml`
- `rss.xml`
- `opensearch.xml`
- `feed.json` optional

**Verification:**
Run:
```bash
npm run build
grep -R "json-ld" -n public/posts | head
grep -R "canonical" -n public/posts | head
```
Expected:
- Post pages include canonical link and JSON-LD.
- `public/sitemap.xml` exists.
- `public/robots.txt` exists.

---

## Task 5: SEO Quality Gate
**Objective:** Prevent weak AI content from being published.

**Files:**
- Create: `src/seo/validator.mjs`
- Modify: `src/generator.mjs`
- Modify: `src/build.mjs`

**Step 1: Validator rules**
Reject or warn if:
- `seoScore < 0.80`
- title length outside 45-65 chars
- meta description outside 140-160 chars
- H1 missing
- focus keyword absent from title/meta/body
- no FAQ
- no internal links
- body under 900 words for target long-form posts
- claims need human check and `--strict` is enabled

**Step 2: Build-time SEO report**
`src/build.mjs` writes `public/seo-report.json`:
- post count
- warnings/errors
- per-post SEO score
- missing fields

**Verification:**
Run:
```bash
npm run generate -- --dry-run --offline
npm run build
node -e "const r=require('./public/seo-report.json'); console.log(r.summary)"
```

---

## Task 6: Vercel Deployment Setup
**Objective:** Make the site deploy cleanly to Vercel.

**Files:**
- Create: `vercel.json`
- Modify: `package.json`
- Modify: `.github/workflows/auto-blog.yml`

**Step 1: Vercel config**
`vercel.json`:
```json
{
  "buildCommand": "npm run generate && npm run build",
  "outputDirectory": "public",
  "installCommand": "npm ci"
}
```

**Step 2: Scripts**
Add:
- `npm run preview:seo`
- `npm run audit:seo`
- `npm run sync:supabase` optional

**Step 3: GitHub Actions**
Scheduled workflow must:
- Checkout
- Setup Node
- `npm ci`
- `npm run generate`
- `npm run build`
- Commit `content/posts` and `public`
- Push

**Verification:**
If Vercel CLI is available:
```bash
npx vercel build
```
Expected:
- Build exits 0.
- `public/index.html` and post pages exist.

---

## Task 7: Final SEO Audit and Indexing Prep
**Objective:** Validate ranking readiness and prepare Google indexing.

**Files:**
- Create: `scripts/audit-seo.mjs`
- Create: `scripts/submit-sitemap.sh` optional

**Step 1: Audit script**
Checks:
- sitemap URLs exist
- canonical tags exist
- no `noindex` unless intentional
- JSON-LD parses
- meta lengths
- internal links exist
- page titles unique
- slugs stable
- sitemap includes only published posts

**Step 2: Google Search Console prep**
Create instructions in `README.md`:
- Verify domain/URL prefix.
- Submit `https://yourdomain.com/sitemap.xml`.
- Request indexing for homepage and first 10 posts.
- Monitor coverage, Core Web Vitals, and queries.

**Verification:**
Run:
```bash
npm run audit:seo
```
Expected:
- No blocking errors.
- Warnings are documented and actionable.

---

## Open Questions Before Full Execution
1. **Domain:** What exact domain will be used? SEO needs canonical URLs.
2. **Brand/site name:** What should replace "Auto Workflow Blog"?
3. **Author identity:** Do we publish under a real person/brand for E-E-A-T?
4. **Target country/language:** US/UK/global English?
5. **Hermes CLI mode:** Should the generator call local `hermes -z` in CI/GitHub Actions, or only locally?
6. **Keyword clusters:** Do you want me to create the first 20 long-tail clusters automatically, or do you have a niche list?
7. **Strictness:** Should the SEO gate block publishing if score < 0.80, or only warn?
8. **Supabase project:** Do you already have a Supabase project URL and service role key?

---

## Execution Order
1. Task 0 — DOX contracts
2. Task 1 — Hermes SEO prompt + runner
3. Task 2 — keyword clusters
4. Task 3 — Supabase schema/sync
5. Task 4 — SEO build
6. Task 5 — SEO quality gate
7. Task 6 — Vercel deployment
8. Task 7 — final SEO audit

**Default if user does not answer open questions:**
- Domain: Vercel preview URL during testing.
- Brand: "Auto Workflow Blog".
- Author: "AI Workflow Team".
- Country/language: global English.
- Hermes: local CLI `hermes -z` with deterministic fallback.
- Keyword clusters: auto-generate 20 long-tail clusters.
- Strictness: warn only for MVP, block later.
- Supabase: local-only if keys are missing.

# SEO Ranking Integration & Automated Content Generation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform the blogging site into an SEO-optimized engine that ranks #1 on Google for its niche, leveraging Hermes Agent for high-quality, SEO-mastered content generation.

**Architecture:**
- **Generation:** Hook Hermes into `generator.mjs` to fetch structured, SEO-optimized content based on targeted keyword research.
- **SEO Strategy:** Implement automated meta tags, structured data (JSON-LD), semantic HTML, and XML sitemap optimization.
- **Database:** Use Supabase to store content, analytics, and SEO metadata.
- **Deployment:** Vercel for fast edge-hosting.

**Tech Stack:**
- Hermes Agent (Content Generation)
- Supabase (Storage & Auth)
- Vercel (Hosting)
- Node.js (Static build/Automation)

---

### Task 1: Initialize Supabase Schema
- **Objective:** Create tables for posts, metadata, and SEO performance tracking.
- **Files:** `automation/supabase_schema.sql` (new)
- **Steps:** Define schema for `posts` (id, slug, title, body, meta_description, keywords, created_at, updated_at).

### Task 2: Implement Hermes Generation Bridge
- **Objective:** Enable Hermes to generate content in `src/generator.mjs`.
- **Files:** `src/generator.mjs`
- **Steps:** 
    1. Implement prompt structure for SEO-mastery.
    2. Add logic to interface with an LLM agent for drafting.

### Task 3: SEO Optimization Layer
- **Objective:** Add semantic markup and meta tags.
- **Files:** `src/build.mjs`
- **Steps:**
    1. Integrate JSON-LD schema for blog posts.
    2. Ensure meta descriptions are auto-generated from LLM output.
    3. Update `rss.xml` and `sitemap.xml` for better indexability.

### Task 4: Integrate Supabase Storage
- **Objective:** Sync build process to Supabase.
- **Files:** `src/lib.mjs`, `src/build.mjs`
- **Steps:**
    1. Use `@supabase/supabase-js` to push new posts to the DB upon generation.
    2. Configure DB env vars.

### Task 5: Vercel Deployment Setup
- **Objective:** Prepare project for Vercel deployment.
- **Files:** `vercel.json`
- **Steps:**
    1. Configure build command and output directory.
    2. Ensure all environment variables are mapped.

### Task 6: Final SEO Audit & Verification
- **Objective:** Verify ranking readiness.
- **Steps:**
    1. Run Lighthouse audit locally on generated posts.
    2. Check semantic structure.

---

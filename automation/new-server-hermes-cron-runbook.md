# New Server Hermes Cron Runbook

Use this when the current AWS server dies, free tier is cancelled, or you want to move autonomous publishing to another machine.

Goal: restore the repo, restore blog content from Supabase, verify the static site, then recreate the Hermes cron job that publishes one SEO blog post every 12 hours.

## What must already exist

- GitHub repo: `https://github.com/muneeb1st/mdevtech-Blogs`
- Production site: `https://mdevtech.vercel.app`
- Supabase project with `automation/supabase_schema.sql` already applied, or access to run that SQL again
- A Supabase **service-role** key for server-side backup/restore
- A GitHub PAT or SSH deploy key with permission to push to `muneeb1st/mdevtech-Blogs`
- Hermes Agent installed and configured with a working model/provider

Never commit `.env`, PATs, service-role keys, OAuth tokens, or generated credential files.

## 1. Install base packages

Ubuntu example:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
```

Install Node.js 22+ if the server does not already have it. Then verify:

```bash
node --version
npm --version
git --version
```

## 2. Install and configure Hermes

Install Hermes Agent:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

Restart the shell or add Hermes to PATH if needed, then run:

```bash
hermes setup
hermes doctor
hermes cron list
```

Configure the model/provider inside `hermes setup` or `hermes model`. The blog generator calls Hermes through the local `hermes` CLI by default.

## 3. Clone the repo

```bash
git clone https://github.com/muneeb1st/mdevtech-Blogs /home/ubuntu/mdevtech-Blogs
cd /home/ubuntu/mdevtech-Blogs
npm ci
```

If restoring to a different username or path, keep the cron prompt consistent with the actual repo path.

## 4. Create local `.env`

Create `/home/ubuntu/mdevtech-Blogs/.env` manually. Do not commit it.

```bash
cd /home/ubuntu/mdevtech-Blogs
cp .env.example .env
nano .env
```

Minimum values:

```dotenv
SITE_URL=https://mdevtech.vercel.app
STRICT_SEO=1
PREFER_LOW_DIFFICULTY_KEYWORDS=1
HERMES_TIMEOUT_MS=600000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>
```

Use the Supabase project root URL only. Do **not** use a `/rest/v1/` URL in `.env`.

Verify `.env` is ignored:

```bash
git check-ignore .env
```

Expected output:

```txt
.env
```

## 5. Initialize Supabase schema if needed

If the Supabase project is new or missing tables, open the Supabase SQL editor and run:

```txt
automation/supabase_schema.sql
```

Required tables:

- `posts`
- `seo_keywords`
- `content_versions`
- `publish_events`

`content_versions.payload` is the durable restore source. It stores the full original post JSON.

## 6. Restore posts from Supabase

```bash
cd /home/ubuntu/mdevtech-Blogs
npm run supabase:restore
npm run supabase:verify
```

Expected result:

```txt
[Supabase] Restored N post(s) into content/posts/.
[Supabase] Backup verification passed.
```

If restore returns 0 posts, check:

- Supabase URL is the project root URL
- service-role key is correct
- `content_versions` has rows
- `posts` has rows
- RLS policies from `automation/supabase_schema.sql` exist

## 7. Build and verify the restored site

```bash
npm run build:strict
npm run audit:seo:strict
```

Expected result:

```txt
SEO report: 0 errors, 0 warnings
SEO audit passed.
Strict mode: passed.
```

Optional local preview:

```bash
npm run dev
```

Then fetch `/` and one post URL from the local server.

## 8. Configure Git push for non-interactive cron

Hermes cron runs non-interactively. Do not assume `.bashrc` credentials are loaded.

Recommended HTTPS credential helper method:

```bash
git config --global credential.helper store
```

Then approve the credential without putting the PAT in the remote URL:

```bash
git credential approve <<'EOF'
protocol=https
host=github.com
username=YOUR_GITHUB_USERNAME
password=YOUR_GITHUB_PAT_WITH_REPO_WRITE
EOF
```

Verify push access without printing secrets:

```bash
git ls-remote origin refs/heads/main
```

Alternative: use an SSH deploy key with write access, then set the remote to SSH.

Never use:

```bash
git remote set-url origin https://TOKEN@github.com/...
```

That leaks tokens through shell history, process lists, and logs.

## 9. One-time publishing test before enabling cron

Run the exact publishing path once:

```bash
cd /home/ubuntu/mdevtech-Blogs
export SITE_URL=https://mdevtech.vercel.app
export STRICT_SEO=1
export PREFER_LOW_DIFFICULTY_KEYWORDS=1
export HERMES_TIMEOUT_MS=600000
npm ci
npm run generate
npm run build:strict
npm run audit:seo:strict
npm run supabase:backup
npm run supabase:verify
```

If any command fails, fix it before creating the recurring cron job.

If changes were generated and strict SEO passed:

```bash
git add content/posts public scripts src package.json package-lock.json .github/workflows automation AGENTS.md README.md vercel.json static
if git diff --cached --name-only | grep -E '(^|/)\.env($|\.)|secret|credentials|token'; then
  echo 'Secret-looking file staged. Stop.'
  exit 1
fi
git commit -m "chore: generate scheduled SEO blog post"
git push origin main
```

## 10. Create the Hermes cron job

Schedule:

```txt
15 0,12 * * *
```

This runs at:

- `00:15 UTC` = `05:15 PKT`
- `12:15 UTC` = `17:15 PKT`

Preferred method: open Hermes on the new server and ask it to create a cron job with this self-contained prompt.

Cron name:

```txt
mdevtech autonomous SEO blog publisher
```

Cron workdir:

```txt
/home/ubuntu/mdevtech-Blogs
```

Cron prompt:

```txt
You are the scheduled Hermes publishing agent for mdevtech Blogs.

Repository:
/home/ubuntu/mdevtech-Blogs

Production site:
https://mdevtech.vercel.app

GitHub repo:
https://github.com/muneeb1st/mdevtech-Blogs

Mission:
Every run, publish at most one high-quality SEO blog post using the repo's existing autonomous publishing system. Use Hermes generation by default through npm run generate. Do not bypass the repo's validation system. AWS/Hermes cron is the owner of recurring publishing. GitHub Actions must remain manual-only to avoid racing this cron job.

Before doing anything:
1. cd /home/ubuntu/mdevtech-Blogs
2. Read AGENTS.md, src/AGENTS.md, content/AGENTS.md, and automation/AGENTS.md.
3. Check git status.
4. If git status --porcelain is not empty before starting, stop and report the dirty files. Do not reset, delete, overwrite, or force-clean user work.
5. Pull latest main using fast-forward only:
   git checkout main
   git pull --ff-only origin main

Required environment for all publishing commands:
- SITE_URL=https://mdevtech.vercel.app
- STRICT_SEO=1
- PREFER_LOW_DIFFICULTY_KEYWORDS=1
- HERMES_TIMEOUT_MS=600000

Supabase backup environment:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Set/export the required environment variables before running npm scripts. If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are available from the server environment or .env, the backup scripts must sync the validated local post JSON into Supabase. Never print or commit secrets.

Publishing steps:
1. Install dependencies:
   npm ci

2. Generate at most one post:
   npm run generate

3. Build with strict SEO gates:
   npm run build:strict

4. Run strict SEO audit:
   npm run audit:seo:strict

5. Back up validated post data to Supabase when credentials exist:
   npm run supabase:backup
   npm run supabase:verify

   If Supabase credentials are missing, these scripts should skip safely and report that backups are not enabled. If Supabase credentials exist but syncing fails, stop, do not commit, do not push, and report the exact error.

6. If any command fails:
   - Stop.
   - Do not commit.
   - Do not push.
   - Report the exact failing command, error, and affected file/post if known.

7. Verify these files exist after build:
   public/sitemap.xml
   public/sitemap-index.xml
   public/atom.xml
   public/rss.xml
   public/feed.json
   public/robots.txt

8. Verify robots.txt contains:
   Sitemap: https://mdevtech.vercel.app/sitemap-index.xml
   Sitemap: https://mdevtech.vercel.app/sitemap.xml
   Sitemap: https://mdevtech.vercel.app/atom.xml

9. Stage only intended publishing files:
   git add content/posts public scripts src package.json package-lock.json .github/workflows automation AGENTS.md README.md vercel.json static

10. If staged diff is empty:
   Report "No new post generated; nothing to publish."
   Stop successfully.

11. Before committing, verify no .env files or secret-looking files are staged.

12. Commit:
   git commit -m "chore: generate scheduled SEO blog post"

13. Push:
   git push origin main

After pushing, report:
- New post title
- New post slug
- Whether strict SEO passed
- Whether Supabase backup ran, skipped for missing credentials, or failed
- Whether sitemap.xml, sitemap-index.xml, atom.xml, rss.xml, feed.json, and robots.txt were regenerated
- Whether push succeeded

Disaster recovery:
On a new server, clone the repo, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, run npm ci, then run npm run supabase:restore to rebuild content/posts/ from Supabase content_versions.payload before running build/audit/cron.

Discovery/indexing:
Do not manually request indexing every run. Google should discover new posts through sitemap-index.xml, sitemap.xml, atom.xml, RSS, /posts/, and internal links. Search Console may say "Couldn't fetch" even when the sitemap is live.

Hard safety rules:
- Never commit .env files.
- Never commit secrets.
- Never use git reset --hard.
- Never use force push.
- Never bypass strict SEO validation.
- Never publish if npm run build:strict fails.
- Never publish if npm run audit:seo:strict fails.
- Never publish generic AI filler.
- Never publish duplicate-looking posts.
- Never publish a post without internal links.
- Never publish a post without FAQ.
- Never publish a post without BlogPosting JSON-LD-ready fields.
- Never publish a post without copy-paste prompt/template.
- Never publish a post without tool comparison table.
- Never publish a post without mistakes-to-avoid section.
- Never publish a post without verification guidance.
- Never publish a post without final checklist.
- Prefer low-difficulty long-tail workflow keywords.
- Do not chase broad keywords like "AI tools" until the site has traffic.
```

If using the Hermes cron CLI directly, inspect available flags first because CLI options can change:

```bash
hermes cron --help
hermes cron create --help
```

Then create an equivalent job with:

- schedule: `15 0,12 * * *`
- workdir: `/home/ubuntu/mdevtech-Blogs`
- toolsets: `terminal,file`
- delivery: origin/current chat or your preferred alert channel

## 11. Verify the cron job

```bash
hermes cron list
hermes cron status
```

Trigger a manual run if you want immediate proof:

```bash
hermes cron run <job_id>
```

After the run, verify:

```bash
cd /home/ubuntu/mdevtech-Blogs
git status --short
git log --oneline -3
npm run supabase:verify
```

Expected:

- strict SEO passes
- Supabase backup verification passes
- GitHub push succeeds
- Vercel deploys from `main`
- next scheduled run is still active

## 12. Recovery checklist

Use this as the short version:

```bash
# Install Hermes + Node + Git first, then:
git clone https://github.com/muneeb1st/mdevtech-Blogs /home/ubuntu/mdevtech-Blogs
cd /home/ubuntu/mdevtech-Blogs
npm ci
cp .env.example .env
# Fill .env with SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRICT_SEO=1, PREFER_LOW_DIFFICULTY_KEYWORDS=1
npm run supabase:restore
npm run supabase:verify
npm run build:strict
npm run audit:seo:strict
# Configure Git push credentials
# Create Hermes cron: schedule 15 0,12 * * *, workdir /home/ubuntu/mdevtech-Blogs, toolsets terminal,file
```

## Common failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY` | `.env` missing or cron workdir wrong | Put `.env` in repo root and set cron workdir to the repo path |
| Supabase 401/403 | Wrong key or anon key used instead of service-role key | Use the service-role key only on trusted servers |
| Restore returns 0 posts | Schema/data missing | Run `automation/supabase_schema.sql`, then verify `posts` and `content_versions` rows exist |
| Git push fails in cron | Non-interactive shell has no Git credentials | Configure credential helper or SSH deploy key; never put token in remote URL |
| Cron does nothing | Wrong workdir or dirty repo blocks start | Run `hermes cron list`, inspect output, and check `git status --short` |
| Vercel does not update | GitHub push failed or Vercel not connected to `main` | Check GitHub commit and Vercel project deployment settings |

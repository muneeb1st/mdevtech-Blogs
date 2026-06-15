# Content

## Purpose

Stores generated blog posts and keyword clusters as JSON source files.

## Ownership

- `posts/` contains individual post JSON files.
- `keyword-clusters.json` contains long-tail keyword clusters used by Hermes and the generator.
- Content must be original, practical, evergreen, SEO-shaped, and safe for static publishing.

## Local Contracts

Each post JSON must include:

- `title`
- `slug`
- `date`
- `niche`
- `excerpt`
- `tags`
- `body`
- `metaTitle`
- `metaDescription`
- `focusKeywords`
- `searchIntent`
- `faq`
- `internalLinks`
- `canonicalUrl`
- `jsonLd`
- `seoScore`
- `claimsNeedingHumanCheck`

## Work Guidance

- Avoid scraped copyrighted content.
- Keep the niche focused on automatable AI workflows for students, freelancers, and small businesses.
- Use clear headings, short paragraphs, practical checklists, FAQ sections, and internal links.
- Use keyword clusters to target long-tail ranking opportunities, not generic high-competition terms.

## Verification

Run `npm run build` and `npm run audit:seo` after adding or editing posts.

## Child DOX Index

None.

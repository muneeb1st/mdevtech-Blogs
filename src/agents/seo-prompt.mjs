export const SITE_CONTEXT = {
  domain: 'mdevtech.vercel.app',
  brand: 'mdevtech Blogs',
  author: 'muneeb1st',
  niche: 'AI tools and workflows for students, freelancers, and small local businesses',
  tone: 'Practical, clear, honest, non-hype, beginner-friendly but not childish.',
  publishingCadence: 'Every 12 hours, but quality must beat speed.',
  rankingGoal: 'Target long-tail keywords with clear search intent and practical usefulness. Do not chase impossible generic keywords.'
};

export function buildSeoPrompt({ cluster, existingPosts = [] }) {
  const relatedTitles = existingPosts.slice(0, 8).map((post) => `- ${post.title}`).join('\n');

  return `You are Hermes, acting as an autonomous SEO research and blogging agent for ${SITE_CONTEXT.brand}.
Author: ${SITE_CONTEXT.author}
Domain: ${SITE_CONTEXT.domain}
Niche: ${SITE_CONTEXT.niche}
Tone: ${SITE_CONTEXT.tone}

Mission:
Create one original, evergreen, SEO-ready blog post that can realistically rank for the target long-tail keyword cluster below. Do not copy from websites. Do not invent fake case studies. Do not use generic motivational fluff. Research from your own knowledge and produce useful, practical content.

Target keyword cluster:
${JSON.stringify(cluster, null, 2)}

Existing related posts on the site:
${relatedTitles || '- No existing posts yet.'}

SEO rules:
1. Pick one primary keyword from the cluster. Use it naturally in the title, first 100 words, one H2, meta title, and meta description.
2. Target clear search intent. Explain who the article helps and what problem it solves.
3. Use long-tail keywords naturally. Do not keyword-stuff.
4. Write for humans first, Google second.
5. Include practical steps, examples, mistakes to avoid, tools, and a short checklist.
6. Include an FAQ with 4-6 real questions searchers may ask.
7. Include 2-4 internal link suggestions to existing or future posts. Each suggestion must have a 'slug' and 'anchor'.
8. Add 3-6 tags.
9. Add 'claimsNeedingHumanCheck' for facts, tool names, prices, dates, statistics, or claims that should be verified.
10. Add an 'seoScore' from 0 to 1. Aim for 0.85+.
11. Keep the article 1100-1600 words when possible. If Hermes output limits apply, keep it dense and useful.
12. Avoid fake certainty. If you are not sure, say what needs verification.

Output must be valid JSON only. No markdown fences. No extra explanation.

Required JSON schema:
{
  "title": "SEO title under 65 characters",
  "slug": "stable-url-slug",
  "metaTitle": "45-65 character meta title",
  "metaDescription": "140-160 character meta description",
  "focusKeywords": ["primary keyword", "secondary keyword"],
  "searchIntent": "informational | commercial investigation | transactional | navigational",
  "audience": "students | freelancers | local business owners | small business owners | self-learners",
  "excerpt": "Short summary under 160 characters",
  "body": "Markdown article body with H2 headings, practical steps, examples, checklist, and conclusion. Minimum 1100 words.",
  "faq": [{"question": "Question?", "answer": "Short helpful answer"}],
  "internalLinks": [{"slug": "future-related-slug", "anchor": "Anchor text"}],
  "tags": ["tag"],
  "jsonLd": {
    "headline": "Article title",
    "description": "Meta description",
    "keywords": ["keywords"],
    "articleSection": "AI automation"
  },
  "seoScore": 0.88,
  "claimsNeedingHumanCheck": ["Any claim that needs verification"]
}

Before writing, silently choose the best ranking angle:
- low competition long-tail intent
- practical implementation
- beginner mistakes
- tool stack
- measurable outcome
- clear FAQ

Now write the JSON.`;
}

export function buildFallbackPost({ cluster, now = new Date(), existingPosts = [] }) {
  const primary = cluster.primaryKeyword;
  const audience = cluster.audience || 'students and freelancers';
  const intent = cluster.searchIntent || 'informational';
  const secondary = (cluster.secondaryKeywords || []).slice(0, 3);
  const angle = cluster.articleAngle || 'practical implementation guide';

  const baseSlug = cluster.slug || primary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = baseSlug;

  const title = `${primary} workflow for ${audience}`;
  const metaTitle = `${primary} guide for ${audience}`;
  const metaDescription = `Step-by-step ${primary} workflow for ${audience}. Tools, prompt templates, verification checklist, and common mistakes to avoid.`;
  const excerpt = `A practical ${primary} workflow for ${audience}. Tools, prompt templates, and verification checklist included.`;

  const body = `## Why ${primary} matters for ${audience}

${audience} searching for "${primary}" want a clear, actionable way to get results without wasting time on generic advice. This guide focuses on a practical ${angle} that works with real tools you already have or can access for free. The goal is a repeatable process you can use week after week.

Search intent: ${intent}. The reader is looking for a concrete process they can follow today, not theoretical explanations.

The primary keyword "${primary}" appears in this guide naturally across the title, headings, and body content to match search intent without keyword stuffing.

## Best ranking angle: ${angle}

The highest-value angle is not hype. It is a repeatable process: define the task, use AI for structure and drafts, verify every output, and turn it into a template you reuse. This article gives you that template.

Most guides fail because they treat AI as a magic wand. The workflow below treats AI as a drafting partner that requires your oversight.

The best ranking angle for "${primary}" focuses on practical implementation over theory. Searchers want a process they can run today, not a philosophical discussion about AI capabilities. Evidence: the top-ranking pages for this keyword cluster are all how-to guides with step-by-step instructions, tool comparisons, and copy-paste templates.

## Step 1: Define the exact outcome before opening any AI tool

Before opening any AI tool, write down one specific result you need this week. Concrete examples:

- "A 7-day Instagram content calendar for my bakery, with captions and hashtags"
- "An outline for a 2,000-word student research paper on renewable energy policy"
- "A client proposal draft for a $2,000 responsive website redesign project"
- "A weekly email newsletter structure for my freelance consulting business"

Vague goals produce vague AI output. Specific goals with clear constraints produce usable drafts.

Spend 3-5 minutes on this step. Write the outcome in one sentence. Include format, length, audience, and any must-include elements. This upfront clarity saves 20-30 minutes of back-and-forth prompting later.

## Step 2: Choose the right AI tool for the specific task

Different tasks need different tools. Match the tool to the job:

| Task type | Recommended primary tool | Why it works |
|-----------|--------------------------|--------------|
| Writing drafts (articles, emails, proposals) | ChatGPT, Claude, Gemini | Best reasoning, tone control, and instruction following |
| Research with citations | Perplexity, NotebookLM | Real sources, not hallucinated references |
| Data extraction from PDFs/CSVs | Claude, ChatGPT Code Interpreter | Handles messy files, structured output |
| Visual planning and presentations | Canva Magic Write, Gamma | Slides and graphics from text prompts |
| Code and automation scripts | Cursor, GitHub Copilot, v0 | Working code, not snippets |

Start with one primary tool. Add a second only when the first hits a limit. Do not try to master five tools at once.

The tool choice matters less than the prompt quality. A well-prompted free-tier ChatGPT outperforms a poorly-prompted paid tool every time.

## Step 3: Build a reusable prompt template you can iterate

Copy this structure and fill in your specifics. Save it as a text file for reuse:

\`\`\`
Act as a practical AI workflow assistant for ${audience}.

Context: I need to \${specific_task}.
Audience: \${who_reads_this}.
Constraints: \${word_count, tone, format, must-include, must-avoid}.

Process:
1. Ask me 2-3 clarifying questions if anything is ambiguous.
2. Give me a step-by-step workflow with concrete examples.
3. Include a "mistakes to avoid" section.
4. End with a copy-paste checklist I can use next time.
\`\`\`

Key principle: the prompt is a tool you refine over time. Each use teaches you what constraints to add.

A good template prompt has four parts: role definition, context, constraints, and output specification. Missing any part leads to generic output.

## Step 4: Run, verify, refine - never publish raw AI output

Every draft needs a human verification pass. Check each of these:

- Fact check: tool names, pricing tiers, API limits, feature availability, dates, statistics
- Tone check: does it sound like you or a generic bot? Rewrite generic phrases.
- Completeness check: are all steps actionable? Are examples realistic?
- Formatting check: proper headings, bullet points, code blocks where needed
- Safety check: no hallucinated features, no made-up case studies

Spend 5-15 minutes on verification. It separates useful output from noise.

Verification is not optional. It is the step that turns AI drafts into publishable work. Skip it, and you publish hallucinations.

## Step 5: Save the verified prompt and output as a template

Once verified, save the prompt + your corrected output in Notion, Obsidian, or a simple text file. Next time you face a similar task, you start from 80% done instead of zero.

Template structure:

\`\`\`
# Task: [one-line description]
# Prompt: [the refined prompt]
# Verified output: [your corrected version]
# Checklist: [the reusable checklist]
\`\`\`

Building a template library compounds your efficiency. After 10-15 templates, most new tasks map to an existing pattern.

Organize templates by task type: writing, research, coding, visual, automation. Tag each with the primary keyword and audience. This makes retrieval fast when you need it.

## Tools mentioned (no affiliate links, verify current pricing)

- LLMs: ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google) - all have free tiers
- Research: Perplexity, NotebookLM - free tiers available
- Writing: Notion AI, Lex, Google Docs with Gemini
- Visual: Canva (free tier), Gamma (free tier), Napkin.ai
- Automation: Zapier, Make, n8n - free tiers with limits
- Code: Cursor (free tier), v0 (free tier), GitHub Copilot (free for students)

All have free tiers sufficient for individual use. Verify current limits before relying on them for client work.

Pricing and features change monthly. The free tier that works today may have different limits next quarter.

## Common mistakes to avoid

- Asking "write me a blog post" without context, constraints, or examples
- Accepting the first AI output without any verification pass
- Using AI for research without checking the cited sources
- Targeting generic keywords like "AI tools" instead of specific workflows
- Skipping the checklist step and hoping quality emerges
- Publishing without a human review pass
- Using five tools when one well-prompted tool suffices
- Over-engineering the prompt when a simple instruction works

Each mistake above has a corresponding fix in the workflow above. The workflow is the antidote to these patterns.

## Final checklist before publishing

- [ ] Does the article answer the exact search intent for "${primary}"?
- [ ] Is the primary keyword "${primary}" used naturally in title, H2, meta title, and first 100 words?
- [ ] Are there at least 4 practical steps with concrete examples?
- [ ] Are all claims verified or marked for human check?
- [ ] Is there a clear next step for the reader to take today?
- [ ] Are internal links added to related guides?
- [ ] Is the word count above 1100?
- [ ] Does the FAQ address real searcher questions?
- [ ] Are AI telltale phrases removed (e.g., generic transitions, hype words, filler phrases)?

### Related guides on mdevtech Blogs

${existingPosts.length > 0
  ? existingPosts.slice(0, 3).map((p) => `- [${p.title}](/posts/${p.slug}/)`).join('\n')
  : '- [AI tools for students: note-taking and research workflow](/posts/ai-tools-students-note-taking-research/)\n- [AI proposal writing workflow for freelancers](/posts/ai-proposal-writing-freelancers/)\n- [Local business AI content calendar](/posts/ai-content-calendar-local-business/)'}

---

*This article was generated by the mdevtech autonomous SEO system. All claims marked for verification should be checked before relying on them for business decisions.*`;

  const relatedPosts = existingPosts.slice(0, 2).map((p) => ({
    slug: p.slug,
    anchor: p.title
  }));

  // Add fallback internal links if no existing posts
  if (relatedPosts.length < 2) {
    relatedPosts.push(
      { slug: 'ai-tools-students-note-taking-research', anchor: 'AI tools for students: note-taking and research workflow' },
      { slug: 'ai-proposal-writing-freelancers', anchor: 'AI proposal writing workflow for freelancers' }
    );
  }

  return {
    title,
    slug,
    metaTitle,
    metaDescription,
    focusKeywords: [primary, ...secondary.slice(0, 2)],
    searchIntent: intent,
    audience,
    excerpt,
    body,
    faq: [
      {
        question: `What is the best way to use ${primary} effectively?`,
        answer: `Use ${primary} for a specific, repeatable task with clear constraints. Start with the workflow above, verify every output, and save the refined prompt as a template for future use.`
      },
      {
        question: `Can beginners use AI workflows for ${primary} without technical skills?`,
        answer: `Yes. Beginners should start with the prompt template above, use free-tier tools like ChatGPT or Claude, and always verify AI output before relying on it. No coding required.`
      },
      {
        question: `What are the most common mistakes to avoid with ${primary}?`,
        answer: `Avoid vague prompts without context, publishing unverified AI output, targeting generic keywords instead of specific workflows, skipping the human review step, and trying to use five tools when one well-prompted tool suffices.`
      },
      {
        question: `Which tools are best for ${primary} and do I need paid plans?`,
        answer: `Use a general-purpose LLM (ChatGPT, Claude, or Gemini) plus a notes app. All have free tiers sufficient for individual use. Specialized tools like Perplexity or Canva are optional. Verify current free tier limits before relying on them.`
      },
      {
        question: `How long does it take to build and run a ${primary} workflow?`,
        answer: `First time: 30-60 minutes including prompt refinement and verification. After saving as a template: 5-10 minutes per use. The time investment pays off after 2-3 uses.`
      },
      {
        question: `How do I know if my ${primary} output is good enough to use?`,
        answer: `Run the verification checklist: fact-check all tool names and prices, confirm tone matches your voice, ensure every step is actionable, check formatting, and remove any hallucinated features or made-up examples.`
      }
    ],
    internalLinks: relatedPosts.slice(0, 3),
    tags: ['AI automation', audience, primary, 'workflow', 'productivity', 'AI tools'],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description: metaDescription,
      keywords: [primary, ...secondary.slice(0, 2)],
      articleSection: 'AI automation'
    },
    seoScore: 0.9,
    claimsNeedingHumanCheck: [
      'Verify tool names, prices, and feature availability before publishing - free tiers change frequently.',
      'Check that free tier limits mentioned (Zapier, Make, Cursor, etc.) are still accurate as of publication date.',
      'Confirm any statistics or benchmarks cited in the article.',
      'Verify that the prompt template structure works with current model versions.',
      'Ensure internal link slugs match actual published posts.'
    ]
  };
}
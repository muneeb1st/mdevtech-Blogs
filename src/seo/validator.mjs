export function validatePostSeo(post, options = {}) {
  const {
    strict = process.env.STRICT_SEO === '1',
    minScore = 0.88,
    minWords = 1200,
    minFaq = 4,
    minInternalLinks = 2,
    maxTitleLength = 70,
    minTitleLength = 40,
    maxMetaTitleLength = 65,
    minMetaTitleLength = 45,
    maxMetaDescLength = 165,
    minMetaDescLength = 140,
    requirePrimaryInH2 = true,
    siteUrl = process.env.SITE_URL || 'https://mdevtech.vercel.app'
  } = options;

  const errors = [];
  const warnings = [];

  const required = [
    'title',
    'slug',
    'date',
    'niche',
    'excerpt',
    'tags',
    'body',
    'metaTitle',
    'metaDescription',
    'focusKeywords',
    'searchIntent',
    'faq',
    'internalLinks',
    'canonicalUrl',
    'jsonLd',
    'seoScore',
    'claimsNeedingHumanCheck'
  ];

  for (const key of required) {
    if (post[key] === undefined || post[key] === null || post[key] === '') errors.push(`Missing required field: ${key}`);
  }

  const titleLength = post.title?.length || 0;
  const metaTitleLength = post.metaTitle?.length || 0;
  const metaDescriptionLength = post.metaDescription?.length || 0;
  const bodyWordCount = countWords(post.body || '');
  const bodyLower = (post.body || '').toLowerCase();
  const bodyText = bodyLower;

  if (titleLength < minTitleLength || titleLength > maxTitleLength) pushOrError(errors, warnings, strict, `Title length ${titleLength} must be ${minTitleLength}-${maxTitleLength} characters.`);
  if (metaTitleLength < minMetaTitleLength || metaTitleLength > maxMetaTitleLength) pushOrError(errors, warnings, strict, `Meta title length ${metaTitleLength} must be ${minMetaTitleLength}-${maxMetaTitleLength} characters.`);
  if (metaDescriptionLength < minMetaDescLength || metaDescriptionLength > maxMetaDescLength) pushOrError(errors, warnings, strict, `Meta description length ${metaDescriptionLength} must be ${minMetaDescLength}-${maxMetaDescLength} characters.`);
  if (bodyWordCount < minWords) pushOrError(errors, warnings, strict, `Body word count ${bodyWordCount} is below required ${minWords} words.`);
  if (!Array.isArray(post.faq) || post.faq.length < minFaq) pushOrError(errors, warnings, strict, `FAQ should contain at least ${minFaq} questions.`);
  if (!Array.isArray(post.internalLinks) || post.internalLinks.length < minInternalLinks) pushOrError(errors, warnings, strict, `Add at least ${minInternalLinks} internal links.`);
  if (!Array.isArray(post.focusKeywords) || post.focusKeywords.length < 1) errors.push('Focus keywords must be an array with at least one keyword.');

  const primary = post.focusKeywords?.[0] || '';
  const primaryLower = primary.toLowerCase();

  if (primary && !post.title.toLowerCase().includes(primaryLower)) pushOrError(errors, warnings, strict, 'Primary keyword must appear in the title.');
  if (primary && !post.metaTitle.toLowerCase().includes(primaryLower)) pushOrError(errors, warnings, strict, 'Primary keyword must appear in the meta title.');
  if (primary && !bodyLower.includes(primaryLower)) pushOrError(errors, warnings, strict, 'Primary keyword must appear naturally in the body.');

  if (primary) {
    const first100 = post.body?.slice(0, 600).toLowerCase() || '';
    if (!first100.includes(primaryLower)) pushOrError(errors, warnings, strict, 'Primary keyword should appear in the first 100 words of the body.');
  }

  if (requirePrimaryInH2 && primary) {
    const h2Matches = post.body?.match(/^##\s+.+$/gm) || [];
    const hasPrimaryInH2 = h2Matches.some((h2) => h2.toLowerCase().includes(primaryLower));
    if (!hasPrimaryInH2) pushOrError(errors, warnings, strict, 'Primary keyword should appear in at least one H2 heading.');
  }

  if (primary && bodyLower.length > 0) {
    const occurrences = (bodyLower.match(new RegExp(primaryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const density = occurrences / bodyWordCount;
    if (density > 0.03) pushOrError(errors, warnings, strict, `Primary keyword density ${(density * 100).toFixed(1)}% may be too high (target ~1-2%).`);
  }

  const h2Sections = post.body?.split(/^##\s+/m).slice(1) || [];
  const thinSections = h2Sections.filter((section) => countWords(section) < 100).length;
  if (thinSections > 1) pushOrError(errors, warnings, strict, `${thinSections} H2 sections have fewer than 100 words each. Expand thin sections.`);

  if (!Array.isArray(post.tags) || post.tags.length < 3) pushOrError(errors, warnings, strict, 'Tags should contain at least 3 relevant tags.');
  if (Array.isArray(post.tags) && post.tags.length > 8) pushOrError(errors, warnings, strict, `Tags should not exceed 8 (currently ${post.tags.length}).`);

  const excerptLength = post.excerpt?.length || 0;
  if (excerptLength < 120 || excerptLength > 160) pushOrError(errors, warnings, strict, `Excerpt length ${excerptLength} should be 120-160 characters.`);

  if (post.canonicalUrl && !post.canonicalUrl.startsWith('https://')) pushOrError(errors, warnings, strict, 'Canonical URL must use HTTPS.');
  if (post.canonicalUrl && post.slug) {
    const expectedCanonical = `${String(siteUrl).replace(/\/$/, '')}/posts/${post.slug}/`;
    if (post.canonicalUrl !== expectedCanonical) pushOrError(errors, warnings, strict, `Canonical URL should be ${expectedCanonical}.`);
  }

  if (post.jsonLd) {
    if (!post.jsonLd['@context'] || !post.jsonLd['@type']) pushOrError(errors, warnings, strict, 'JSON-LD must include @context and @type.');
    if (post.jsonLd['@type'] !== 'BlogPosting') pushOrError(errors, warnings, strict, 'JSON-LD @type should be BlogPosting for articles.');
    if (!post.jsonLd.headline || !post.jsonLd.description || !post.jsonLd.keywords) pushOrError(errors, warnings, strict, 'JSON-LD should include headline, description, and keywords.');
  }

  if (Array.isArray(post.faq)) {
    for (let i = 0; i < post.faq.length; i++) {
      const item = post.faq[i];
      if (!item.question || !item.answer) pushOrError(errors, warnings, strict, `FAQ item ${i + 1} missing question or answer.`);
      if (item.question && item.question.length > 120) pushOrError(errors, warnings, strict, `FAQ question ${i + 1} exceeds 120 characters.`);
      if (item.answer && countWords(item.answer) < 20) pushOrError(errors, warnings, strict, `FAQ answer ${i + 1} too short (minimum 20 words).`);
    }
  }

  if (Array.isArray(post.internalLinks)) {
    const uniqueSlugs = new Set();
    for (let i = 0; i < post.internalLinks.length; i++) {
      const link = post.internalLinks[i];
      if (!link.slug || !link.anchor) pushOrError(errors, warnings, strict, `Internal link ${i + 1} missing slug or anchor.`);
      if (link.slug === post.slug) pushOrError(errors, warnings, strict, `Internal link ${i + 1} points to the current post.`);
      if (link.slug) uniqueSlugs.add(link.slug);
    }
    if (uniqueSlugs.size < minInternalLinks) pushOrError(errors, warnings, strict, `Add at least ${minInternalLinks} unique internal link slugs.`);
  }

  if (typeof post.seoScore !== 'number') {
    errors.push('seoScore must be a number between 0 and 1.');
  } else if (post.seoScore < minScore) {
    pushOrError(errors, warnings, strict, `seoScore ${post.seoScore} is below required ${minScore}.`);
  } else if (post.seoScore > 1) {
    errors.push('seoScore must not exceed 1.');
  }

  if (Array.isArray(post.claimsNeedingHumanCheck)) {
    if (post.claimsNeedingHumanCheck.length === 0) pushOrError(errors, warnings, strict, 'claimsNeedingHumanCheck must contain at least one item.');
    for (let i = 0; i < post.claimsNeedingHumanCheck.length; i++) {
      if (typeof post.claimsNeedingHumanCheck[i] !== 'string' || post.claimsNeedingHumanCheck[i].trim().length < 10) {
        pushOrError(errors, warnings, strict, `claimsNeedingHumanCheck item ${i + 1} must be a descriptive string.`);
      }
    }
  } else {
    errors.push('claimsNeedingHumanCheck must be an array.');
  }

  const requiredBodySignals = [
    { name: 'copy-paste prompt or prompt template', pattern: /copy-paste prompt|prompt template|```/i },
    { name: 'verification guidance', pattern: /what to verify|verification check|verify before|fact-check/i },
    { name: 'final checklist', pattern: /final checklist|checklist before|publishing checklist/i },
    { name: 'mistakes to avoid', pattern: /mistakes to avoid|common mistakes|avoid these/i },
    { name: 'tool tradeoff table', pattern: /\|[^|\n]+\|[^|\n]+\|/ }
  ];

  for (const signal of requiredBodySignals) {
    if (!signal.pattern.test(post.body || '')) pushOrError(errors, warnings, strict, `Post must include ${signal.name}.`);
  }

  const genericLines = [
    'ai is changing the way',
    'in today\'s fast-paced world',
    'this comprehensive guide',
    'whether you are a beginner or an expert',
    'the possibilities are endless',
    'look no further',
    'say goodbye to'
  ];
  const foundGenericLines = genericLines.filter((phrase) => bodyText.includes(phrase));
  if (foundGenericLines.length > 0) pushOrError(errors, warnings, strict, `Avoid generic AI filler: ${foundGenericLines.join(', ')}.`);

  const prohibitedPhrases = ['this article was generated', 'as an ai language model', 'i cannot browse'];
  const foundProhibited = prohibitedPhrases.filter((phrase) => bodyText.includes(phrase));
  if (foundProhibited.length > 0) pushOrError(errors, warnings, strict, `Remove generator/meta disclosure or model limitation text: ${foundProhibited.join(', ')}.`);

  const aiPhrases = ['in today\'s world', 'in the digital age', 'master the art', 'unlock the power', 'game-changer', 'revolutionary', 'seamless', 'delve', 'tapestry'];
  const foundPhrases = aiPhrases.filter((p) => bodyText.includes(p));
  if (foundPhrases.length > 0) pushOrError(errors, warnings, strict, `Avoid AI telltale phrases: ${foundPhrases.join(', ')}.`);

  const passed = errors.length === 0;
  return { passed, errors, warnings, metrics: { titleLength, metaTitleLength, metaDescriptionLength, bodyWordCount } };
}

export function validatePostCollection(posts, options = {}) {
  const {
    strict = process.env.STRICT_SEO === '1',
    maxSimilarity = 0.58,
    minPostsWithLongTailKeywords = 1
  } = options;
  const errors = [];
  const warnings = [];

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const similarity = bodySimilarity(posts[i].body || '', posts[j].body || '');
      if (similarity > maxSimilarity) {
        pushOrError(errors, warnings, strict, `Posts are too similar (${similarity.toFixed(2)}): ${posts[i].slug} and ${posts[j].slug}.`);
      }
    }
  }

  const longTailSignals = ['template', 'workflow', 'for students', 'for freelancers', 'small business', 'local', 'calendar', 'notes', 'faq'];
  const longTailPosts = posts.filter((post) => longTailSignals.some((word) => `${post.title} ${post.focusKeywords?.join(' ')}`.toLowerCase().includes(word)));
  if (posts.length >= minPostsWithLongTailKeywords && longTailPosts.length === 0) {
    pushOrError(errors, warnings, strict, 'At least one post should target a concrete long-tail workflow keyword.');
  }

  return { passed: errors.length === 0, errors, warnings };
}

function pushOrError(errors, warnings, strict, message) {
  if (strict) errors.push(message);
  else warnings.push(message);
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function bodySimilarity(a, b) {
  const aSet = shingles(a);
  const bSet = shingles(b);
  if (!aSet.size || !bSet.size) return 0;
  let intersection = 0;
  for (const item of aSet) if (bSet.has(item)) intersection++;
  const union = aSet.size + bSet.size - intersection;
  return union ? intersection / union : 0;
}

function shingles(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const set = new Set();
  for (let i = 0; i <= words.length - 7; i++) {
    set.add(words.slice(i, i + 7).join(' '));
  }
  return set;
}

export function summarizeValidation(report) {
  return {
    passed: report.passed,
    errors: report.errors.length,
    warnings: report.warnings.length,
    metrics: report.metrics
  };
}

export function validatePostSeo(post, options = {}) {
  const {
    strict = process.env.STRICT_SEO === '1',
    minScore = 0.85,
    minWords = 1000,
    minFaq = 4,
    minInternalLinks = 2,
    maxTitleLength = 70,
    minTitleLength = 40,
    maxMetaTitleLength = 65,
    minMetaTitleLength = 45,
    maxMetaDescLength = 165,
    minMetaDescLength = 140,
    requirePrimaryInH2 = true
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
  if (primary && !bodyLower.includes(primaryLower)) pushOrError(errors, warnings, strict, 'Primary keyword must appear naturally in the body (first 100 words recommended).');

  // Check primary keyword in first 100 words
  if (primary) {
    const first100 = post.body?.slice(0, 600).toLowerCase() || '';
    if (!first100.includes(primaryLower)) pushOrError(errors, warnings, strict, 'Primary keyword should appear in the first 100 words of the body.');
  }

  // Check primary keyword in at least one H2
  if (requirePrimaryInH2 && primary) {
    const h2Matches = post.body?.match(/^##\s+.+$/gm) || [];
    const hasPrimaryInH2 = h2Matches.some((h2) => h2.toLowerCase().includes(primaryLower));
    if (!hasPrimaryInH2) pushOrError(errors, warnings, strict, 'Primary keyword should appear in at least one H2 heading.');
  }

  // Check keyword density (not stuffed)
  if (primary && bodyLower.length > 0) {
    const occurrences = (bodyLower.match(new RegExp(primaryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const density = occurrences / bodyWordCount;
    if (density > 0.03) pushOrError(errors, warnings, strict, `Primary keyword density ${(density * 100).toFixed(1)}% may be too high (target ~1-2%).`);
  }

  // Check for thin content sections
  const h2Sections = post.body?.split(/^##\s+/m).slice(1) || [];
  const thinSections = h2Sections.filter((section) => countWords(section) < 100).length;
  if (thinSections > 1) pushOrError(errors, warnings, strict, `${thinSections} H2 sections have fewer than 100 words each. Expand thin sections.`);

  // Check tags
  if (!Array.isArray(post.tags) || post.tags.length < 3) pushOrError(errors, warnings, strict, `Tags should contain at least 3 relevant tags.`);
  if (Array.isArray(post.tags) && post.tags.length > 8) pushOrError(errors, warnings, strict, `Tags should not exceed 8 (currently ${post.tags.length}).`);

  // Check excerpt
  const excerptLength = post.excerpt?.length || 0;
  if (excerptLength < 120 || excerptLength > 160) pushOrError(errors, warnings, strict, `Excerpt length ${excerptLength} should be 120-160 characters.`);

  // Check canonical URL format
  if (post.canonicalUrl && !post.canonicalUrl.startsWith('https://')) pushOrError(errors, warnings, strict, 'Canonical URL must use HTTPS.');

  // Check JSON-LD structure
  if (post.jsonLd) {
    if (!post.jsonLd['@context'] || !post.jsonLd['@type']) pushOrError(errors, warnings, strict, 'JSON-LD must include @context and @type.');
    if (post.jsonLd['@type'] !== 'BlogPosting') pushOrError(errors, warnings, strict, 'JSON-LD @type should be BlogPosting for articles.');
  }

  // Check FAQ structure
  if (Array.isArray(post.faq)) {
    for (let i = 0; i < post.faq.length; i++) {
      const item = post.faq[i];
      if (!item.question || !item.answer) pushOrError(errors, warnings, strict, `FAQ item ${i + 1} missing question or answer.`);
      if (item.question && item.question.length > 120) pushOrError(errors, warnings, strict, `FAQ question ${i + 1} exceeds 120 characters.`);
      if (item.answer && countWords(item.answer) < 20) pushOrError(errors, warnings, strict, `FAQ answer ${i + 1} too short (minimum 20 words).`);
    }
  }

  // Check internal links structure
  if (Array.isArray(post.internalLinks)) {
    for (let i = 0; i < post.internalLinks.length; i++) {
      const link = post.internalLinks[i];
      if (!link.slug || !link.anchor) pushOrError(errors, warnings, strict, `Internal link ${i + 1} missing slug or anchor.`);
    }
  }

  // SEO score
  if (typeof post.seoScore !== 'number') {
    errors.push('seoScore must be a number between 0 and 1.');
  } else if (post.seoScore < minScore) {
    pushOrError(errors, warnings, strict, `seoScore ${post.seoScore} is below required ${minScore}.`);
  } else if (post.seoScore > 1) {
    errors.push('seoScore must not exceed 1.');
  }

  // Claims needing human check
  if (Array.isArray(post.claimsNeedingHumanCheck)) {
    if (post.claimsNeedingHumanCheck.length === 0) pushOrError(errors, warnings, strict, 'claimsNeedingHumanCheck must contain at least one item (even if just "Verify all facts").');
    for (let i = 0; i < post.claimsNeedingHumanCheck.length; i++) {
      if (typeof post.claimsNeedingHumanCheck[i] !== 'string' || post.claimsNeedingHumanCheck[i].trim().length < 10) {
        pushOrError(errors, warnings, strict, `claimsNeedingHumanCheck item ${i + 1} must be a descriptive string.`);
      }
    }
  } else {
    errors.push('claimsNeedingHumanCheck must be an array.');
  }

  // Check for AI telltale phrases (warn only)
  const aiPhrases = ['in today\'s world', 'in the digital age', 'master the art', 'unlock the power', 'game-changer', 'revolutionary', 'seamless', 'delve', 'tapestry'];
  const bodyText = post.body?.toLowerCase() || '';
  const foundPhrases = aiPhrases.filter((p) => bodyText.includes(p));
  if (foundPhrases.length > 0) {
    pushOrError(errors, warnings, strict, `Avoid AI telltale phrases: ${foundPhrases.join(', ')}.`);
  }

  const passed = errors.length === 0;
  return { passed, errors, warnings, metrics: { titleLength, metaTitleLength, metaDescriptionLength, bodyWordCount } };
}

function pushOrError(errors, warnings, strict, message) {
  if (strict) errors.push(message);
  else warnings.push(message);
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function summarizeValidation(report) {
  return {
    passed: report.passed,
    errors: report.errors.length,
    warnings: report.warnings.length,
    metrics: report.metrics
  };
}
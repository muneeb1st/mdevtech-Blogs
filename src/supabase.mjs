import { createClient } from '@supabase/supabase-js';

function usableValue(value = '') {
  const trimmed = String(value).trim();
  if (!trimmed || /^YOUR_/i.test(trimmed) || /^REPLACE_/i.test(trimmed)) return '';
  return trimmed;
}

function usableSupabaseUrl(value = '') {
  const trimmed = usableValue(value);
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co') ? parsed.origin : '';
  } catch {
    return '';
  }
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

const url = usableSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const key = usableValue(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export const supabase = url && key ? createClient(url, key) : null;

export function hasSupabaseCredentials() {
  return Boolean(supabase && url && key);
}

export function missingSupabaseMessage() {
  return '[Supabase] Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Skipping sync.';
}

function postToRow(post) {
  return {
    slug: post.slug,
    title: post.title,
    body_markdown: post.body,
    meta_title: post.metaTitle,
    meta_description: post.metaDescription,
    focus_keywords: post.focusKeywords,
    search_intent: post.searchIntent,
    canonical_url: post.canonicalUrl,
    json_ld: post.jsonLd || {},
    faq: post.faq || [],
    status: 'published',
    published_at: post.date
  };
}

function rowToFallbackPost(row) {
  const focusKeywords = Array.isArray(row.focus_keywords) ? row.focus_keywords : [];
  const metaTitle = row.meta_title || row.title;
  const metaDescription = row.meta_description || '';
  return {
    title: row.title,
    slug: row.slug,
    date: row.published_at || row.created_at || new Date().toISOString(),
    niche: 'AI tools and workflows for students, freelancers, and small local businesses',
    author: 'muneeb1st',
    excerpt: metaDescription.slice(0, 155),
    tags: ['AI automation', ...focusKeywords].slice(0, 6),
    body: row.body_markdown || '',
    metaTitle,
    metaDescription,
    focusKeywords,
    searchIntent: row.search_intent || 'informational',
    faq: Array.isArray(row.faq) ? row.faq : [],
    internalLinks: [],
    canonicalUrl: row.canonical_url || `https://mdevtech.vercel.app/posts/${row.slug}/`,
    jsonLd: row.json_ld || {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: row.title,
      description: metaDescription,
      keywords: focusKeywords,
      articleSection: 'AI automation'
    },
    seoScore: 0.88,
    claimsNeedingHumanCheck: ['Restored from Supabase posts table without a content_versions payload; verify full post metadata before republishing.']
  };
}

export async function recordContentVersion(postRow, post) {
  if (!supabase) return null;

  const { data: latest, error: latestError } = await supabase
    .from('content_versions')
    .select('id, version, payload')
    .eq('post_id', postRow.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  if (latest?.payload && stableJson(latest.payload) === stableJson(post)) {
    return latest;
  }

  const nextVersion = Number.isInteger(latest?.version) ? latest.version + 1 : 1;
  const { data, error } = await supabase
    .from('content_versions')
    .insert({
      post_id: postRow.id,
      version: nextVersion,
      payload: post
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertPost(post) {
  if (!supabase) {
    console.warn(missingSupabaseMessage());
    return null;
  }

  const { data, error } = await supabase
    .from('posts')
    .upsert(postToRow(post), { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw error;
  await recordContentVersion(data, post);
  return data;
}

export async function backupPosts(posts) {
  if (!supabase) {
    console.warn(missingSupabaseMessage());
    return { backedUp: 0, skipped: posts.length, slugs: [] };
  }

  const slugs = [];
  for (const post of posts) {
    await upsertPost(post);
    slugs.push(post.slug);
  }
  return { backedUp: slugs.length, skipped: 0, slugs };
}

export async function listBackedUpPosts() {
  if (!supabase) {
    console.warn(missingSupabaseMessage());
    return [];
  }

  const { data: rows, error: rowsError } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false });

  if (rowsError) throw rowsError;
  if (!rows?.length) return [];

  const ids = rows.map((row) => row.id);
  const { data: versions, error: versionsError } = await supabase
    .from('content_versions')
    .select('post_id, payload, version, created_at')
    .in('post_id', ids)
    .order('version', { ascending: false });

  if (versionsError) throw versionsError;

  const latestByPostId = new Map();
  for (const version of versions || []) {
    if (!latestByPostId.has(version.post_id)) latestByPostId.set(version.post_id, version.payload);
  }

  return rows.map((row) => latestByPostId.get(row.id) || rowToFallbackPost(row));
}

export async function recordPublishEvent(post, eventDetails = {}) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('publish_events')
    .insert({
      post_id: post.id,
      event_type: 'generated',
      details: eventDetails
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

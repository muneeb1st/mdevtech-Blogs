import { createClient } from '@supabase/supabase-js';

function usableValue(value = '') {
  const trimmed = value.trim();
  if (!trimmed || /^YOUR_/i.test(trimmed) || /^REPLACE_/i.test(trimmed)) return '';
  return trimmed;
}

function usableSupabaseUrl(value = '') {
  const trimmed = usableValue(value);
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co') ? trimmed : '';
  } catch {
    return '';
  }
}

const url = usableSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const key = usableValue(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export const supabase = url && key ? createClient(url, key) : null;

export function hasSupabaseCredentials() {
  return Boolean(supabase && url && key);
}

export async function upsertPost(post) {
  if (!supabase) {
    console.warn('[Supabase] Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Skipping sync.');
    return null;
  }

  const payload = {
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

  const { data, error } = await supabase
    .from('posts')
    .upsert(payload, { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw error;
  return data;
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

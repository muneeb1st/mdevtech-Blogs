#!/usr/bin/env node
import 'dotenv/config';
import { readPosts, writePost } from '../src/lib.mjs';
import { backupPosts, hasSupabaseCredentials, listBackedUpPosts, missingSupabaseMessage } from '../src/supabase.mjs';

const command = process.argv[2] || 'backup';
const requireCredentials = process.argv.includes('--require');

function handleMissingCredentials() {
  const message = missingSupabaseMessage();
  if (requireCredentials) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  console.warn('[Supabase] Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable durable backups.');
  process.exit(0);
}

async function backup() {
  if (!hasSupabaseCredentials()) handleMissingCredentials();
  const posts = await readPosts();
  const result = await backupPosts(posts);
  console.log(`[Supabase] Backed up ${result.backedUp} post(s).`);
  for (const slug of result.slugs) console.log(`- ${slug}`);
}

async function verify() {
  if (!hasSupabaseCredentials()) handleMissingCredentials();
  const localPosts = await readPosts();
  const remotePosts = await listBackedUpPosts();
  const remoteSlugs = new Set(remotePosts.map((post) => post.slug));
  const missing = localPosts.filter((post) => !remoteSlugs.has(post.slug));

  console.log(`[Supabase] Local posts: ${localPosts.length}`);
  console.log(`[Supabase] Backed up posts: ${remotePosts.length}`);
  if (missing.length) {
    console.error('[Supabase] Missing backups:');
    for (const post of missing) console.error(`- ${post.slug}`);
    process.exit(1);
  }
  console.log('[Supabase] Backup verification passed.');
}

async function restore() {
  if (!hasSupabaseCredentials()) handleMissingCredentials();
  const posts = await listBackedUpPosts();
  for (const post of posts) {
    await writePost(post);
  }
  console.log(`[Supabase] Restored ${posts.length} post(s) into content/posts/.`);
  for (const post of posts) console.log(`- ${post.slug}`);
}

try {
  if (command === 'backup') await backup();
  else if (command === 'verify') await verify();
  else if (command === 'restore') await restore();
  else {
    console.error(`Unknown command: ${command}`);
    console.error('Usage: node scripts/supabase-backup.mjs [backup|verify|restore] [--require]');
    process.exit(1);
  }
} catch (error) {
  console.error('[Supabase] Operation failed.');
  console.error(error.message);
  process.exit(1);
}

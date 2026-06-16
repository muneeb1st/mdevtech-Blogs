import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, slugify } from '../lib.mjs';

const KEYWORDS_FILE = path.join(ROOT, 'content', 'keyword-clusters.json');

export async function loadKeywordClusters() {
  const raw = await fs.readFile(KEYWORDS_FILE, 'utf8');
  const clusters = JSON.parse(raw);
  return clusters.map((cluster) => ({
    ...cluster,
    slug: cluster.slug || slugify(cluster.primaryKeyword)
  }));
}

export function selectKeywordCluster(slot, clusters) {
  if (!clusters.length) throw new Error('No keyword clusters found.');
  const preferred = process.env.PREFER_LOW_DIFFICULTY_KEYWORDS === '0'
    ? clusters
    : clusters.filter((cluster) => String(cluster.difficulty || '').toLowerCase() === 'low');
  const pool = preferred.length ? preferred : clusters;
  let hash = 0;
  for (const char of slot) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}

export function buildTopicFromCluster(cluster) {
  return {
    title: `${cluster.primaryKeyword}: practical workflow for ${cluster.audience}`,
    audience: cluster.audience,
    primaryKeyword: cluster.primaryKeyword,
    secondaryKeywords: cluster.secondaryKeywords,
    searchIntent: cluster.searchIntent,
    workflow: cluster.workflow,
    tools: cluster.tools,
    articleAngle: cluster.articleAngle,
    cluster
  };
}

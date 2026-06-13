import { join } from 'path';
import { ARTICLES, ArticleDefinition } from './article-definitions';

export type ArticleStatsRecord = {
  views: number;
  likes: number;
  likedVisitorIds: string[];
  viewRecords: Record<string, string>;
};

export type ArticleStatsFile = Record<string, ArticleStatsRecord>;

export const STATS_FILE_PATH = join(process.cwd(), 'data', 'article-stats.json');

export function createDefaultStats(): ArticleStatsFile {
  return Object.fromEntries(
    ARTICLES.map((article) => [
      article.slug,
      {
        views: 0,
        likes: 0,
        likedVisitorIds: [],
        viewRecords: {},
      },
    ])
  );
}

async function getFs() {
  return await import('fs/promises');
}

export async function ensureStatsFile(): Promise<void> {
  const fs = await getFs();
  try {
    await fs.access(STATS_FILE_PATH);
  } catch {
    await fs.mkdir(join(process.cwd(), 'data'), { recursive: true });
    await writeStatsFile(createDefaultStats());
  }
}

export async function readStatsFile(): Promise<ArticleStatsFile> {
  const fs = await getFs();
  await ensureStatsFile();
  const raw = await fs.readFile(STATS_FILE_PATH, 'utf-8');
  try {
    return JSON.parse(raw) as ArticleStatsFile;
  } catch (error) {
    console.error('[DB] Failed to parse article stats file, resetting to defaults', error);
    const defaultStats = createDefaultStats();
    await writeStatsFile(defaultStats);
    return defaultStats;
  }
}

export async function writeStatsFile(data: ArticleStatsFile): Promise<void> {
  const fs = await getFs();
  await fs.mkdir(join(process.cwd(), 'data'), { recursive: true });
  await fs.writeFile(STATS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log('[DB] Wrote article stats to', STATS_FILE_PATH);
}

export function buildPublicStats(stats: ArticleStatsFile) {
  return ARTICLES.map((article) => {
    const record = stats[article.slug] ?? {
      views: 0,
      likes: 0,
      likedVisitorIds: [],
      viewRecords: {},
    };

    return {
      ...article,
      views: record.views,
      likes: record.likes,
    };
  });
}

export function getArticleDefinition(slug: string) {
  return ARTICLES.find((article) => article.slug === slug);
}

export function getPublicArticleStat(slug: string, stats: ArticleStatsFile) {
  const article = getArticleDefinition(slug);
  if (!article) return null;
  const record = stats[slug] ?? {
    views: 0,
    likes: 0,
    likedVisitorIds: [],
    viewRecords: {},
  };
  return {
    ...article,
    views: record.views,
    likes: record.likes,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { getArticleDefinition, getPublicArticleStat, readStatsFile } from '@/lib/article-data';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const visitorId = req.nextUrl.searchParams.get('visitorId');
  const stats = await readStatsFile();
  const article = getArticleDefinition(slug);

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const publicStat = getPublicArticleStat(slug, stats);
  const liked = visitorId ? stats[slug]?.likedVisitorIds.includes(visitorId) ?? false : false;

  console.log('[API] GET /api/articles/' + slug, { visitorId, liked, views: publicStat?.views, likes: publicStat?.likes });

  return NextResponse.json({
    ...publicStat,
    liked,
  });
}

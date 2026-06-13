import { NextRequest, NextResponse } from 'next/server';
import { getArticleDefinition, readStatsFile, writeStatsFile } from '@/lib/article-data';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const body = await req.json();
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : null;

  if (!visitorId) {
    return NextResponse.json({ error: 'Missing visitorId' }, { status: 400 });
  }

  const article = getArticleDefinition(slug);
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const stats = await readStatsFile();
  const record = stats[slug] ?? {
    views: 0,
    likes: 0,
    likedVisitorIds: [],
    viewRecords: {},
  };

  const alreadyLiked = record.likedVisitorIds.includes(visitorId);
  if (alreadyLiked) {
    record.likedVisitorIds = record.likedVisitorIds.filter((id) => id !== visitorId);
    record.likes = Math.max(0, record.likes - 1);
  } else {
    record.likedVisitorIds.push(visitorId);
    record.likes += 1;
  }

  stats[slug] = record;
  await writeStatsFile(stats);

  console.log('[API] POST /api/articles/' + slug + '/like', {
    visitorId,
    liked: !alreadyLiked,
    likes: record.likes,
  });

  return NextResponse.json({ views: record.views, likes: record.likes, liked: !alreadyLiked });
}

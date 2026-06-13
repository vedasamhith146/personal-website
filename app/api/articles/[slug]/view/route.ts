import { NextRequest, NextResponse } from 'next/server';
import { getArticleDefinition, readStatsFile, writeStatsFile } from '@/lib/article-data';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

  const lastViewAt = record.viewRecords[visitorId]
    ? new Date(record.viewRecords[visitorId]).getTime()
    : 0;
  const now = Date.now();
  const isDuplicate = now - lastViewAt < MS_PER_DAY;

  if (!isDuplicate) {
    record.views += 1;
    record.viewRecords[visitorId] = new Date(now).toISOString();
    stats[slug] = record;
    await writeStatsFile(stats);
    console.log('[API] POST /api/articles/' + slug + '/view', { visitorId, counted: true, views: record.views });
  } else {
    console.log('[API] POST /api/articles/' + slug + '/view', { visitorId, counted: false, views: record.views });
  }

  return NextResponse.json({ views: record.views, likes: record.likes, counted: !isDuplicate });
}

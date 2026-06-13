import { NextResponse } from 'next/server';
import { buildPublicStats, readStatsFile } from '@/lib/article-data';

export async function GET() {
  const stats = await readStatsFile();
  const response = buildPublicStats(stats);
  console.log('[API] GET /api/articles', { count: response.length });
  return NextResponse.json(response);
}

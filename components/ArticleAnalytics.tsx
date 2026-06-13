'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';

type ArticleStats = {
  views: number;
  likes: number;
  liked: boolean;
};

const VISITOR_ID_KEY = 'article-analytics-visitor-id';
const VIEWED_KEY_PREFIX = 'article-analytics-viewed-';
const VIEW_DUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

function getVisitorId() {
  if (typeof window === 'undefined') return '';
  let visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

function getViewStorageKey(slug: string) {
  return `${VIEWED_KEY_PREFIX}${slug}`;
}

function hasRecentlyTrackedView(slug: string) {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(getViewStorageKey(slug));
  if (!stored) return false;
  const timestamp = Number(stored);
  return Number.isFinite(timestamp) && Date.now() - timestamp < VIEW_DUPLICATION_WINDOW_MS;
}

function markViewAsTracked(slug: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getViewStorageKey(slug), Date.now().toString());
}

export function ArticleAnalytics({ slug }: { slug: string }) {
  const [stats, setStats] = useState<ArticleStats>({ views: 0, likes: 0, liked: false });
  const [visitorId, setVisitorId] = useState<string>('');
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const viewSentRef = useRef(false);

  useEffect(() => {
    const id = getVisitorId();
    setVisitorId(id);
    setHasTrackedView(hasRecentlyTrackedView(slug));
  }, [slug]);

  useEffect(() => {
    if (!visitorId) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/articles/${slug}?visitorId=${visitorId}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Failed to load article stats: ${response.status}`);
        }
        const data = await response.json();
        setStats({ views: data.views, likes: data.likes, liked: data.liked });
        console.debug('[Analytics] fetched article stats', slug, data);
      } catch (error) {
        console.error('[Analytics] fetch article stats failed', error);
      }
    };

    fetchStats();
    const intervalId = window.setInterval(fetchStats, 4000);
    return () => window.clearInterval(intervalId);
  }, [slug, visitorId]);

  const sendViewIncrement = async () => {
    if (!visitorId || viewSentRef.current || hasTrackedView) {
      return;
    }

    viewSentRef.current = true;

    try {
      console.debug('[Analytics] sending view increment', slug, visitorId);
      const response = await fetch(`/api/articles/${slug}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitorId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to increment view: ${response.status}`);
      }

      const data = await response.json();
      setStats((current) => ({ ...current, views: data.views }));
      setHasTrackedView(true);
      markViewAsTracked(slug);

      console.debug('[Analytics] view increment response', slug, data);
    } catch (error) {
      console.error('[Analytics] view increment failed', error);
    }
  };

  useEffect(() => {
    if (!visitorId || hasTrackedView) return;

    const timerId = window.setTimeout(sendViewIncrement, 30000);

    const onScroll = () => {
      const articleElement = document.getElementById('article-content');
      if (!articleElement) return;

      const rect = articleElement.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));

      if (rect.height > 0 && visibleHeight >= rect.height * 0.5) {
        sendViewIncrement();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [slug, visitorId, hasTrackedView]);

  const toggleLike = async () => {
    if (!visitorId) return;

    const optimisticLiked = !stats.liked;
    const optimisticLikes = Math.max(0, stats.likes + (optimisticLiked ? 1 : -1));
    setStats((current) => ({ ...current, liked: optimisticLiked, likes: optimisticLikes }));
    setErrorMessage(null);

    try {
      console.debug('[Analytics] toggling like', slug, visitorId, optimisticLiked);
      const response = await fetch(`/api/articles/${slug}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitorId }),
      });

      const responseText = await response.text();
      console.debug('[Analytics] like POST response', slug, response.status, responseText);

      if (!response.ok) {
        let errorDetails: string;
        try {
          const parsed = JSON.parse(responseText);
          errorDetails = parsed.error || JSON.stringify(parsed);
        } catch {
          errorDetails = responseText;
        }
        throw new Error(`Failed to toggle like: ${response.status} ${errorDetails}`);
      }

      const data = JSON.parse(responseText);
      setStats({ views: data.views, likes: data.likes, liked: data.liked });
      console.debug('[Analytics] like toggle response', slug, data);
    } catch (error) {
      console.error('[Analytics] like toggle failed', error);
      setStats((current) => ({
        ...current,
        liked: !optimisticLiked,
        likes: Math.max(0, current.likes + (optimisticLiked ? -1 : 1)),
      }));
      setErrorMessage('Unable to update likes right now.');
    }
  };

  return (
    <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Article stats</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {stats.views} {stats.views === 1 ? 'view' : 'views'} · {stats.likes} {stats.likes === 1 ? 'like' : 'likes'}
          </p>
        </div>

        <button
          type="button"
          onClick={toggleLike}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
            stats.liked
              ? 'border-sky-300 bg-sky-500/10 text-sky-200'
              : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-slate-100'
          }`}
        >
          <Heart size={18} className={stats.liked ? 'fill-sky-400 stroke-sky-400' : 'stroke-slate-300'} />
          {stats.liked ? 'Unlike' : 'Like'}
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        Views count when you spend at least 30 seconds on the page or read through a meaningful portion of the article. Likes are persisted for this device.
      </p>
      {errorMessage ? <p className="mt-3 text-sm text-rose-300">{errorMessage}</p> : null}
    </div>
  );
}

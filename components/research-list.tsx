'use client';

import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ARTICLES } from '@/lib/article-definitions';

interface ResearchItem {
  id: number;
  title: string;
  description: string;
  views: number;
  likes: number;
  delay: number;
  slug: string;
}

interface ResearchListProps {
  activeTab?: string;
}

const LIKED_STORAGE_KEY = 'article-analytics-liked-slugs';
const VISITOR_ID_KEY = 'article-analytics-visitor-id';

function getOrCreateVisitorId() {
  if (typeof window === 'undefined') {
    return '';
  }

  let visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  return visitorId;
}

export default function ResearchList({ activeTab = 'featured' }: ResearchListProps) {
  const [items, setItems] = useState<ResearchItem[]>(
    ARTICLES.map((article) => ({ ...article, views: 0, likes: 0 }))
  );
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const savedLikes = window.localStorage.getItem(LIKED_STORAGE_KEY);
    if (savedLikes) {
      try {
        setLikedSlugs(new Set(JSON.parse(savedLikes)));
      } catch (error) {
        console.error('[Analytics] Failed to parse liked state from localStorage', error);
      }
    }

    const visitorId = getOrCreateVisitorId();
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/articles', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load article stats: ${response.status}`);
        }
        const data = await response.json();
        if (!isMounted) return;

        const nextItems = ARTICLES.map((article) => {
          const stat = data.find((item: any) => item.slug === article.slug);
          return {
            ...article,
            views: stat?.views ?? 0,
            likes: stat?.likes ?? 0,
          };
        });

        setItems(nextItems);
        console.debug('[Analytics] fetched latest article stats', { visitorId, count: nextItems.length });
      } catch (error) {
        console.error('[Analytics] Failed to fetch article stats', error);
      }
    };

    fetchStats();
    const intervalId = window.setInterval(fetchStats, 4000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(Array.from(likedSlugs)));
  }, [likedSlugs]);

  const toggleLike = async (slug: string) => {
    const isCurrentlyLiked = likedSlugs.has(slug);
    const visitorId = getOrCreateVisitorId();
    setLikedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });

    setItems((prev) =>
      prev.map((item) =>
        item.slug === slug
          ? { ...item, likes: Math.max(0, item.likes + (isCurrentlyLiked ? -1 : 1)) }
          : item
      )
    );

    try {
      console.debug('[Analytics] toggling like via API', { slug, visitorId, isCurrentlyLiked });
      const response = await fetch(`/api/articles/${slug}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitorId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to toggle like: ${response.status}`);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.slug === slug ? { ...item, likes: data.likes } : item
        )
      );
      console.debug('[Analytics] like toggle API response', { slug, likes: data.likes, liked: data.liked });
    } catch (error) {
      console.error('[Analytics] Like toggle failed', error);
      setLikedSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) {
          next.add(slug);
        } else {
          next.delete(slug);
        }
        return next;
      });
      setItems((prev) =>
        prev.map((item) =>
          item.slug === slug
            ? { ...item, likes: Math.max(0, item.likes + (isCurrentlyLiked ? 1 : -1)) }
            : item
        )
      );
    }
  };

  const getSortedItems = () => {
    const sorted = [...items];
    if (activeTab === 'most read') {
      return sorted.sort((a, b) => b.views - a.views);
    } else if (activeTab === 'most liked') {
      return sorted.sort((a, b) => b.likes - a.likes);
    }
    return sorted;
  };

  const displayItems = getSortedItems();

  return (
    <div className="space-y-4">
      {displayItems.map((item) => {
        const cardContent = (
          <div
            onMouseEnter={() => setHoveredCard(item.id)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group border border-border rounded-lg p-6 transition-all duration-300 cursor-pointer ${
              hoveredCard === item.id
                ? 'border-accent bg-card shadow-lg translate-y-[-2px]'
                : 'bg-background/40'
            }`}
            style={{ animationDelay: `${item.delay * 100}ms` }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    {item.views} {item.views === 1 ? 'view' : 'views'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-accent transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(item.slug);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:border-accent transition-all duration-300 group/like"
                >
                  <Heart
                    size={18}
                    className={`transition-all duration-300 ${
                      likedSlugs.has(item.slug)
                        ? 'fill-accent stroke-accent'
                        : 'stroke-muted-foreground group-hover/like:stroke-accent'
                    }`}
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover/like:text-foreground transition-colors duration-300">
                    {item.likes}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

        return (
          <Link key={item.id} href={`/writing/${item.slug}`}>
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}

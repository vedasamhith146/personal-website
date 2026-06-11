'use client';

import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ResearchItem {
  id: number;
  title: string;
  description: string;
  views: number;
  likes: number;
  delay: number;
}

const INITIAL_ITEMS: ResearchItem[] = [
  {
    id: 1,
    title: 'What can we deduce from token embedding table after training',
    description: 'Understanding token representations in large language models.',
    views: 0,
    likes: 0,
    delay: 0,
  },
  {
    id: 2,
    title: 'ALiBi',
    description: 'Attention with Linear Biases: A simple yet effective positional encoding.',
    views: 0,
    likes: 0,
    delay: 1,
  },
  {
    id: 3,
    title: 'RoPE',
    description: 'Rotary Position Embedding and its advantages in transformer models.',
    views: 0,
    likes: 0,
    delay: 2,
  },
  {
    id: 4,
    title: 'Evolution of attention',
    description: 'How reasoning emerges in large language models.',
    views: 0,
    likes: 0,
    delay: 3,
  },
  {
    id: 5,
    title: 'Is multi-head attention really doing the job?',
    description: 'Alternative mechanisms to traditional attention.',
    views: 0,
    likes: 0,
    delay: 4,
  },
  {
    id: 6,
    title: 'The journey of activation functions',
    description: 'Evolution of activation functions in neural networks.',
    views: 0,
    likes: 0,
    delay: 5,
  },
];

interface ResearchListProps {
  activeTab?: string;
}

export default function ResearchList({ activeTab = 'featured' }: ResearchListProps) {
  const [items, setItems] = useState<ResearchItem[]>(INITIAL_ITEMS);
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Load likes from localStorage on mount
  useEffect(() => {
    const savedLikes = localStorage.getItem('research-likes');
    if (savedLikes) {
      try {
        const likesData = JSON.parse(savedLikes);
        const newLikedItems = new Set(likesData.likedIds);
        const updatedItems = items.map(item => ({
          ...item,
          likes: likesData.likes[item.id] || 0,
        }));
        setItems(updatedItems);
        setLikedItems(newLikedItems);
      } catch (e) {
        console.error('Failed to load likes from localStorage', e);
      }
    }
    setIsVisible(true);
  }, []);

  // Save likes to localStorage whenever they change
  useEffect(() => {
    const likesData = {
      likedIds: Array.from(likedItems),
      likes: Object.fromEntries(items.map(item => [item.id, item.likes])),
    };
    localStorage.setItem('research-likes', JSON.stringify(likesData));
  }, [likedItems, items]);

  const toggleLike = (id: number) => {
    const isCurrentlyLiked = likedItems.has(id);
    
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, likes: isCurrentlyLiked ? Math.max(0, item.likes - 1) : item.likes + 1 } : item
      )
    );

    setLikedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const recordView = (id: number) => {
    setTimeout(() => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, views: item.views + 1 } : item))
      );
    }, 5 * 60 * 1000); // 5 minutes
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
      {displayItems.map((item) => (
        <div
          key={item.id}
          onClick={() => recordView(item.id)}
          onMouseEnter={() => setHoveredCard(item.id)}
          onMouseLeave={() => setHoveredCard(null)}
          className={`group border border-border rounded-lg p-6 transition-all duration-300 cursor-pointer ${
            isVisible ? 'animate-fade-in-up' : 'opacity-0'
          } ${
            hoveredCard === item.id
              ? 'border-accent bg-card shadow-lg translate-y-[-2px]'
              : 'bg-background/40'
          }`}
          style={{
            animationDelay: `${item.delay * 100}ms`,
          }}
        >
          <div className="flex items-start justify-between gap-6">
            {/* Left Content */}
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

            {/* Right - Like Button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(item.id);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:border-accent transition-all duration-300 group/like"
              >
                <Heart
                  size={18}
                  className={`transition-all duration-300 ${
                    likedItems.has(item.id)
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
      ))}
    </div>
  );
}

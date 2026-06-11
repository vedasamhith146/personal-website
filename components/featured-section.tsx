'use client';

import { useEffect, useState } from 'react';

export default function FeaturedSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`relative rounded-lg p-8 transition-all duration-700 border border-border bg-card ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      }`}
    >
      {/* Attention Heatmap Background Visualization */}
      <div className="absolute inset-0 overflow-hidden rounded-lg opacity-5">
        <svg
          viewBox="0 0 400 300"
          className="w-full h-full animate-attention-pulse"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Transformer Attention Matrix */}
          {[...Array(8)].map((_, i) =>
            [...Array(8)].map((_, j) => {
              const intensity = Math.sin((i + j) * 0.5) * 0.5 + 0.5;
              return (
                <rect
                  key={`cell-${i}-${j}`}
                  x={i * 50}
                  y={j * 37.5}
                  width="50"
                  height="37.5"
                  fill={`rgba(155, 163, 175, ${intensity * 0.6})`}
                  stroke="rgba(155, 163, 175, 0.1)"
                  strokeWidth="1"
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl">
        <p className="text-foreground text-sm leading-relaxed font-light">
          Interested in mechanistic interpretability, transformer architectures, and understanding how large language models learn and reason.
        </p>
      </div>
    </div>
  );
}

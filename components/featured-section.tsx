'use client';

import { useEffect, useState } from 'react';

export default function FeaturedSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`bg-surface border border-border rounded-lg p-8 transition-all duration-700 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      }`}
    >
      <div className="grid grid-cols-2 gap-8">
        {/* Left Content */}
        <div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Interested in mechanistic interpretability, transformer architectures, and understanding how large language models learn and reason.
          </p>
        </div>

        {/* Right - Visualization */}
        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Decorative mesh grid visualization */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full opacity-60 animate-glow-pulse"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ff6b9d" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[...Array(5)].map((_, i) => (
                <g key={`grid-${i}`}>
                  <line
                    x1={i * 50}
                    y1="0"
                    x2={i * 50}
                    y2="200"
                    stroke="#4a5578"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="0"
                    y1={i * 50}
                    x2="200"
                    y2={i * 50}
                    stroke="#4a5578"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                </g>
              ))}

              {/* Center sphere with data points */}
              <circle cx="100" cy="100" r="40" fill="url(#meshGradient)" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.5" />

              {/* Data points */}
              <circle cx="85" cy="95" r="3" fill="#ff6b9d" opacity="0.8" />
              <circle cx="110" cy="105" r="2.5" fill="#00d4ff" opacity="0.7" />
              <circle cx="100" cy="75" r="2" fill="#a0a0a0" opacity="0.6" />

              {/* Labels */}
              <text x="65" y="95" fontSize="10" fill="#ff6b9d" opacity="0.7">
                momentum L
              </text>
              <text x="95" y="120" fontSize="10" fill="#00d4ff" opacity="0.7">
                adam L
              </text>
            </svg>

            {/* Decorative circle background */}
            <div className="absolute -top-8 -right-8 w-32 h-32 border border-border rounded-full opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
}

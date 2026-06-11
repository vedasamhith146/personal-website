'use client';

import { BookOpen, Code2, FileText } from 'lucide-react';
import { useState } from 'react';

const writingTopics = [
  'Tokenization',
  'What can we deduce from token embedding table after training',
  'ALiBi',
  'RoPE',
  'Evolution of attention',
  'Is multi-head attention really doing the job?',
  'The journey of activation functions',
];

const implementations = [
  'RoPE',
  'ALiBi',
  'KV Cache',
];

export default function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const SidebarItem = ({ label }: { label: string }) => (
    <a
      href="#"
      onMouseEnter={() => setHoveredItem(label)}
      onMouseLeave={() => setHoveredItem(null)}
      className={`text-xs text-muted-foreground hover:text-foreground transition-all duration-300 cursor-pointer inline-block ${
        hoveredItem === label ? 'translate-x-1 brightness-125' : ''
      }`}
    >
      {label}
    </a>
  );

  return (
    <aside className="w-80 border-r border-border bg-background p-8 min-h-screen sticky top-16 overflow-y-auto">
      <nav className="space-y-8 animate-slide-in-left">
        {/* Writing Section */}
        <div>
          <div className="flex items-center gap-2 text-foreground mb-4 hover:text-accent transition-colors duration-300 cursor-pointer">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Writing</span>
          </div>
          <ul className="space-y-2 ml-6">
            {writingTopics.map((topic, idx) => (
              <li key={idx}>
                <SidebarItem label={topic} />
              </li>
            ))}
          </ul>
        </div>

        {/* Implementations Section */}
        <div>
          <div className="flex items-center gap-2 text-foreground mb-4 hover:text-accent transition-colors duration-300 cursor-pointer">
            <Code2 className="w-4 h-4" />
            <span className="text-sm font-medium">Implementations</span>
          </div>
          <ul className="space-y-2 ml-6">
            {implementations.map((impl, idx) => (
              <li key={idx}>
                <SidebarItem label={impl} />
              </li>
            ))}
          </ul>
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center gap-2 text-foreground mb-4 hover:text-accent transition-colors duration-300 cursor-pointer">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Notes</span>
          </div>
        </div>

        {/* Social Links */}
        <div className="pt-8 border-t border-border space-y-3">
          <p className="text-xs text-muted-foreground">
            <a
              href="https://x.com/HiddenNeuron_14"
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredItem('twitter')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`hover:text-foreground transition-all duration-300 cursor-pointer inline-block ${
                hoveredItem === 'twitter' ? 'translate-x-1 brightness-125' : ''
              }`}
            >
              Twitter
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            <a
              href="#"
              onMouseEnter={() => setHoveredItem('ama')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`hover:text-foreground transition-all duration-300 cursor-pointer inline-block ${
                hoveredItem === 'ama' ? 'translate-x-1 brightness-125' : ''
              }`}
            >
              Ask me anything
            </a>
          </p>
        </div>
      </nav>
    </aside>
  );
}

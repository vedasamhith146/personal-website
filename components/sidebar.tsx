'use client';

import { BookOpen, Code2, FileText } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

const writingTopics = [
  { label: 'Tokenization', slug: 'tokenization' },
  { label: 'What can we deduce from token embedding table after training', slug: 'token-embeddings' },
  { label: 'ALiBi', slug: 'alibi' },
  { label: 'RoPE', slug: 'rope' },
  { label: 'Evolution of attention', slug: 'evolution-attention' },
  { label: 'Is multi-head attention really doing the job?', slug: 'multi-head-attention' },
  { label: 'The journey of activation functions', slug: 'activation-functions' },
];

const implementations = [
  'RoPE',
  'ALiBi',
  'KV Cache',
];

export default function Sidebar() {
  const [hoveredWritingItem, setHoveredWritingItem] = useState<string | null>(null);
  const [hoveredImplementationItem, setHoveredImplementationItem] = useState<string | null>(null);
  const [hoveredSocialItem, setHoveredSocialItem] = useState<string | null>(null);

  const WritingItem = ({ label, slug }: { label: string; slug: string }) => (
    <Link
      href={`/writing/${slug}`}
      onMouseEnter={() => setHoveredWritingItem(label)}
      onMouseLeave={() => setHoveredWritingItem(null)}
      className={`text-xs text-muted-foreground hover:text-foreground transition-all duration-300 cursor-pointer inline-block ${
        hoveredWritingItem === label ? 'translate-x-1 brightness-125' : ''
      }`}
    >
      {label}
    </Link>
  );

  const ImplementationItem = ({ label }: { label: string }) => (
    <a
      href="#"
      onMouseEnter={() => setHoveredImplementationItem(label)}
      onMouseLeave={() => setHoveredImplementationItem(null)}
      className={`text-xs text-muted-foreground hover:text-foreground transition-all duration-300 cursor-pointer inline-block ${
        hoveredImplementationItem === label ? 'translate-x-1 brightness-125' : ''
      }`}
    >
      {label}
    </a>
  );

  const SocialItem = ({ label, href }: { label: string; href: string }) => (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      onMouseEnter={() => setHoveredSocialItem(label)}
      onMouseLeave={() => setHoveredSocialItem(null)}
      className={`hover:text-foreground transition-all duration-300 cursor-pointer inline-block ${
        hoveredSocialItem === label ? 'translate-x-1 brightness-125' : ''
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
                <WritingItem label={topic.label} slug={topic.slug} />
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
                <ImplementationItem label={impl} />
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
            <SocialItem label="Twitter" href="https://x.com/HiddenNeuron_14" />
          </p>
          <p className="text-xs text-muted-foreground">
            <SocialItem label="GitHub" href="https://github.com/vedasamhith146" />
          </p>
        </div>
      </nav>
    </aside>
  );
}

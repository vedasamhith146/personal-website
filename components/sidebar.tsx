'use client';

import { BookOpen, Code2, FileText } from 'lucide-react';

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
  return (
    <aside className="w-64 border-r border-border bg-background p-8 min-h-screen sticky top-0 overflow-y-auto">
      <nav className="space-y-8 animate-slide-in-left">
        {/* Writing Section */}
        <div>
          <div className="flex items-center gap-2 text-foreground mb-4">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Writing</span>
          </div>
          <ul className="space-y-2 ml-6">
            {writingTopics.map((topic, idx) => (
              <li
                key={idx}
                className="text-xs text-muted-foreground hover:text-accent transition-colors duration-300 cursor-pointer"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>

        {/* Implementations Section */}
        <div>
          <div className="flex items-center gap-2 text-foreground mb-4">
            <Code2 className="w-4 h-4" />
            <span className="text-sm font-medium">Implementations</span>
          </div>
          <ul className="space-y-2 ml-6">
            {implementations.map((impl, idx) => (
              <li
                key={idx}
                className="text-xs text-muted-foreground hover:text-accent transition-colors duration-300 cursor-pointer"
              >
                {impl}
              </li>
            ))}
          </ul>
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center gap-2 text-foreground mb-4">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Notes</span>
          </div>
        </div>

        {/* Social Links */}
        <div className="pt-8 border-t border-border space-y-3">
          <p className="text-xs text-muted-foreground">
            <a href="https://twitter.com" className="hover:text-accent transition-colors">
              Twitter
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            <a href="#" className="hover:text-accent transition-colors">
              Ask me anything
            </a>
          </p>
        </div>
      </nav>
    </aside>
  );
}

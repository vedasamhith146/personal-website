import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownArticle } from '../../../components/MarkdownArticle';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

export default function TokenizationPage() {
  const content = readFileSync(join(process.cwd(), 'content', 'tokenization.md'), 'utf-8');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <svg width="100%" height="100%" className="animate-grid-float">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9ca3af" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10">
        <header className="border-b border-border">
          <div className="max-w-[720px] mx-auto px-6 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-8"
            >
              <ArrowLeft size={18} />
              Back to home
            </Link>
          </div>
        </header>

        <main className="max-w-[720px] mx-auto px-6 py-16">
          <article>
            <MarkdownArticle content={content} />
          </article>
        </main>
      </div>
    </div>
  );
}

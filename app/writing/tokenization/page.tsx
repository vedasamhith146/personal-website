import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { readFileSync } from 'fs';
import { join } from 'path';

export default function TokenizationPage() {
  const content = readFileSync(join(process.cwd(), 'content', 'tokenization.md'), 'utf-8');

  const mdComponents = {
    h1: ({ node, ...props }: any) => (
      <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className="text-xl font-semibold text-foreground mt-6 mb-3" {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className="leading-relaxed text-foreground" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc list-inside space-y-2 text-foreground" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="list-decimal list-inside space-y-2 text-foreground" {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li className="leading-relaxed" {...props} />
    ),
    code: ({ node, inline, ...props }: any) => {
      if (inline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props} />
        );
      }
      return (
        <code className="bg-muted px-3 py-2 rounded text-sm font-mono text-foreground block overflow-x-auto" {...props} />
      );
    },
    pre: ({ node, ...props }: any) => (
      <pre className="bg-muted rounded-lg overflow-x-auto p-4 my-4 border border-border" {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote className="border-l-4 border-muted-foreground pl-4 italic text-muted-foreground my-4" {...props} />
    ),
    hr: ({ node, ...props }: any) => (
      <hr className="my-8 border-t border-border" {...props} />
    ),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Elements */}
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
        {/* Header */}
        <header className="border-b border-border">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-8"
            >
              <ArrowLeft size={18} />
              Back to home
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-2xl mx-auto px-6 py-16">
          <article>
            {/* Meta */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
              <span>Independent Research</span>
            </div>

            {/* Body Content */}
            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <ReactMarkdown components={mdComponents}>
                {content}
              </ReactMarkdown>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

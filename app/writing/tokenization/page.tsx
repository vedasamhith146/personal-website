import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { readFileSync } from 'fs';
import { join } from 'path';

export default function TokenizationPage() {
  const content = readFileSync(join(process.cwd(), 'content', 'tokenization.md'), 'utf-8');

const mdComponents = {
  h1: ({ ...props }: any) => (
    <h1
      className="text-5xl font-bold text-foreground mb-6 leading-tight"
      {...props}
    />
  ),

  h2: ({ ...props }: any) => (
    <h2
      className="text-3xl font-semibold text-foreground mt-12 mb-4"
      {...props}
    />
  ),

  h3: ({ ...props }: any) => (
    <h3
      className="text-2xl font-semibold text-foreground mt-8 mb-3"
      {...props}
    />
  ),

  a: ({ node, ...props }: any) => (
  <a
    className="text-blue-400 underline hover:text-blue-300"
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  />
),

  p: ({ ...props }: any) => (
    <p
      className="leading-8 text-foreground text-lg mb-6"
      {...props}
    />
  ),

  ul: ({ ...props }: any) => (
    <ul
      className="list-disc list-inside space-y-2 text-lg"
      {...props}
    />
  ),

  ol: ({ ...props }: any) => (
    <ol
      className="list-decimal list-inside space-y-2 text-lg"
      {...props}
    />
  ),

  li: ({ ...props }: any) => (
    <li className="leading-8" {...props} />
  ),

  blockquote: ({ ...props }: any) => (
    <blockquote
      className="border-l-4 border-muted-foreground pl-6 italic text-muted-foreground my-6"
      {...props}
    />
  ),

  pre: ({ node, ...props }: any) => (
  <pre
    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-6 overflow-x-auto"
    {...props}
  />
),

  code: ({ node, inline, ...props }: any) => {
  if (inline) {
    return (
      <code
        className="bg-zinc-800 px-1.5 py-0.5 rounded text-red-300 font-mono"
        {...props}
      />
    );
  }

  return (
    <code
      className="font-mono text-zinc-100"
      {...props}
    />
  );
},

  img: ({ src, alt }: any) => (
    <img
      src={src}
      alt={alt}
      className="rounded-xl border border-zinc-800 my-8 w-full"
    />
  ),

  table: ({ ...props }: any) => (
    <table
      className="border-collapse border border-border my-6 w-full"
      {...props}
    />
  ),

  th: ({ ...props }: any) => (
    <th
      className="border border-border px-4 py-2 text-left"
      {...props}
    />
  ),

  td: ({ ...props }: any) => (
    <td
      className="border border-border px-4 py-2"
      {...props}
    />
  ),

  hr: ({ ...props }: any) => (
    <hr
      className="my-10 border-border"
      {...props}
    />
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
          <div className="max-w-4xl mx-auto px-6 py-8">
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
        <main className="max-w-4xl mx-auto px-6 py-16">
          <article>
            {/* Meta */}

            {/* Body Content */}
            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <ReactMarkdown
              components={mdComponents}
              remarkPlugins={[remarkGfm, remarkMath]}
             rehypePlugins={[rehypeKatex, rehypeHighlight]}
            >
            {content}
            </ReactMarkdown>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

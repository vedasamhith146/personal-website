'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TokenEmbeddingsPage() {
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

        <main className="max-w-2xl mx-auto px-6 py-16">
          <article>
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              What can we deduce from token embedding table after training
            </h1>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
              <span>Independent Research</span>
            </div>

            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Understanding token representations in large language models.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Token Embeddings Analysis
                </h2>
                <p className="leading-relaxed">
                  After training a language model, the token embedding table contains rich information about the relationships and similarities between tokens. By analyzing this table, we can gain insights into how the model has learned to represent language.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Patterns in Embeddings
                </h2>
                <p className="leading-relaxed">
                  Tokens with similar meanings tend to have similar embeddings. We can observe clustering patterns that correspond to semantic categories—words related to animals cluster together, words related to colors cluster together, and so on.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Linguistic Structure
                </h2>
                <p className="leading-relaxed">
                  The embedding table reveals how the model has encoded linguistic structure. We can see regularities in how morphologically related words are represented, how different parts of speech cluster, and how even syntactic relationships are reflected in the embedding space.
                </p>
              </section>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Understanding token embeddings is crucial for interpreting what language models learn during training.
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TokenizationPage() {
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
            {/* Title */}
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              Tokenization
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
              <span>Independent Research</span>
            </div>

            {/* Body Content */}
            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Tokenization is the foundational process in large language models where raw text is converted into discrete units called tokens that the model can process.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  What are Tokens?
                </h2>
                <p className="leading-relaxed">
                  Tokens are the atomic units of text processing in language models. They can represent individual characters, subwords, or words depending on the tokenization scheme used. Different models use different tokenization strategies—some use byte-pair encoding (BPE), others use WordPiece or SentencePiece.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Why Tokenization Matters
                </h2>
                <p className="leading-relaxed">
                  The choice of tokenization directly impacts model efficiency, vocabulary size, and performance. A well-designed tokenizer can significantly reduce the number of tokens needed to represent text, which directly translates to computational efficiency and context window utilization.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Token Embeddings
                </h2>
                <p className="leading-relaxed">
                  Once text is tokenized, each token is embedded into a high-dimensional vector space. These token embeddings serve as the initial input to the transformer model and encode the semantic meaning of each token in a learnable representation.
                </p>
              </section>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  This article is part of a larger exploration into the architectural components of modern language models.
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

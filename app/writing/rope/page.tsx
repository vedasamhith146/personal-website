'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RoPEPage() {
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
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              RoPE
            </h1>


            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Rotary Position Embedding and its advantages in transformer models.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  What is RoPE?
                </h2>
                <p className="leading-relaxed">
                  Rotary Position Embedding (RoPE) is a position encoding method that applies rotations in the complex plane to the query and key vectors in the attention mechanism. Instead of encoding position as additional information, RoPE encodes position through geometric transformations.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  How RoPE Works
                </h2>
                <p className="leading-relaxed">
                  RoPE uses complex number rotations to encode positional information. For each dimension pair in the attention vectors, a rotation matrix is applied whose angle depends on the position. This elegant approach naturally encodes both absolute and relative position information.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Advantages of RoPE
                </h2>
                <p className="leading-relaxed">
                  RoPE has become increasingly popular in modern language models because it naturally extrapolates to longer sequences, it has strong geometric properties that help with generalization, and it exhibits excellent empirical performance. Models using RoPE show better length extrapolation compared to other positional encoding schemes.
                </p>
              </section>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  RoPE represents an important advancement in how we think about position encoding in transformer architectures.
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

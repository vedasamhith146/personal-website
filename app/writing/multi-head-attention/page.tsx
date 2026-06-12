'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MultiHeadAttentionPage() {
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
              Is multi-head attention really doing the job?
            </h1>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
              <span>Independent Research</span>
            </div>

            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Alternative mechanisms to traditional attention.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  The Multi-Head Attention Question
                </h2>
                <p className="leading-relaxed">
                  Multi-head attention has become a standard component in transformer architectures, but recent research questions whether it's truly necessary or optimal. Are different heads capturing different types of relationships, or is it simply redundant?
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Head Specialization and Redundancy
                </h2>
                <p className="leading-relaxed">
                  Analysis of trained models reveals that attention heads develop different specializations. Some heads focus on syntactic relationships, others on semantic similarities, and some on more abstract pattern matching. However, significant redundancy exists, suggesting that the multiple heads partly serve as regularization.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Alternative Approaches
                </h2>
                <p className="leading-relaxed">
                  Researchers have explored alternatives like single-head attention with increased capacity, grouped query attention, and attention mechanisms with different computational properties. These alternatives sometimes match or exceed the performance of multi-head attention while being more efficient.
                </p>
              </section>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Understanding whether multi-head attention is necessary is crucial for building more efficient models.
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

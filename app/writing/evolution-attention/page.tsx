'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EvolutionAttentionPage() {
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
              Evolution of attention
            </h1>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
              <span>Independent Research</span>
            </div>

            <div className="prose prose-invert max-w-none space-y-6 text-foreground">
              <p className="text-lg text-muted-foreground leading-relaxed">
                How reasoning emerges in large language models.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  From Simple to Complex
                </h2>
                <p className="leading-relaxed">
                  The attention mechanism has evolved significantly since its introduction in the Transformer architecture. Early implementations were relatively simple, but as models scaled and tasks became more complex, the mechanism itself evolved to handle increasingly sophisticated reasoning patterns.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Emergent Reasoning Capabilities
                </h2>
                <p className="leading-relaxed">
                  As language models grew larger and were trained on more diverse data, reasoning capabilities emerged within the attention mechanism. The model learned to attend to relevant context, chain logical inferences, and maintain coherence across long sequences—all through the gradual refinement of how attention weights are computed and applied.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                  Modern Attention Variants
                </h2>
                <p className="leading-relaxed">
                  Modern attention mechanisms continue to evolve. From multi-head attention to sparse attention patterns, from attention pooling to more specialized mechanisms for specific tasks, the architecture adapts to handle the computational and reasoning demands of increasingly complex problems.
                </p>
              </section>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  The evolution of attention shows how architectural innovations lead to emergent capabilities in large language models.
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

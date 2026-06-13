'use client';

import { ArticlePage } from '../../../components/ArticlePage';

export default function EvolutionAttentionPage() {
  return (
    <ArticlePage slug="evolution-attention">
      <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">Evolution of attention</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-foreground">
        <p className="text-lg text-muted-foreground leading-relaxed">
          How reasoning emerges in large language models.
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">From Simple to Complex</h2>
          <p className="leading-relaxed">
            The attention mechanism has evolved significantly since its introduction in the Transformer architecture. Early implementations were relatively simple, but as models scaled and tasks became more complex, the mechanism itself evolved to handle increasingly sophisticated reasoning patterns.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Emergent Reasoning Capabilities</h2>
          <p className="leading-relaxed">
            As language models grew larger and were trained on more diverse data, reasoning capabilities emerged within the attention mechanism. The model learned to attend to relevant context, chain logical inferences, and maintain coherence across long sequences—all through the gradual refinement of how attention weights are computed and applied.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Modern Attention Variants</h2>
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
    </ArticlePage>
  );
}

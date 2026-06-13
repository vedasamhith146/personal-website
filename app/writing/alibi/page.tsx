'use client';

import { ArticlePage } from '../../../components/ArticlePage';

export default function ALiBiPage() {
  return (
    <ArticlePage slug="alibi">
      <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">ALiBi</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-foreground">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Attention with Linear Biases: A simple yet effective positional encoding.
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Introduction to ALiBi</h2>
          <p className="leading-relaxed">
            Attention with Linear Biases (ALiBi) is a positional encoding method that modifies the attention mechanism directly rather than encoding position information into embeddings. Instead of adding positional embeddings to token representations, ALiBi applies bias terms directly to the attention scores.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How ALiBi Works</h2>
          <p className="leading-relaxed">
            ALiBi works by adding a learnable bias to attention scores based on the distance between query and key positions. Tokens that are closer together receive smaller penalties, while tokens further apart receive larger penalties. This simple mechanism encourages the model to attend more to nearby tokens and less to distant ones.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Advantages of ALiBi</h2>
          <p className="leading-relaxed">
            ALiBi offers several advantages over traditional positional encodings: it reduces the number of parameters needed, it generalizes better to longer sequences than the model was trained on, and it simplifies the architecture by removing positional embeddings entirely. This makes it an elegant and practical solution for positional encoding.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            ALiBi demonstrates how simple modifications to the attention mechanism can lead to more efficient and generalizable models.
          </p>
        </div>
      </div>
    </ArticlePage>
  );
}

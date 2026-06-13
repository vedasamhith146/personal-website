'use client';

import { ArticlePage } from '../../../components/ArticlePage';

export default function RoPEPage() {
  return (
    <ArticlePage slug="rope">
      <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">RoPE</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-foreground">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Rotary Position Embedding and its advantages in transformer models.
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What is RoPE?</h2>
          <p className="leading-relaxed">
            Rotary Position Embedding (RoPE) is a position encoding method that applies rotations in the complex plane to the query and key vectors in the attention mechanism. Instead of encoding position as additional information, RoPE encodes position through geometric transformations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How RoPE Works</h2>
          <p className="leading-relaxed">
            RoPE uses complex number rotations to encode positional information. For each dimension pair in the attention vectors, a rotation matrix is applied whose angle depends on the position. This elegant approach naturally encodes both absolute and relative position information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Advantages of RoPE</h2>
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
    </ArticlePage>
  );
}

'use client';

import { ArticlePage } from '../../../components/ArticlePage';

export default function TokenEmbeddingsPage() {
  return (
    <ArticlePage slug="token-embeddings">
      <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
        What can we deduce from token embedding table after training
      </h1>

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
    </ArticlePage>
  );
}

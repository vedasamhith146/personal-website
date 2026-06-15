export type ArticleDefinition = {
  id: number;
  title: string;
  description: string;
  slug: string;
  delay: number;
};

export const ARTICLES: ArticleDefinition[] = [
  {
    id: 1,
    title: 'Tokenization',
    description: 'Breaking down text into tokens and understanding tokenization in language models.',
    slug: 'tokenization',
    delay: 0,
  },
  {
    id: 2,
    title: 'What can we deduce from token embedding table after training',
    description: 'Understanding token representations in large language models.',
    slug: 'token-embeddings',
    delay: 1,
  },
  {
    id: 3,
    title: 'ALiBi',
    description: 'Attention with Linear Biases: A simple yet effective positional encoding.',
    slug: 'alibi',
    delay: 2,
  },
  {
    id: 4,
    title: 'RoPE',
    description: 'Rotary Position Embedding and its advantages in transformer models.',
    slug: 'rope',
    delay: 3,
  },
  {
    id: 5,
    title: 'Evolution of attention',
    description: 'How reasoning emerges in large language models.',
    slug: 'evolution-attention',
    delay: 4,
  },
  {
    id: 6,
    title: 'Is multi-head attention really doing the job?',
    description: 'Alternative mechanisms to traditional attention.',
    slug: 'multi-head-attention',
    delay: 5,
  },
  {
    id: 7,
    title: 'The journey of activation functions',
    description: 'Evolution of activation functions in neural networks.',
    slug: 'activation-functions',
    delay: 6,
  },
  {
    id: 8,
    title: 'Can Transformer Language Models Without Positional Information Learn Positional Information?',
    description: 'Understanding whether Transformers can recover token order when positional signals are removed.',
    slug: 'positional-information',
    delay: 7,
  },
];

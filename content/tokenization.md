# Tokenization

Tokenization is the foundational process in large language models where raw text is converted into discrete units called tokens that the model can process.

## What are Tokens?

Tokens are the atomic units of text processing in language models. They can represent individual characters, subwords, or words depending on the tokenization scheme used. Different models use different tokenization strategies—some use byte-pair encoding (BPE), others use WordPiece or SentencePiece.

## Why Tokenization Matters

The choice of tokenization directly impacts model efficiency, vocabulary size, and performance. A well-designed tokenizer can significantly reduce the number of tokens needed to represent text, which directly translates to computational efficiency and context window utilization.

## Token Embeddings

Once text is tokenized, each token is embedded into a high-dimensional vector space. These token embeddings serve as the initial input to the transformer model and encode the semantic meaning of each token in a learnable representation.

---

This article is part of a larger exploration into the architectural components of modern language models.

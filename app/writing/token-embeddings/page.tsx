import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownArticle } from '../../../components/MarkdownArticle';
import { ArticlePage } from '../../../components/ArticlePage';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

export default function TokenEmbeddingsPage() {
  const content = readFileSync(join(process.cwd(), 'content', 'token-embeddings.md'), 'utf-8');

  return (
    <ArticlePage slug="token-embeddings">
      <MarkdownArticle content={content} />
    </ArticlePage>
  );
}

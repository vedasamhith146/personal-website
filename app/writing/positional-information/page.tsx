import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownArticle } from '../../../components/MarkdownArticle';
import { ArticlePage } from '../../../components/ArticlePage';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

export default function PositionalInformationPage() {
  const content = readFileSync(join(process.cwd(), 'content', 'positional-information.md'), 'utf-8');

  return (
    <ArticlePage slug="positional-information">
      <MarkdownArticle content={content} />
    </ArticlePage>
  );
}

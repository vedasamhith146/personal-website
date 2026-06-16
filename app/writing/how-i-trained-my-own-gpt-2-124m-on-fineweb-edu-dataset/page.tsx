import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownArticle } from '../../../components/MarkdownArticle';
import { ArticlePage } from '../../../components/ArticlePage';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

export default function GPT2FineWebEduPage() {
  const content = readFileSync(join(process.cwd(), 'content', 'how-i-trained-my-own-gpt-2-124m-on-fineweb-edu-dataset.md'), 'utf-8');

  return (
    <ArticlePage slug="how-i-trained-my-own-gpt-2-124m-on-fineweb-edu-dataset">
      <MarkdownArticle content={content} />
    </ArticlePage>
  );
}

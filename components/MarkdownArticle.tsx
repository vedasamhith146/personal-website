import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Source_Serif_4 } from 'next/font/google';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');

const extractH2Headings = (markdown: string) => {
  const headings: Array<{ text: string; id: string }> = [];
  const counts = new Map<string, number>();
  const regex = /^##\s+(.*)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const rawText = match[1].replace(/\*|\[|\]|`|\(|\)|_/g, '').trim();
    if (!rawText) continue;
    const baseId = slugify(rawText);
    const count = counts.get(baseId) ?? 0;
    const id = count > 0 ? `${baseId}-${count + 1}` : baseId;
    counts.set(baseId, count + 1);
    headings.push({ text: rawText, id });
  }

  return headings;
};

const mdComponents = {
  h1: ({ ...props }: any) => (
    <h1 className="mt-0 mb-6 text-5xl font-semibold tracking-tight text-slate-100" {...props} />
  ),

  h2: ({ children, ...props }: any) => {
    const headingText = React.Children.toArray(children).join('');
    const id = slugify(String(headingText));

    return (
      <h2 id={id} className="mt-12 mb-4 text-3xl font-semibold tracking-tight text-slate-100" {...props}>
        {children}
      </h2>
    );
  },

  h3: ({ ...props }: any) => (
    <h3 className="mt-10 mb-3 text-2xl font-semibold tracking-tight text-slate-100" {...props} />
  ),

  p: ({ ...props }: any) => (
    <p className="mb-6 text-[20px] leading-8 text-slate-200" {...props} />
  ),

  a: ({ ...props }: any) => (
    <a
      className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 transition-colors duration-200 hover:text-sky-100"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),

  ul: ({ ...props }: any) => (
    <ul className="ml-6 list-disc space-y-3 text-[20px] leading-8 text-slate-200" {...props} />
  ),

  ol: ({ ...props }: any) => (
    <ol className="ml-6 list-decimal space-y-3 text-[20px] leading-8 text-slate-200" {...props} />
  ),

  li: ({ ...props }: any) => (
    <li className="pl-1" {...props} />
  ),

  blockquote: ({ ...props }: any) => (
    <blockquote
      className="border-l-4 border-slate-600 bg-slate-950/80 px-6 py-5 text-slate-300 italic leading-8 my-6"
      {...props}
    />
  ),

  pre: ({ ...props }: any) => (
    <pre className="my-6 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950 p-6" {...props} />
  ),

  code: ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-sm text-sky-200" {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className={`block whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-100 ${className ?? ''}`}
        {...props}
      >
        {children}
      </code>
    );
  },

  img: ({ src, alt, ...props }: any) => {
    const normalizedSrc = typeof src === 'string' ? src.replace(/^\.\/?/, '/').replace(/\/public\//, '/') : src;

    return (
      <img
        src={normalizedSrc}
        alt={alt ?? ''}
        loading="lazy"
        className="mx-auto my-8 max-h-[60rem] w-full rounded-3xl border border-slate-800 object-contain"
        {...props}
      />
    );
  },

  table: ({ children, ...props }: any) => (
    <div className="my-6 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/70" {...props}>
      <table className="min-w-full border-collapse text-left text-[18px] leading-8 text-slate-200">{children}</table>
    </div>
  ),

  th: ({ ...props }: any) => (
    <th className="border-b border-slate-700 px-4 py-3 text-left font-semibold text-slate-100" {...props} />
  ),

  td: ({ ...props }: any) => (
    <td className="border-b border-slate-800 px-4 py-3 text-slate-200" {...props} />
  ),

  hr: ({ ...props }: any) => <hr className="my-10 border-slate-700" {...props} />,
};

export type MarkdownArticleProps = {
  content: string;
};

const splitTitleAndBody = (markdown: string) => {
  const titleMatch = markdown.match(/^#\s+(.*)(?:\r?\n|$)/);

  if (!titleMatch) {
    return { title: null, body: markdown.trimStart() };
  }

  const titleLine = titleMatch[0];
  const title = `# ${titleMatch[1].trim()}`;
  const body = markdown.slice(titleLine.length).trimStart();
  return { title, body };
};

export function MarkdownArticle({ content }: MarkdownArticleProps) {
  const { title, body } = splitTitleAndBody(content);
  const headings = extractH2Headings(body);

  return (
    <div className={`${sourceSerif.className} markdown-article`}>
      {title && (
        <div className="markdown-title">
          <ReactMarkdown components={mdComponents}>{title}</ReactMarkdown>
        </div>
      )}

      {headings.length > 0 && (
        <nav className="toc-box mb-10 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <p className="mb-4 text-sm uppercase tracking-[0.24em] text-slate-400">Contents</p>
          <ul className="space-y-3">
            {headings.map(({ text, id }) => (
              <li key={id}>
                <a href={`#${id}`} className="text-slate-200 transition-colors duration-200 hover:text-sky-200 hover:underline">
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

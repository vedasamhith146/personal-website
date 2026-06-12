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

const mdComponents = {
  h1: ({ ...props }: any) => (
    <h1 className="mt-0 mb-6 text-5xl font-semibold tracking-tight text-slate-100" {...props} />
  ),

  h2: ({ ...props }: any) => (
    <h2 className="mt-12 mb-4 text-3xl font-semibold tracking-tight text-slate-100" {...props} />
  ),

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
    <pre
      className="my-6 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950 p-6"
      {...props}
    />
  ),

  code: ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code
          className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-sm text-sky-200"
          {...props}
        >
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
    const normalizedSrc = typeof src === 'string'
      ? src.replace(/^\.\/?/, '/').replace(/\/public\//, '/')
      : src;

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
      <table className="min-w-full border-collapse text-left text-[18px] leading-8 text-slate-200">
        {children}
      </table>
    </div>
  ),

  th: ({ ...props }: any) => (
    <th className="border-b border-slate-700 px-4 py-3 text-left font-semibold text-slate-100" {...props} />
  ),

  td: ({ ...props }: any) => (
    <td className="border-b border-slate-800 px-4 py-3 text-slate-200" {...props} />
  ),

  hr: ({ ...props }: any) => (
    <hr className="my-10 border-slate-700" {...props} />
  ),
};

export type MarkdownArticleProps = {
  content: string;
};

export function MarkdownArticle({ content }: MarkdownArticleProps) {
  return (
    <div className={`${sourceSerif.className} markdown-article`}> 
      <ReactMarkdown
        components={mdComponents}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

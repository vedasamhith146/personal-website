import Link from 'next/link';
import { ARTICLES } from '@/lib/article-definitions';

export default function ResearchList() {
  return (
    <div className="space-y-4">
      {ARTICLES.map((item) => (
        <Link key={item.id} href={`/writing/${item.slug}`} className="group block">
          <div
            className="border border-border rounded-lg p-6 transition-all duration-300 cursor-pointer bg-background/40 hover:border-accent hover:bg-card hover:shadow-lg hover:-translate-y-1"
            style={{ animationDelay: `${item.delay * 100}ms` }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-accent transition-colors duration-300">
              {item.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

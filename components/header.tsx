'use client';

import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-full px-8 py-6">
        <button
          onClick={() => router.push('/')}
          className="text-2xl font-light tracking-widest text-foreground animate-fade-in cursor-pointer hover:text-accent transition-colors duration-300 group inline-block"
        >
          <span className="inline-block group-hover:translate-x-1 transition-transform duration-300">
            VEDA SAMHITH
          </span>
        </button>
      </div>
    </header>
  );
}

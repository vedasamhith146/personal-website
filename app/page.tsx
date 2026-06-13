import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import FeaturedSection from '@/components/featured-section';
import ResearchList from '@/components/research-list';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <svg
          width="100%"
          height="100%"
          className="animate-grid-float"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9ca3af" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Background Text Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-3">
        {['attention', 'residual', 'embedding', 'feature', 'token', 'transformer', 'mlp', 'circuit'].map((text, idx) => (
          <div
            key={idx}
            className="absolute text-xs font-mono text-muted-foreground animate-float-text"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${idx * 1}s`,
            }}
          >
            {text}
          </div>
        ))}
      </div>

      <Header />
      <div className="flex relative z-10">
        <Sidebar />
        <main className="flex-1 border-l border-border">
          <div className="max-w-5xl mx-auto px-12 py-16">
            {/* Featured Section */}
            <FeaturedSection />

            <ResearchList />
          </div>
        </main>
      </div>
    </div>
  );
}

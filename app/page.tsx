'use client';

import { useState } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import FeaturedSection from '@/components/featured-section';
import ResearchList from '@/components/research-list';

export default function Home() {
  const [activeTab, setActiveTab] = useState('featured');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 border-l border-border">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {/* Featured Section */}
            <FeaturedSection />

            {/* Tabs */}
            <div className="flex gap-6 mt-12 border-b border-border mb-8">
              {['Featured', 'Most read', 'Most liked'].map((tab) => (
                <button
                  key={tab.toLowerCase()}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`pb-4 px-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.toLowerCase()
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Research List */}
            <ResearchList activeTab={activeTab} />
          </div>
        </main>
      </div>
    </div>
  );
}

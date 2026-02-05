'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Project } from '@/lib/types';
import { ProjectCardV2 } from './ProjectCardV2';
import { Search, Cpu, X } from 'lucide-react';
import clsx from 'clsx';

// Section Header - Theme aware
const SectionHeader = ({ title, count }: { title: string; count: number }) => (
  <div className="flex items-center gap-4 mb-8">
    <h2 className="text-sm font-display font-semibold text-[var(--foreground)] tracking-wide">
      {title}
    </h2>
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold border border-[var(--border-subtle)]">
      {count}
    </span>
    <div className="h-px flex-1 bg-[var(--border-subtle)]" />
  </div>
);

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = projects.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description?.toLowerCase().includes(query.toLowerCase()) ||
    p.tech?.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const workProjects = filtered.filter(p => p.category === 'work');
  const otherProjects = filtered.filter(p => p.category !== 'work');

  return (
    <div className="relative min-h-screen pb-32 pt-8">
      
      {/* Search Header */}
      <header className="mb-12 max-w-2xl">
        <div className={clsx(
          "relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border backdrop-blur-sm",
          isFocused 
            ? "bg-[var(--bg-card-hover)] border-[var(--border-hover)] shadow-[var(--shadow-card-hover)]" 
            : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
        )}>
          <div className={clsx(
            "transition-colors duration-300",
            isFocused ? "text-[var(--foreground)]" : "text-[var(--text-tertiary)]"
          )}>
            <Search size={20} strokeWidth={1.5} />
          </div>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search projects..." 
            className="flex-1 bg-transparent border-none outline-none text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] h-8 text-lg font-medium"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] text-[10px] font-semibold">
            <span className="text-xs">⌘</span>
            <span>K</span>
          </div>
        </div>
        
        <div className="mt-4 px-1 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span className="font-medium">{filtered.length} projects</span>
        </div>
      </header>
    
      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-tertiary)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--border-subtle)] flex items-center justify-center mb-6">
            <Cpu size={28} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">No projects found matching &quot;{query}&quot;</p>
          <button 
            onClick={() => setQuery('')}
            className="mt-4 text-xs text-[var(--accent-blue)] hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      <div className="space-y-16">
        {/* Work Section */}
        {workProjects.length > 0 && (
          <section>
            <SectionHeader title="Enterprise" count={workProjects.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {workProjects.map((p, i) => (
                <ProjectCardV2 
                  key={p.id} 
                  project={p}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* Others */}
        {otherProjects.length > 0 && (
          <section>
            <SectionHeader title="Lab & Study" count={otherProjects.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {otherProjects.map((p, i) => (
                <ProjectCardV2 
                  key={p.id} 
                  project={p}
                  index={i + workProjects.length}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

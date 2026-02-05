'use client';

import React, { Suspense } from 'react';
import { LayoutGrid, Briefcase, User, Wrench, BookOpen, ShieldAlert, Server, Command } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ThemeSwitcher } from './ThemeSwitcher';
import clsx from 'clsx';

interface SidebarProps {
  counts: {
    all: number;
    work: number;
    personal: number;
    tools: number;
    study: number;
  };
}

function SidebarContent({ counts }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  const isAllProjectsActive = pathname === '/' && !currentCategory;
  const isCategoryActive = (cat: string) => pathname === '/' && currentCategory === cat;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[280px] flex flex-col z-50 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] transition-colors duration-300">
      {/* Logo Area */}
      <div className="flex items-center gap-3 pt-8 pb-8 px-6">
        <div className="w-10 h-10 bg-[var(--accent-primary)] rounded-xl flex items-center justify-center shadow-lg">
          <Command size={18} className="text-[var(--background)]" />
        </div>
        <div>
          <div className="font-display font-semibold text-base tracking-tight text-[var(--foreground)]">
            Project Hub
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] font-medium tracking-wide uppercase">
            Workspace
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1">
        <Link href="/">
          <NavItem 
            icon={<LayoutGrid size={16} />} 
            label="Overview" 
            active={isAllProjectsActive} 
            count={counts.all} 
          />
        </Link>
        
        <div className="mt-8 mb-3 px-3 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
          Sectors
        </div>
        
        <Link href="/?category=work">
          <NavItem 
            icon={<Briefcase size={16} />} 
            label="Enterprise" 
            count={counts.work}
            active={isCategoryActive('work')}
          />
        </Link>
        <Link href="/?category=personal">
          <NavItem 
            icon={<User size={16} />} 
            label="Personal Lab" 
            count={counts.personal} 
            active={isCategoryActive('personal')}
          />
        </Link>
        <Link href="/?category=tools">
          <NavItem 
            icon={<Wrench size={16} />} 
            label="Toolchain" 
            count={counts.tools} 
            active={isCategoryActive('tools')}
          />
        </Link>
        <Link href="/?category=study">
          <NavItem 
            icon={<BookOpen size={16} />} 
            label="Knowledge Base" 
            count={counts.study} 
            active={isCategoryActive('study')}
          />
        </Link>

        <div className="mt-8 mb-3 px-3 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
          System
        </div>

        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('open-port-killer'))}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
        >
          <NavItem 
            icon={<ShieldAlert size={16} />} 
            label="Port Killer" 
            active={false} 
          />
        </div>
        
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('open-pm2-manager'))}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
        >
          <NavItem 
            icon={<Server size={16} />} 
            label="Process Control" 
            active={false}
          />
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-5 border-t border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-[var(--status-active)] animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-[var(--status-active)] blur-[3px] opacity-60" />
            </div>
            <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--status-active)] transition-colors font-medium">
              System Online
            </span>
          </div>
          <ThemeSwitcher />
        </div>
        
        <div className="text-[10px] text-[var(--text-tertiary)] font-mono flex justify-between items-center">
          <span>v2.0.0</span>
          <span className="text-[var(--status-active)]">●</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, count, active }: { 
  icon: React.ReactNode; 
  label: string; 
  count?: number; 
  active?: boolean;
}) {
  return (
    <div className={clsx(
      "group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
      active 
        ? "bg-[var(--accent-primary)] text-[var(--background)] shadow-sm" 
        : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)]"
    )}>
      <span className={clsx(
        "transition-colors",
        active ? "text-[var(--background)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--foreground)]"
      )}>
        {icon}
      </span>
      
      <span className="flex-1 text-[13px] font-medium tracking-tight">{label}</span>
      
      {count !== undefined && (
        <span className={clsx(
          "text-[10px] px-2 py-0.5 rounded-lg font-semibold transition-colors tabular-nums",
          active 
            ? "bg-[var(--background)]/20 text-[var(--background)]" 
            : "bg-[var(--border-subtle)] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
        )}>
          {count}
        </span>
      )}
    </div>
  );
}

export function Sidebar({ counts }: SidebarProps) {
  return (
    <Suspense fallback={
      <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] animate-pulse" />
    }>
      <SidebarContent counts={counts} />
    </Suspense>
  );
}

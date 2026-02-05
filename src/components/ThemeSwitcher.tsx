'use client';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-24 h-8 rounded-full bg-[var(--border-subtle)] animate-pulse" />;
  }

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="flex gap-0.5 p-1 bg-[var(--bg-secondary)] rounded-full border border-[var(--border-subtle)] transition-colors">
      {themes.map(t => {
        const isActive = theme === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={clsx(
              "relative flex items-center justify-center p-1.5 rounded-full transition-all duration-300",
              isActive 
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm" 
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]"
            )}
            title={t.label}
            aria-label={`Switch to ${t.label} theme`}
          >
            <Icon size={14} strokeWidth={2} />
            {isActive && (
              <span className="absolute inset-0 rounded-full animate-[scale-in_0.2s_ease-out]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

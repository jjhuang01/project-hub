'use client';

import React from 'react';
import { Project } from '@/lib/types';
import { ExternalLink, Github, Terminal, Folder, Play } from 'lucide-react';
import { useTerminal } from '@/components/TerminalProvider';
import { openPathAction } from '@/app/actions';
import clsx from 'clsx';
import { motion } from 'framer-motion';

// Tech badge color mapping
const techColors: Record<string, { bg: string; text: string; border: string }> = {
  'React': { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20' },
  'Next.js': { bg: 'bg-black/5 dark:bg-white/10', text: 'text-black dark:text-white', border: 'border-black/10 dark:border-white/20' },
  'TypeScript': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  'Vue': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  'Python': { bg: 'bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-500/20' },
  'NestJS': { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  'TailwindCSS': { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20' },
  'PostgreSQL': { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
  'Docker': { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
  'Flutter': { bg: 'bg-blue-400/10', text: 'text-blue-500 dark:text-blue-300', border: 'border-blue-400/20' },
};

const defaultTechStyle = { bg: 'bg-[var(--border-subtle)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--border-subtle)]' };

function getTechStyle(tech: string) {
  // Check for partial matches
  for (const [key, style] of Object.entries(techColors)) {
    if (tech.toLowerCase().includes(key.toLowerCase())) {
      return style;
    }
  }
  return defaultTechStyle;
}

export function ProjectCardV2({ project, index = 0 }: { project: Project; index?: number }) {
  const { openTerminal, activeId } = useTerminal();
  
  const isRunning = activeId === project.id;
  const finalCommand = project.runCommand || 'npm run dev';

  const handleRun = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openTerminal(project.id, project.name, project.path, finalCommand);
  };

  const handleOpenPath = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPathAction(project.path);
  };

  return (
    <motion.div 
      layoutId={project.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="group relative h-full"
    >
      <div className={clsx(
        "relative h-full flex flex-col rounded-2xl transition-all duration-300 hover-lift",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
        "shadow-[var(--shadow-card)]",
        "hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]",
        isRunning && "ring-2 ring-[var(--status-active)]/20 border-[var(--status-active)]/30"
      )}>
        
        {/* Active Glow Effect */}
        {isRunning && (
          <div className="absolute inset-0 rounded-2xl bg-[var(--status-active)]/5 pointer-events-none" />
        )}

        <div className="p-6 flex flex-col flex-1 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300",
                isRunning 
                  ? "bg-[var(--status-active)]/10 border-[var(--status-active)]/20 text-[var(--status-active)]"
                  : "bg-[var(--border-subtle)] border-[var(--border-subtle)] text-[var(--text-tertiary)] group-hover:text-[var(--foreground)] group-hover:border-[var(--border-hover)]"
              )}>
                {project.icon ? (
                  <span className="text-xl">{project.icon}</span>
                ) : (
                  <Terminal size={18} strokeWidth={1.5} />
                )}
              </div>
              <div>
                <h3 className={clsx(
                  "text-base font-display font-semibold tracking-tight transition-colors",
                  isRunning ? "text-[var(--status-active)]" : "text-[var(--foreground)]"
                )}>
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wider">
                    {project.category}
                  </span>
                  {isRunning && (
                    <span className="flex items-center gap-1 text-[9px] text-[var(--status-active)] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-active)] animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-2 grow group-hover:text-[var(--foreground)]/70 transition-colors">
            {project.description || 'No description provided.'}
          </p>

          {/* Tech Stack */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {project.tech?.slice(0, 3).map((t, i) => {
              const style = getTechStyle(t);
              return (
                <span 
                  key={i} 
                  className={clsx(
                    "text-[10px] px-2 py-1 rounded-lg font-semibold border transition-colors",
                    style.bg, style.text, style.border
                  )}
                >
                  {t}
                </span>
              );
            })}
            {project.tech && project.tech.length > 3 && (
              <span className="text-[10px] px-2 py-1 rounded-lg bg-[var(--border-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-medium">
                +{project.tech.length - 3}
              </span>
            )}
          </div>

          {/* Action Area */}
          <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Terminal Button */}
            {project.runCommand ? (
              <button 
                onClick={handleRun}
                className={clsx(
                  "flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all text-xs font-semibold border flex-1",
                  isRunning 
                    ? "bg-[var(--status-active)]/10 text-[var(--status-active)] border-[var(--status-active)]/20 hover:bg-[var(--status-active)]/20" 
                    : "bg-[var(--accent-primary)] text-[var(--background)] border-transparent hover:opacity-90 shadow-sm"
                )}
              >
                {isRunning ? <Terminal size={14} /> : <Play size={14} />}
                <span>{isRunning ? 'Terminal' : 'Start'}</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-medium border border-transparent bg-transparent text-[var(--text-tertiary)] cursor-not-allowed flex-1">
                <Terminal size={14} />
                <span>No Script</span>
              </div>
            )}

            {/* Open Folder */}
            {project.path && (
              <button 
                onClick={handleOpenPath}
                className="p-2 rounded-xl hover:bg-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] transition-colors"
                title={project.path}
              >
                <Folder size={16} />
              </button>
            )}
            
            {/* Links */}
            <div className="flex gap-1 border-l border-[var(--border-subtle)] pl-2 ml-1">
              {project.repoUrl && (
                <a 
                  href={project.repoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-xl hover:bg-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Github size={16} />
                </a>
              )}
              {project.demoUrl && (
                <a 
                  href={project.demoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-xl hover:bg-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

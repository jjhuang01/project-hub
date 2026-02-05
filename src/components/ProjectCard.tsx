'use client';

import React from 'react';
import { Project } from '@/lib/types';
import { Play, Folder, Terminal as TermIcon, Info } from 'lucide-react';
import { openPathAction } from '@/app/actions';
import { useTerminal } from '@/components/TerminalProvider';
import clsx from 'clsx';

export function ProjectCard({ project }: { project: Project }) {
  const { openTerminal, activeId } = useTerminal();
  
  // 简化状态：只要当前终端是这个项目，就认为是"运行/查看中"
  // (注: Project Hub 目前是单任务终端模式)
  const isRunning = activeId === project.id;

  // 智能命令探测结果
  const finalCommand = project.runCommand || 'echo "No detected run command"';
  const source = project.commandSource || 'default';

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    openTerminal(project.id, project.name, project.path, finalCommand);
  };

  const handleOpenPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await openPathAction(project.path);
  };

  // UI 状态计算 (运行中，或者项目本身状态为 active)
  const isProjectActive = project.status === 'active';
  
  // 动态样式
  const statusBorder = isRunning
    ? 'border-green-500/50 ring-1 ring-green-500/30'
    : 'border-white/20 hover:border-blue-400/30';
    
  const statusShadow = isRunning
    ? 'shadow-[0_8px_32px_rgba(34,197,94,0.15)]'
    : 'shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]';

  const sourceLabel = {
      'custom': 'Custom',
      'package.json': 'npm script',
      'framework': 'Framework',
      'file-structure': 'Detected',
      'default': 'Default',
      'manual': 'Manual',
      'detected': 'Detected',
      'none': 'No Script'
  }[source] || source;

  return (
    <div 
      className={clsx(
        "group relative flex flex-col p-5 rounded-2xl transition-all duration-300 border bg-white/70 backdrop-blur-xl h-[180px]", // 固定高度
        statusBorder,
        statusShadow,
        isRunning && "bg-green-50/40"
      )}
      onClick={handleRun}
    >
      {/* 顶部：状态灯 + 标题 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex h-3 w-3 shrink-0">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={clsx(
                "relative inline-flex rounded-full h-3 w-3 transition-colors duration-500",
                isRunning ? "bg-green-500" : (isProjectActive ? "bg-blue-400" : "bg-slate-300")
            )}></span>
          </div>
          <h3 className="font-semibold text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors truncate">
            {project.name}
          </h3>
        </div>
        
        {/* 顶部操作栏 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 pl-2">
           <button 
             onClick={handleOpenPath}
             className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg transition-all"
             title={`Open ${project.path}`}
           >
             <Folder size={16} strokeWidth={2} />
           </button>
        </div>
      </div>

      {/* 描述 - 限制行数 */}
      <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2 h-8 font-medium">
        {project.description || 'No description provided'}
      </p>

      {/* 底部：技术栈 + 启动按钮 */}
      <div className="mt-auto flex items-end justify-between gap-3">
        
        {/* 技术栈 Tag & Source - 使用 flex-col 和 min-w-0 防止挤压 */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 h-[22px] overflow-hidden content-start">
            {project.tech?.slice(0, 3).map(t => (
                <span key={t} className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100/80 border border-slate-200/50 rounded-md whitespace-nowrap">
                {t}
                </span>
            ))}
            </div>
            
            {/* Command Source Hint */}
            <div className="flex items-center gap-1 text-[10px] text-slate-300 px-0.5 group-hover:text-slate-400 transition-colors" title={`Command: ${finalCommand}`}>
                <Info size={10} />
                <span className="truncate">{sourceLabel}</span>
            </div>
        </div>

        {/* 启动按钮 - 固定不缩放 */}
        <button 
          onClick={handleRun}
          className={clsx(
            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border shadow-sm",
            isRunning
              ? "bg-white border-green-200 text-green-600 hover:bg-green-50"
              : "bg-slate-900 border-transparent text-white hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5"
          )}
        >
          {isRunning ? (
            <>
              <TermIcon size={14} strokeWidth={2.5} />
              <span>Terminal</span>
            </>
          ) : (
            <>
              <Play size={14} className="fill-current" />
              <span>Start</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

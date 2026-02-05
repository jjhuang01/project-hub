'use client';

import React, { createContext, useContext, useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { X, Minimize2, Square, RefreshCw, OctagonX } from 'lucide-react';
import clsx from 'clsx';

const XTerminal = lazy(() => import('./XTerminal').then(m => ({ default: m.XTerminal })));

// --- Types ---
interface TerminalSession {
  id: string;        // 前端 session ID
  projectId: string;
  name: string;
  cwd: string;
  cmd: string;
  key: number;       // 用于强制重新渲染
  connected: boolean;
  ptySessionId: string | null; // 后端 PTY session ID
}

interface TerminalContextType {
  openTerminal: (id: string, name: string, cwd?: string, cmd?: string) => void;
  closeTerminal: (sessionId?: string) => void;
  minimizeTerminal: () => void;
  activeId: string | null;
  sessions: TerminalSession[];
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) throw new Error('useTerminal must be used within TerminalProvider');
  return context;
}

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  
  // 存储每个 session 的 kill 函数引用
  const killRefs = useRef<Map<string, React.MutableRefObject<(() => void) | null>>>(new Map());

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // 打开或切换终端
  const openTerminal = useCallback((projectId: string, name: string, cwd?: string, cmd?: string) => {
    setSessions(prev => {
      // 检查是否已有同项目的终端
      const existing = prev.find(s => s.projectId === projectId);
      if (existing) {
        setActiveSessionId(existing.id);
        setMinimized(false);
        return prev;
      }
      // 创建新 session
      const newSession: TerminalSession = {
        id: `session-${Date.now()}`,
        projectId,
        name,
        cwd: cwd || '',
        cmd: cmd || '',
        key: Date.now(),
        connected: false,
        ptySessionId: null,
      };
      setActiveSessionId(newSession.id);
      setMinimized(false);
      return [...prev, newSession];
    });
  }, []);

  // 关闭终端 (发送 kill)
  const closeTerminal = useCallback((sessionId?: string) => {
    const targetId = sessionId || activeSessionId;
    if (!targetId) return;

    // 调用 XTerminal 的 kill 方法
    const killRef = killRefs.current.get(targetId);
    if (killRef?.current) {
      killRef.current();
    }

    // 清理状态
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== targetId);
      if (activeSessionId === targetId) {
        setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
    
    killRefs.current.delete(targetId);
  }, [activeSessionId]);

  const minimizeTerminal = useCallback(() => setMinimized(true), []);

  const restartSession = useCallback((sessionId: string) => {
    // 先 kill，再重新创建
    const killRef = killRefs.current.get(sessionId);
    if (killRef?.current) {
      killRef.current();
    }
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, key: Date.now(), ptySessionId: null, connected: false } : s
    ));
  }, []);

  const setSessionConnected = useCallback((sessionId: string, connected: boolean) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, connected } : s
    ));
  }, []);

  const setSessionPtyId = useCallback((sessionId: string, ptySessionId: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, ptySessionId } : s
    ));
  }, []);

  // 强制 kill (SIGINT)
  const interruptSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    // 通过 XTerminal 发送 Ctrl+C
    // TODO: 可以通过 killRef 扩展支持 signal
  }, [sessions]);

  // 获取或创建 killRef
  const getKillRef = useCallback((sessionId: string) => {
    if (!killRefs.current.has(sessionId)) {
      killRefs.current.set(sessionId, { current: null });
    }
    return killRefs.current.get(sessionId)!;
  }, []);

  const activeId = activeSession?.projectId || null;

  return (
    <TerminalContext.Provider value={{ openTerminal, closeTerminal, minimizeTerminal, activeId, sessions }}>
      {children}

      {/* Terminal Window */}
      {sessions.length > 0 && (
        <div
          className={clsx(
            "fixed bottom-6 left-[280px] right-6 bg-[#0a0a0a] text-slate-200 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] z-50 flex flex-col transition-all duration-300 backdrop-blur-md rounded-2xl overflow-hidden ring-1 ring-white/5",
            minimized ? "h-[48px] w-auto right-auto min-w-[400px]" : "h-[450px]"
          )}
        >
          {/* Tab Bar */}
          <div className="flex items-center bg-white/5 border-b border-white/5 h-[48px] overflow-hidden">
            {/* Tabs */}
            <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto no-scrollbar">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => { setActiveSessionId(session.id); setMinimized(false); }}
                  className={clsx(
                    "group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    activeSessionId === session.id
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                >
                  <span className={clsx(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    session.connected ? "bg-emerald-500" : "bg-zinc-500"
                  )} />
                  <span className="max-w-[120px] truncate">{session.name}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); closeTerminal(session.id); }}
                    className="ml-1 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} />
                  </span>
                </button>
              ))}
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 px-3 border-l border-white/5">
              {activeSession && (
                <>
                  <button
                    onClick={() => restartSession(activeSession.id)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                    title="重启终端"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => closeTerminal(activeSession.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    title="终止进程"
                  >
                    <OctagonX size={14} />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                </>
              )}
              <button
                onClick={() => setMinimized(!minimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                title={minimized ? "展开" : "最小化"}
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => closeTerminal()}
                className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title="关闭标签"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          {!minimized && (
            <div className="flex-1 overflow-hidden relative">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={clsx(
                    "absolute inset-0",
                    activeSessionId === session.id ? "visible" : "invisible"
                  )}
                >
                  <Suspense
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                        <RefreshCw className="animate-spin text-cyan-500" size={24} />
                        <span className="font-mono text-xs tracking-widest uppercase">Initializing TTY...</span>
                      </div>
                    }
                  >
                    <XTerminal
                      key={session.key}
                      projectId={session.projectId}
                      projectName={session.name}
                      cwd={session.cwd}
                      cmd={session.cmd}
                      onConnected={() => setSessionConnected(session.id, true)}
                      onDisconnected={() => setSessionConnected(session.id, false)}
                      onSessionId={(ptyId) => setSessionPtyId(session.id, ptyId)}
                      onKillRef={getKillRef(session.id)}
                    />
                  </Suspense>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </TerminalContext.Provider>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { checkPortAction, killPortAction } from '@/app/actions';
import { Loader2, AlertTriangle, CheckCircle, X, Zap, RefreshCw, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

const COMMON_PORTS = [3000, 3001, 3002, 5173, 8000, 8080, 80, 4200, 5432, 6379, 27017];

export function QuickPortKiller() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'free' | 'occupied' | 'killed' | 'error'>('idle');
  const [processInfo, setProcessInfo] = useState<{ pid?: number, command?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [scanResults, setScanResults] = useState<{ port: number, pid: number, command: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-port-killer', handleOpenEvent);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('open-port-killer', handleOpenEvent);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setStatus('idle');
      setProcessInfo(null);
      setErrorMsg('');
      performSmartScan();
    }
  }, [isOpen]);

  const performSmartScan = async () => {
      setIsScanning(true);
      const results: { port: number, pid: number, command: string }[] = [];
      
      try {
          const checks = COMMON_PORTS.map(async (p) => {
              try {
                  const res = await checkPortAction(p);
                  if (res.success && res.pid && res.command) {
                      return { port: p, pid: res.pid, command: res.command };
                  }
              } catch {}
              return null;
          });
          
          const outcomes = await Promise.all(checks);
          outcomes.forEach(o => { if(o) results.push(o); });
          setScanResults(results);
      } finally {
          setIsScanning(false);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (!val) {
      setStatus('idle');
      setProcessInfo(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!/^\d{2,5}$/.test(val)) {
        setStatus('idle');
        return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
       try {
         const port = parseInt(val);
         const res = await checkPortAction(port);
         setLoading(false);
         
         if (res.success) {
            if (res.pid) {
                setStatus('occupied');
                setProcessInfo({ pid: res.pid, command: res.command });
            } else {
                setStatus('free');
                setProcessInfo(null);
            }
         } else {
             setStatus('error');
             setErrorMsg(res.error || 'Check failed');
         }
       } catch {
           setLoading(false);
           setStatus('error');
           setErrorMsg('Network error');
       }
    }, 300);
  };

  const handleKill = async (targetPort?: number) => {
      const p = targetPort || (query ? parseInt(query) : null);
      if (!p) return;
      
      setLoading(true);
      try {
          const res = await killPortAction(p);
          if (res.success) {
              if (!targetPort) {
                  setStatus('killed');
                  setTimeout(() => {
                      setIsOpen(false);
                      performSmartScan(); 
                  }, 1200);
              } else {
                  setScanResults(prev => prev.filter(item => item.port !== p));
              }
          } else {
              setStatus('error');
              setErrorMsg(res.error || 'Failed to kill');
          }
      } catch (err: unknown) {
          setStatus('error');
          setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 font-sans text-slate-200">
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 ring-1 ring-white/5"
        >
            <div className="relative flex items-center px-6 py-6 border-b border-white/5 bg-white/5">
                <ShieldAlert className={clsx("w-6 h-6 mr-4 transition-colors", 
                    status === 'killed' ? "text-green-500" : 
                    status === 'occupied' ? "text-red-500" : "text-slate-500"
                )} />
                
                <input 
                    ref={inputRef}
                    type="text" 
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={e => e.key === 'Enter' && status === 'occupied' && handleKill()}
                    placeholder="Enter port number (e.g. 3000)"
                    className="flex-1 text-2xl font-bold bg-transparent border-none outline-none placeholder:text-slate-700 text-slate-200 h-10 tracking-tight"
                    autoFocus
                />

                {loading ? <Loader2 className="animate-spin text-slate-500" /> : (
                    <div className="flex gap-2">
                        {query && (
                            <button onClick={() => setQuery('')} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-black/40 min-h-[120px] max-h-[60vh] overflow-y-auto">
                {/* 1. Main Search Result */}
                <div className="px-6 py-4">
                     {status === 'idle' && !query && (
                        <div className="text-sm text-slate-500 font-medium font-mono uppercase tracking-widest">Active Ports (Auto-Scan)</div>
                     )}

                     {status === 'free' && (
                        <div className="flex items-center gap-2 text-green-500 font-medium animate-in fade-in slide-in-from-top-1">
                            <CheckCircle size={18} />
                            <span>Port {query} is free</span>
                        </div>
                     )}

                     {status === 'occupied' && processInfo && (
                        <div className="flex items-center justify-between p-4 bg-red-950/20 rounded-xl shadow-lg border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 font-bold text-xs ring-1 ring-red-500/30">
                                    {query}
                                </div>
                                <div>
                                    <div className="font-bold text-red-200">{processInfo.command}</div>
                                    <div className="text-xs text-red-400 font-mono">PID: {processInfo.pid}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleKill()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2 border border-red-400/50"
                            >
                                <Zap size={14} fill="currentColor" />
                                KILL
                            </button>
                        </div>
                     )}
                     
                     {status === 'killed' && (
                         <div className="text-center py-4">
                             <div className="text-2xl mb-2 text-green-500">💥</div>
                             <div className="font-bold text-green-400">Process Terminated</div>
                         </div>
                     )}
                     
                     {status === 'error' && (
                         <div className="flex items-center gap-2 text-red-400 p-2 bg-red-950/30 rounded-lg border border-red-900/50">
                             <AlertTriangle size={16} />
                             <span className="text-sm">{errorMsg}</span>
                         </div>
                     )}
                </div>

                {/* 2. Smart Scan Results */}
                {(status === 'idle' || !query) && (
                    <div className="px-6 pb-6 space-y-2">
                        {isScanning ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                <RefreshCw className="animate-spin w-3 h-3" />
                                Scanning common ports...
                            </div>
                        ) : scanResults.length > 0 ? (
                            scanResults.map((item) => (
                                <div key={item.port} className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-black/50 rounded-lg text-cyan-400 font-mono text-xs font-bold leading-tight border border-white/10">
                                            <span>:{item.port}</span>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-slate-200">{item.command}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">PID: {item.pid}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleKill(item.port)}
                                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-950 text-red-400 border border-red-900/50 text-xs font-bold rounded-lg transition-all hover:bg-red-900 hover:text-white"
                                    >
                                        KILL
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-center text-slate-600 py-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                                No common ports occupied
                            </div>
                        )}
                    </div>
                )}
            </div>
            
             <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex justify-between text-[10px] text-slate-500 font-mono uppercase tracking-wide">
                <div className="flex items-center gap-4">
                    <span className="text-cyan-600">Port Killer v2.1</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Occupied</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Free</span>
                </div>
                <span>ESC to Close</span>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

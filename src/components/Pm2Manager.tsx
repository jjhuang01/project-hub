'use client';

import React, { useState, useEffect } from 'react';
import { getPm2ListAction, executePm2CommandAction } from '@/app/actions';
import { Activity, Play, Square, RotateCw, Trash2, X, Cpu, Server, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Pm2Process {
  pid: number;
  name: string;
  pm_id: number;
  monit: { memory: number; cpu: number };
  pm2_env: { status: string; uptime: number; };
}

export default function Pm2Manager() {
  const [isOpen, setIsOpen] = useState(false);
  const [list, setList] = useState<Pm2Process[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Global Event Listener
  useEffect(() => {
    const handleOpen = () => {
        setIsOpen(true);
        fetchList();
    };
    window.addEventListener('open-pm2-manager', handleOpen);
    return () => window.removeEventListener('open-pm2-manager', handleOpen);
  }, []);

  // Auto Refresh
  useEffect(() => {
    if (!isOpen) return;
    fetchList();
    const interval = setInterval(fetchList, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchList = async () => {
    try {
        const res = await getPm2ListAction();
        if (res.success && res.list) {
            setList(res.list);
        }
    } catch (e) {
        console.error('Failed to fetch PM2 list', e);
    }
  };

  const handleAction = async (cmd: 'restart' | 'stop' | 'delete' | 'start', id: number) => {
      setActionLoading(id);
      try {
          await executePm2CommandAction(cmd, id);
          await fetchList(); // refresh immediately
      } catch (e) {
          alert('Failed: ' + e);
      } finally {
          setActionLoading(null);
      }
  };

  const formatMemory = (bytes: number) => {
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatUptime = (uptime: number | undefined, status: string | undefined) => {
      if (status !== 'online' || !uptime) return '-';
      try {
          const durationMs = Date.now() - uptime;
          if (durationMs < 0 || !isFinite(durationMs)) return '-';
          
          const seconds = Math.floor(durationMs / 1000);
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = seconds % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } catch {
          return '-';
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'online': return 'text-green-400 bg-green-500/10 border-green-500/20';
          case 'stopping': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
          case 'stopped': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
          case 'errored': return 'text-red-400 bg-red-500/10 border-red-500/20';
          default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans text-slate-200">
        {/* Backdrop */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 ring-1 ring-white/5 flex flex-col max-h-[80vh]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                        <Server size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-200">PM2 Process Manager</h2>
                        <p className="text-sm text-slate-500">System Monitoring Console</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-black/40">
                {list.map(proc => (
                    <div key={proc.pm_id} className="group bg-white/5 rounded-2xl p-5 shadow-sm border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all flex items-center justify-between">
                        
                        {/* Info */}
                        <div className="flex items-center gap-4 min-w-[200px]">
                            <div className={clsx("w-2 h-12 rounded-full shadow-[0_0_10px_currentColor]", proc.pm2_env?.status === 'online' ? "bg-green-500 text-green-500" : "bg-slate-700 text-slate-700")}></div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">{proc.name}</h3>
                                    <span className="text-xs font-mono text-slate-500">#{proc.pm_id}</span>
                                </div>
                                <div className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-1 uppercase tracking-wider border", getStatusColor(proc.pm2_env?.status))}>
                                    {proc.pm2_env?.status || 'UNKNOWN'}
                                </div>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="flex items-center gap-8 text-sm text-slate-400">
                           <div className="flex flex-col items-end">
                               <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                                   <Cpu size={12} /> CPU
                               </div>
                               <span className="font-mono font-bold text-slate-300">{proc.monit?.cpu || 0}%</span>
                           </div>
                           <div className="flex flex-col items-end w-24">
                               <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                                   <Activity size={12} /> MEM
                               </div>
                               <span className="font-mono font-bold text-slate-300">{formatMemory(proc.monit?.memory || 0)}</span>
                           </div>
                           <div className="flex flex-col items-end w-24">
                               <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">UPTIME</span>
                               <span className="font-mono font-medium text-slate-400">
                                   {formatUptime(proc.pm2_env?.uptime, proc.pm2_env?.status)}
                                </span>
                           </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pl-6 border-l border-white/5">
                            <button 
                                onClick={() => handleAction('restart', proc.pm_id)}
                                disabled={actionLoading === proc.pm_id}
                                className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:scale-105 transition-all disabled:opacity-50"
                                title="Restart"
                            >
                                <RotateCw size={18} className={actionLoading === proc.pm_id ? "animate-spin" : ""} />
                            </button>
                            
                            {proc.pm2_env?.status === 'online' ? (
                                <button 
                                    onClick={() => handleAction('stop', proc.pm_id)}
                                    disabled={actionLoading === proc.pm_id}
                                    className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 hover:scale-105 transition-all disabled:opacity-50"
                                    title="Stop"
                                >
                                    <Square size={18} fill="currentColor" />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleAction('start', proc.pm_id)}
                                    disabled={actionLoading === proc.pm_id}
                                    className="p-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:scale-105 transition-all disabled:opacity-50"
                                    title="Start"
                                >
                                    <Play size={18} fill="currentColor" />
                                </button>
                            )}

                            <button 
                                onClick={() => {
                                    if(confirm(`Delete process ${proc.name}?`)) handleAction('delete', proc.pm_id);
                                }}
                                disabled={actionLoading === proc.pm_id}
                                className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all disabled:opacity-50"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {list.length === 0 && (
                    <div className="text-center py-20 text-slate-600">
                        <Activity size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No active PM2 processes found</p>
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="bg-white/5 px-8 py-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500 font-mono">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_green]"></span>
                    REALTIME CONNECTION
                </div>
                <div>
                   AUTO-REFRESH: 3s
                </div>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

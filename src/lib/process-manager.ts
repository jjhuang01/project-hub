import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import treeKill from 'tree-kill';
import path from 'path';

export class ProcessManager extends EventEmitter {
    private processes: Map<string, ChildProcess> = new Map();
    
    constructor() {
        super();
        this.setMaxListeners(50);
    }

    startProcess(id: string, cwd: string, cmdStr: string, env: Record<string, string> = {}) {
        console.log(`[PM] Starting process ${id} in ${cwd} with ${cmdStr}`);
        if (this.processes.has(id)) {
            throw new Error(`Process ${id} is already running`);
        }

        // Fix PATH for common Mac setups
        const currentPath = process.env.PATH || '';
        const extraPaths = [
            process.env.PM2_PATH ? path.dirname(process.env.PM2_PATH) : '',
            '/opt/homebrew/bin', 
            '/usr/local/bin'
        ].filter(Boolean) as string[];
        const missingPaths = extraPaths.filter(p => !currentPath.includes(p));
        const newPath = missingPaths.length > 0 
            ? `${currentPath}:${missingPaths.join(':')}` 
            : currentPath;

        // 注意：交互式终端现在由 pty-server 处理
        // ProcessManager 主要用于后台任务或非交互式进程（如果有的话）
        // 目前项目主要依赖 pty-server，这里的 startProcess 可能被弃用或仅作为备用
        
        const proc = spawn(cmdStr, {
            cwd,
            shell: true,
            stdio: 'inherit', // 直接输出到主进程 stdio，不再捕获
            env: { 
                ...process.env, 
                PATH: newPath, 
                FORCE_COLOR: '1',
                ...env 
            }
        });

        this.processes.set(id, proc);
        console.log(`[PM] Process started: ${id} (PID ${proc.pid})`);

        proc.on('close', (code) => {
            console.log(`[PM] Process ${id} exited with code ${code}`);
            this.processes.delete(id);
            this.emit('status', { id, status: 'stopped' });
        });

        proc.on('error', (err) => {
            console.error(`[PM] Failed to start ${id}: ${err.message}`);
            this.processes.delete(id);
        });

        this.emit('status', { id, status: 'running' });
    }

    stopProcess(id: string, forceKillTimeoutMs = 5000) {
        const proc = this.processes.get(id);
        if (proc && proc.pid) {
            console.log(`[PM] Stopping process ${id} (PID ${proc.pid})...`);
            
            // Set timeout for SIGKILL if SIGTERM doesn't work
            const killTimeout = setTimeout(() => {
                if (this.processes.has(id)) {
                    console.log(`[PM] ${id} SIGTERM timeout, escalating to SIGKILL...`);
                    treeKill(proc.pid!, 'SIGKILL', (err) => {
                        if (err) console.error(`[PM] SIGKILL failed for ${id}: ${err.message}`);
                    });
                }
            }, forceKillTimeoutMs);
            
            treeKill(proc.pid, 'SIGTERM', (err) => {
                if (err) {
                    console.error(`[PM] SIGTERM failed for ${id}: ${err.message}`);
                } else {
                    clearTimeout(killTimeout);
                    console.log(`[PM] ${id} terminated gracefully.`);
                }
            });
        }
    }

    getProcessStatus(id: string) {
        return this.processes.has(id) ? 'running' : 'stopped';
    }
}

// Singleton
export const processManager = new ProcessManager();

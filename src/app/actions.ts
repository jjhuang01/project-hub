'use server';

import { processManager } from '@/lib/process-manager';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

import { safeAction, ActionState } from '@/lib/safe-action';

// Re-export type for clients
export type ActionResult = ActionState<void>;

export async function startProjectAction(id: string): Promise<ActionResult> {
  return safeAction(`startProject(${id})`, async () => {
    // Deprecated: ProjectCard now uses client-side PTY
    throw new Error('Please use the terminal button to start projects.');
  });
}


export async function stopProjectAction(id: string): Promise<ActionResult> {
  return safeAction(`stopProject(${id})`, async () => {
    processManager.stopProcess(id);
  });
}

export async function openPathAction(pathStr: string): Promise<ActionResult> {
  return safeAction(`openPath(${pathStr})`, async () => {
    await execAsync(`open "${pathStr}"`);
  });
}


export async function getRunningStatusAction(): Promise<Record<string, boolean>> {
  // 简化的 ProcessManager 可能没有 getRunningStats，这里暂时返回空或需要实现
  // 由于我们转向 PTY，这个 action 可能不再准确反映状态
  return {}; 
}

export async function checkPortAction(port: number): Promise<{ success: boolean; pid?: number; command?: string; error?: string }> {
  try {
     // lsof -i :<port> output: COMMAND PID USER ...
     const { stdout } = await execAsync(`lsof -i :${port}`);
     const lines = stdout.trim().split('\n');
     if(lines.length < 2) return { success: true }; // Empty

     // Parse second line
     const parts = lines[1].split(/\s+/);
     const command = parts[0];
     const pid = parseInt(parts[1]);
     
     return { success: true, pid, command };
  } catch (e: any) {
     // Exit code 1 means empty usually
     return { success: true };
  }
}

export async function killPortAction(port: number): Promise<ActionResult> {
    try {
        await execAsync(`lsof -t -i:${port} | xargs kill -9`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'Failed to kill port: ' + e.message };
    }
}

// Helper to find PM2
async function getPm2Path(): Promise<string> {
    const commonPaths = [
        'pm2', // Try PATH first
        '/opt/homebrew/bin/pm2',
        '/usr/local/bin/pm2',
        '/usr/local/bin/pm2',
        process.env.PM2_PATH || '', // Configurable via env
    ];
    
    // Check PATH
    try {
        await execAsync('which pm2');
        return 'pm2';
    } catch {}

    // Check files
    for(const p of commonPaths.slice(1)) {
        if(fs.existsSync(p)) return p;
    }
    
    // Fallback
    return 'pm2'; 
}

// PM2 Actions
export async function getPm2ListAction(): Promise<{ success: boolean; list?: any[]; error?: string }> {
    try {
        // Fix PATH for common Mac setups if missing (e.g. when running from GUI apps)
        const env = { ...process.env };
        if (!env.PATH?.includes('/opt/homebrew/bin')) {
            env.PATH = `/opt/homebrew/bin:/usr/local/bin:${env.PATH || ''}`;
        }

        const pm2Cmd = await getPm2Path();
        const { stdout } = await execAsync(`${pm2Cmd} jlist`, { env });
        const list = JSON.parse(stdout);
        // Map to simpler format if needed, but raw is usually fine
        return { success: true, list };
    } catch (e: any) {
        return { success: false, error: 'Failed to get PM2 list: ' + e.message };
    }
}

export async function executePm2CommandAction(command: 'restart' | 'stop' | 'delete' | 'start', idOrName: string | number): Promise<ActionResult> {
    return safeAction(`pm2.${command}(${idOrName})`, async () => {
        // Validation to prevent injection (basic)
        if (!/^[a-zA-Z0-9_\-]+$/.test(String(idOrName))) {
             throw new Error('Invalid ID or Name');
        }
        
        // Fix PATH for common Mac setups if missing
        const env = { ...process.env };
        if (!env.PATH?.includes('/opt/homebrew/bin')) {
            env.PATH = `/opt/homebrew/bin:/usr/local/bin:${env.PATH || ''}`;
        }

        const pm2Cmd = await getPm2Path();
        await execAsync(`${pm2Cmd} ${command} ${idOrName}`, { env });
    });
}

/**
 * PTY WebSocket Server v2.0
 * 
 * 多会话架构：每个连接独立 PTY，后端生成 sessionId
 * - PtySession: 封装单个 PTY 实例
 * - PtyManager: 管理所有会话
 * - WebSocket 断开不杀 PTY，只在收到 kill 消息或超时时清理
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

const PORT = 9999;
const SESSION_TIMEOUT = 60 * 1000; // 1 分钟无连接后清理 PTY

// PATH 修复 - 动态检测
const HOME = process.env.HOME || '/tmp';
const PATH = [
    process.env.PATH || '',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    `${HOME}/.nvm/versions/node/v18.20.4/bin`  // macOS NVM default location
].join(':');

// ============ PtySession 类 ============
class PtySession {
    readonly id: string;
    readonly projectId: string;
    readonly ptyProcess: pty.IPty;
    private ws: WebSocket | null = null;
    private timeoutId: NodeJS.Timeout | null = null;

    constructor(projectId: string, cwd: string, cmd: string) {
        this.id = randomUUID();
        this.projectId = projectId;
        
        const shell = '/bin/zsh';
        const env = { ...process.env };
        delete env.npm_config_prefix;
        
        this.ptyProcess = pty.spawn(shell, ['-l'], {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd,
            env: { 
                ...env, 
                PATH, 
                TERM: 'xterm-256color', 
                FORCE_COLOR: '1',
                SHELL: shell
            }
        });
        
        console.log(`[PTY] Session created: ${this.id}, PID: ${this.ptyProcess.pid}`);
        
        // 发送初始命令
        setTimeout(() => {
            this.ptyProcess.write(`${cmd}\r`);
        }, 100);
        
        // PTY 输出 -> WebSocket
        this.ptyProcess.onData((data: string) => {
            this.send({ type: 'stdout', text: data });
        });
        
        // PTY 退出
        this.ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`[PTY] Session exited: ${this.id}, code=${exitCode}, signal=${signal}`);
            this.send({ type: 'exit', exitCode, signal });
            ptyManager.remove(this.id);
        });
    }

    attach(ws: WebSocket) {
        this.clearTimeout();
        this.ws = ws;
        
        // 通知客户端 sessionId
        this.send({ type: 'session', sessionId: this.id });
        
        // WebSocket 消息处理
        ws.on('message', (message: Buffer) => {
            try {
                const msg = JSON.parse(message.toString());
                switch (msg.type) {
                    case 'input':
                        this.ptyProcess.write(msg.data);
                        break;
                    case 'resize':
                        this.ptyProcess.resize(msg.cols || 120, msg.rows || 30);
                        break;
                    case 'signal':
                        if (msg.signal === 'SIGINT') {
                            this.ptyProcess.write('\x03'); // Ctrl+C
                        }
                        break;
                    case 'kill':
                        console.log(`[PTY] Kill requested: ${this.id}`);
                        this.kill();
                        break;
                }
            } catch {
                this.ptyProcess.write(message.toString());
            }
        });
        
        // WebSocket 关闭 - 不杀 PTY，启动超时
        ws.on('close', () => {
            console.log(`[PTY] WebSocket detached: ${this.id}`);
            this.ws = null;
            this.startTimeout();
        });
    }

    private send(data: object) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private startTimeout() {
        this.timeoutId = setTimeout(() => {
            console.log(`[PTY] Session timeout: ${this.id}`);
            this.kill();
        }, SESSION_TIMEOUT);
    }

    private clearTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    kill() {
        this.clearTimeout();
        this.ptyProcess.kill();
        ptyManager.remove(this.id);
    }
}

// ============ PtyManager 类 ============
class PtyManager {
    private sessions = new Map<string, PtySession>();

    create(projectId: string, cwd: string, cmd: string): PtySession {
        const session = new PtySession(projectId, cwd, cmd);
        this.sessions.set(session.id, session);
        console.log(`[Manager] Active sessions: ${this.sessions.size}`);
        return session;
    }

    get(sessionId: string): PtySession | undefined {
        return this.sessions.get(sessionId);
    }

    remove(sessionId: string) {
        this.sessions.delete(sessionId);
        console.log(`[Manager] Session removed: ${sessionId}, remaining: ${this.sessions.size}`);
    }

    killAll() {
        for (const [id, session] of this.sessions) {
            session.kill();
        }
    }
}

const ptyManager = new PtyManager();

// ============ WebSocket Server ============
const wss = new WebSocketServer({ port: PORT });

console.log(`[PTY-WS] WebSocket server v2.0 started on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    const projectId = url.searchParams.get('id') || 'default';
    let cwd = url.searchParams.get('cwd') || process.cwd();
    const cmd = url.searchParams.get('cmd') || 'bash';
    const attachSessionId = url.searchParams.get('attach'); // 可选：重连已有会话
    
    console.log(`[PTY-WS] New connection: projectId=${projectId}, attach=${attachSessionId || 'new'}`);
    
    // 验证 cwd
    if (!fs.existsSync(cwd)) {
        console.warn(`[PTY-WS] cwd does not exist: ${cwd}, using home`);
        cwd = process.env.HOME || '/tmp';
    }
    
    let session: PtySession | undefined;
    
    // 尝试重连已有会话
    if (attachSessionId) {
        session = ptyManager.get(attachSessionId);
        if (session) {
            console.log(`[PTY-WS] Reattaching to session: ${attachSessionId}`);
        }
    }
    
    // 创建新会话
    if (!session) {
        try {
            session = ptyManager.create(projectId, cwd, cmd);
        } catch (err) {
            console.error(`[PTY-WS] Failed to create session:`, err);
            ws.send(JSON.stringify({ type: 'error', text: String(err) }));
            ws.close();
            return;
        }
    }
    
    // 绑定 WebSocket 到会话
    session.attach(ws);
});

// 优雅退出
process.on('SIGTERM', () => {
    console.log('[PTY-WS] Shutting down...');
    ptyManager.killAll();
    wss.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[PTY-WS] Interrupted...');
    ptyManager.killAll();
    wss.close();
    process.exit(0);
});

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTermProps {
    projectId: string;
    projectName: string;
    cwd: string;
    cmd: string;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onSessionId?: (sessionId: string) => void;
    onKillRef?: React.MutableRefObject<(() => void) | null>;
}

export function XTerminal({ 
    projectId, 
    projectName, 
    cwd, 
    cmd, 
    onConnected, 
    onDisconnected,
    onSessionId,
    onKillRef
}: XTermProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    
    // ⚠️ 使用 ref 存储回调，避免它们成为 useEffect 依赖
    // 这解决了 React 18 Strict Mode 下 inline 函数导致的无限循环
    const callbacksRef = useRef({ onConnected, onDisconnected, onSessionId });
    callbacksRef.current = { onConnected, onDisconnected, onSessionId };

    const killSession = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'kill' }));
        }
    }, []);

    useEffect(() => {
        if (onKillRef) {
            onKillRef.current = killSession;
        }
        return () => {
            if (onKillRef) {
                onKillRef.current = null;
            }
        };
    }, [killSession, onKillRef]);

    useEffect(() => {
        if (!terminalRef.current) return;
        
        // ⚠️ React 18 Strict Mode 关键模式：closure 内的 ignore 标志
        let ignore = false;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            lineHeight: 1.4,
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
            theme: {
                background: '#0a0a0a',
                foreground: '#e2e8f0',
                cursor: '#06b6d4',
                cursorAccent: '#000000',
                selectionBackground: 'rgba(6, 182, 212, 0.3)',
                black: '#1e293b',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#f8fafc',
                brightBlack: '#475569',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#ffffff',
            },
            allowProposedApi: true,
            scrollback: 10000,
        });
        termRef.current = term;

        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        term.open(terminalRef.current);
        
        requestAnimationFrame(() => {
            if (!ignore) fitAddon.fit();
        });

        const wsUrl = `ws://localhost:9999?id=${encodeURIComponent(projectId)}&cwd=${encodeURIComponent(cwd)}&cmd=${encodeURIComponent(cmd)}`;
        
        term.writeln(`\x1b[38;2;6;182;212m➜\x1b[0m \x1b[1m${projectName}\x1b[0m`);
        term.writeln(`\x1b[90m   Connecting to PTY server...\x1b[0m`);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            if (ignore) return;
            callbacksRef.current.onConnected?.();
            term.writeln(`\x1b[38;2;34;197;94m✔ Connected\x1b[0m  \x1b[90mCtrl+C to interrupt, type 'exit' to close\x1b[0m\r\n`);
            
            ws.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
            }));
        };

        ws.onmessage = (event) => {
            if (ignore) return;
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case 'stdout':
                    case 'info':
                        term.write(msg.text);
                        break;
                    case 'error':
                        term.writeln(`\x1b[31m${msg.text}\x1b[0m`);
                        break;
                    case 'session':
                        callbacksRef.current.onSessionId?.(msg.sessionId);
                        break;
                    case 'exit':
                        term.writeln(`\r\n\x1b[33m[Process exited with code ${msg.exitCode}]\x1b[0m`);
                        break;
                }
            } catch {
                term.write(event.data);
            }
        };

        ws.onerror = () => {
            if (ignore) return;
            term.writeln(`\x1b[31m✖ Connection failed. Is PTY server running?\x1b[0m`);
            term.writeln(`\x1b[90m   Run: npm run pty-server\x1b[0m`);
        };

        ws.onclose = () => {
            if (ignore) return;
            callbacksRef.current.onDisconnected?.();
        };

        const dataHandler = term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN && !ignore) {
                ws.send(JSON.stringify({ type: 'input', data }));
            }
        });

        const handleResize = () => {
            if (ignore) return;
            fitAddon.fit();
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'resize',
                    cols: term.cols,
                    rows: term.rows
                }));
            }
        };
        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            if (!ignore) fitAddon.fit();
        });
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // Cleanup
        return () => {
            ignore = true;
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            dataHandler.dispose();
            
            // 延迟关闭 WebSocket
            setTimeout(() => {
                if (wsRef.current === ws) {
                    ws.close();
                    wsRef.current = null;
                }
                term.dispose();
                termRef.current = null;
            }, 100);
        };
    // ⚠️ 只依赖真正需要重新初始化的 prop
    // 回调通过 ref 访问，不需要在依赖列表中
    }, [projectId, cwd, cmd]);

    return (
        <div 
            ref={terminalRef} 
            className="flex-1 bg-[#0a0a0a] overflow-hidden"
            style={{ height: '100%', minHeight: '280px' }}
        />
    );
}

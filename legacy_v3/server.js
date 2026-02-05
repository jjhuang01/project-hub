const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const url = require('url');

const PORT = 3030;
const BASE_DIR = __dirname;
const PROCESSES = new Map(); // id -> { process, logs: [], clients: Set }

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/api/')) {
        handleApi(req, res, pathname, parsedUrl.query);
        return;
    }

    // Static Files
    let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        res.end();
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    });
});

function handleApi(req, res, pathname, query) {
    // SSE Logs Endpoint
    if (pathname.startsWith('/api/process/logs/')) {
        const projectId = pathname.split('/').pop();
        handleSSELogs(req, res, projectId);
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body || '{}');
            if (pathname === '/api/process/start') handleStartProcess(data, res);
            else if (pathname === '/api/process/stop') handleStopProcess(data, res);
            else if (pathname === '/api/process/status') handleStatus(res);
            else if (pathname === '/api/open-folder') handleOpenFolder(data, res);
            else if (pathname === '/api/kill-port') handleKillPort(data, res);
            else { res.writeHead(404); res.end(); }
        } catch (e) {
            res.writeHead(400); res.end(JSON.stringify({error: e.message}));
        }
    });
}

// --- Process Management ---

function handleStartProcess(data, res) {
    const { id, path: workDir, cmd } = data;
    if (!id || !workDir || !cmd) return sendError(res, 'Missing args');

    if (PROCESSES.has(id)) {
        return sendError(res, 'Process already running');
    }

    // Parse cmd: "npm run start:dev" -> cmd="npm", args=["run", "start:dev"]
    const parts = cmd.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    const proc = spawn(command, args, {
        cwd: workDir,
        shell: true, // Use shell to handle env vars and path resolution
        env: { ...process.env, FORCE_COLOR: '1' } // Force color output for terminal
    });

    const processData = {
        process: proc,
        logs: [],
        clients: new Set(),
        startTime: Date.now()
    };
    PROCESSES.set(id, processData);

    const broadcastLog = (type, data) => {
        const text = data.toString();
        const msg = { type, text, time: Date.now() };
        // Store log (limit 1000 lines)
        processData.logs.push(msg);
        if (processData.logs.length > 1000) processData.logs.shift();
        // Broadcast to SSE clients
        processData.clients.forEach(client => {
            client.write(`data: ${JSON.stringify(msg)}\n\n`);
        });
    };

    proc.stdout.on('data', d => broadcastLog('stdout', d));
    proc.stderr.on('data', d => broadcastLog('stderr', d));

    proc.on('close', (code) => {
        broadcastLog('info', `\n[Process exited with code ${code}]\n`);
        // Notify clients logs ended? Keep connecting? 
        // We keep it in map for a while or remove?
        // Let's keep it but mark ended. User needs to explicit "clean"?
        // For now: Remove from map so user can restart.
        PROCESSES.delete(id);
        processData.clients.forEach(client => client.end());
    });

    proc.on('error', (err) => {
        broadcastLog('error', `Failed to start: ${err.message}`);
        PROCESSES.delete(id);
        processData.clients.forEach(client => client.end());
    });

    sendSuccess(res, { status: 'started', pid: proc.pid });
}

function handleStopProcess(data, res) {
    const { id } = data;
    const pData = PROCESSES.get(id);
    if (!pData) return sendError(res, 'Process not running');

    // Kill process tree? For now simple kill
    // spawn with shell: true creates a shell process which spawns the command.
    // killing shell might leave children.
    // For simplicity: process.kill() or exec taskkill/kill
    
    // Unix: kill -TERM -pid (negate pid for group if detached, but we are attached)
    // We try generic kill
    pData.process.kill();
    // Force delete map entry is done in 'close' event
    sendSuccess(res, { status: 'stopping' });
}

function handleStatus(res) {
    const list = [];
    for (const [id, data] of PROCESSES.entries()) {
        list.push({ id, pid: data.process.pid, startTime: data.startTime });
    }
    sendSuccess(res, { processes: list });
}

function handleSSELogs(req, res, projectId) {
    // Common SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    const pData = PROCESSES.get(projectId);
    if (!pData) {
        res.write(`data: ${JSON.stringify({type:'info', text: 'Process not running.'})}\n\n`);
        // Don't close immediately, wait? No, if not running, just close.
        // Or keep open waiting for start?
        // UI expects logs. If not running, UI might want to just show history?
        // History is lost if process restart.
        res.end();
        return;
    }

    // Send history
    pData.logs.forEach(msg => {
        res.write(`data: ${JSON.stringify(msg)}\n\n`);
    });

    // Add to clients
    pData.clients.add(res);

    req.on('close', () => {
        pData.clients.delete(res);
    });
}

// --- Legacy & Helpers ---

function handleOpenFolder(data, res) {
    exec(`open "${data.path}"`, () => sendSuccess(res, {}));
}

function handleKillPort(data, res) {
    exec(`lsof -t -i:${data.port} | xargs kill -9`, () => sendSuccess(res, {}));
}

function sendSuccess(res, data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function sendError(res, msg) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
}

server.listen(PORT, () => {
    console.log(`Process Manager running at http://localhost:${PORT}/`);
});

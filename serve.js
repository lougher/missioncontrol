const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORT = 3000;
const SESSIONS_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');
const WORKSPACE_DIR = path.join(os.homedir(), '.openclaw', 'workspace');
const FLEET_FILE = path.join(__dirname, 'fleet_data.json');
const PERSONAL_CRM_FILE = path.join(WORKSPACE_DIR, 'Personal_CRM.csv');
const YOUTUBE_CSV = path.join(WORKSPACE_DIR, 'skills', 'youtube-long-form-planner', 'references', 'Video_Planner.csv');
const YOUTUBE_REFERENCES_DIR = path.join(WORKSPACE_DIR, 'skills', 'youtube-long-form-planner', 'references');
const YOUTUBE_COMPETITOR_DIR = path.join(YOUTUBE_REFERENCES_DIR, 'Competitor_Analysis');
const YOUTUBE_COMPETITORS_DIR = path.join(YOUTUBE_REFERENCES_DIR, 'Competitors');
const YOUTUBE_COMPETITORS_FILE = path.join(YOUTUBE_COMPETITORS_DIR, 'competitors.json');
const YOUTUBE_STRATEGY_FILE = path.join(WORKSPACE_DIR, 'skills', 'youtube-long-form-planner', 'references', 'YouTube_100K_Strategy.md');
const YOUTUBE_CHECKLIST_FILE = path.join(__dirname, 'youtube_checklists.json');
const YOUTUBE_SWIPE_FILE = path.join(__dirname, 'youtube_swipe_file.json');
const YOUTUBE_ANALYTICS_FILE = path.join(__dirname, 'youtube_analytics_metrics.json');
const YOUTUBE_ANALYTICS_REFRESH_SCRIPT = path.join(__dirname, 'youtube-refresh-analytics.js');
const YOUTUBE_TOKEN_FILE = path.join(WORKSPACE_DIR, 'secrets', 'youtube-token.json');
const DAILY_NEWS_FILE = path.join(__dirname, 'daily_news.md');
const DAILY_NEWS_HISTORY_FILE = path.join(__dirname, 'daily_news_history.json');
const RELEASES_FILE = path.join(__dirname, 'releases.md');
const RELEASES_JSON_FILE = path.join(__dirname, 'releases.json');
const LEARNINGS_FILE = path.join(WORKSPACE_DIR, 'skills', 'learnings', 'learning_log.md');
const GOALS_FILE = path.join(__dirname, 'goals.json');
const WORKOUT_LOGS_FILE = path.join(WORKSPACE_DIR, 'skills', 'workout-tracker', 'workout_logs.csv');
const WORKOUT_PLAN_FILE = path.join(WORKSPACE_DIR, 'skills', 'workout-tracker', 'workout_plan.md');
const WEIGHT_LOGS_FILE = path.join(WORKSPACE_DIR, 'weight_logs.csv');
const CRON_FILE = path.join(os.homedir(), '.openclaw', 'cron', 'jobs.json');
const MEMORY_FILE = path.join(WORKSPACE_DIR, 'MEMORY.md');
const DAILY_MEMORY_DIR = path.join(WORKSPACE_DIR, 'memory');
const DISPATCH_LOG_DIR = path.join(__dirname, 'dispatch-logs');
const READ_LIBRARY_FILE = path.join(__dirname, 'read_library.json');
const READ_CONTENT_DIR = path.join(__dirname, 'read-content');
const READ_AUDIO_DIR = path.join(__dirname, 'read-audio');
const MLX_TTS_SCRIPT = path.join(WORKSPACE_DIR, 'scripts', 'mlx-tts-kokoro.sh');

const server = http.createServer((req, res) => {
    res.on('error', (err) => console.error('Response error:', err));
    if (req.url === '/' || req.url === '/index.html') {
        serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
    } else if (req.url === '/styles.css') {
        serveFile(res, path.join(__dirname, 'styles.css'), 'text/css');
    } else if (req.url === '/app.js') {
        serveFile(res, path.join(__dirname, 'app.js'), 'text/javascript');
    } 
    else if (req.url === '/api/usage') {
        fs.readFile(SESSIONS_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Failed to read OpenClaw sessions data." }));
            }
            try {
                const sessions = JSON.parse(data);
                const results = processUsageData(sessions);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(results));
            } catch (parseErr) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Failed to parse OpenClaw sessions data." }));
            }
        });
    } else if (req.url === '/api/fleet') {
        if (req.method === 'GET') {
            fs.readFile(FLEET_FILE, 'utf8', (err, data) => {
                if (err) return res.end(JSON.stringify({ agents: [], activity: [], tasks: [], logs: [] }));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                let nextBody = body;
                try {
                    const incoming = JSON.parse(body || '{}');
                    nextBody = JSON.stringify(dispatchNewInProgressTasks(incoming), null, 2) + '\n';
                } catch (err) {
                    console.error('Failed to inspect fleet task dispatch:', err);
                }
                fs.writeFile(FLEET_FILE, nextBody, (err) => {
                    res.writeHead(err ? 500 : 200);
                    res.end(err ? 'Error' : 'OK');
                });
            });
        }
    } else if (req.url === '/api/read') {
        if (req.method === 'GET') {
            const library = readReadLibrary();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ items: library.items || [] }));
        } else if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const item = createReadItem({
                        title: incoming.title,
                        type: incoming.type,
                        text: incoming.text
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ item }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message || 'Failed to save read item' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url.startsWith('/api/read/') && req.url.endsWith('/audio')) {
        const id = decodeURIComponent(req.url.replace('/api/read/', '').replace('/audio', '').replace(/\/$/, ''));
        synthesizeReadAudio(id, (err, audioPath) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message || 'Failed to generate audio' }));
            }
            serveFile(res, audioPath, 'audio/wav', req);
        });
    } else if (req.url.startsWith('/api/read/') && req.url.endsWith('/listened')) {
        const id = decodeURIComponent(req.url.replace('/api/read/', '').replace('/listened', '').replace(/\/$/, ''));
        try {
            const item = markReadItemListened(id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ item }));
        } catch (err) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Read item not found' }));
        }
    } else if (req.url.startsWith('/api/read/') && req.url.endsWith('/text')) {
        const id = decodeURIComponent(req.url.replace('/api/read/', '').replace('/text', '').replace(/\/$/, ''));
        if (req.method === 'GET') {
            try {
                const { item } = findReadItem(id);
                if (!item) throw new Error('Read item not found');
                const text = fs.readFileSync(path.join(READ_CONTENT_DIR, item.textFile), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ id, text }));
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Content not found' }));
            }
        } else if (req.method === 'PUT' || req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const cleanText = String(incoming.text || '').trim();
                    if (!cleanText) throw new Error('Content text is required');
                    
                    const { library, item } = findReadItem(id);
                    if (!item) throw new Error('Read item not found');
                    
                    fs.writeFileSync(path.join(READ_CONTENT_DIR, item.textFile), cleanText);
                    
                    // delete old audio to force regen
                    try {
                        fs.unlinkSync(path.join(READ_AUDIO_DIR, item.audioFile));
                    } catch(e) {}
                    
                    item.charCount = cleanText.length;
                    item.preview = cleanText.slice(0, 240);
                    item.updatedAt = new Date().toISOString();
                    
                    writeReadLibrary(library);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ item, text: cleanText }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message || 'Failed to update read item' }));
                }
            });
        }
    } else if (req.url.startsWith('/api/files/')) {
        const filename = req.url.replace('/api/files/', '');
        const allowed = ['USER.md', 'SOUL.md', 'MEMORY.md', 'IDENTITY.md', 'AGENTS.md'];
        
        if (!allowed.includes(filename)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: "Forbidden" }));
        }

        const filePath = path.join(WORKSPACE_DIR, filename);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "File not found or empty." }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: data }));
        });
    } else if (req.url === '/api/news') {
        fs.readFile(DAILY_NEWS_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "News not found", content: "", items: [] }));
            }
            const history = updateNewsHistory(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: data, items: history }));
        });
    } else if (req.url === '/api/releases') {
        fs.readFile(RELEASES_JSON_FILE, 'utf8', (jsonErr, jsonData) => {
            if (!jsonErr) {
                try {
                    const parsed = JSON.parse(jsonData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ items: parsed.items || [] }));
                } catch {}
            }
            fs.readFile(RELEASES_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Releases not found", content: "", items: [] }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ content: data, items: [] }));
            });
        });
    } else if (req.url === '/api/learnings') {
        fs.readFile(LEARNINGS_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Learnings not found", content: "" }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: data }));
        });
    } else if (req.url === '/api/memory' || req.url.startsWith('/api/memory?')) {
        const queryIdx = req.url.indexOf('?');
        const queryParams = new URLSearchParams(queryIdx !== -1 ? req.url.slice(queryIdx) : '');
        const requestedFile = queryParams.get('file');

        if (!requestedFile) {
            fs.readdir(DAILY_MEMORY_DIR, { withFileTypes: true }, (dirErr, entries = []) => {
                const notes = dirErr ? [] : entries
                    .filter(entry => entry.isFile() && /^\d{4}-\d{2}-\d{2}.*\.md$/.test(entry.name))
                    .map(entry => entry.name)
                    .sort()
                    .reverse();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ longTerm: 'MEMORY.md', notes }));
            });
            return;
        }

        let filePath;
        let label;
        if (requestedFile === 'MEMORY.md') {
            filePath = MEMORY_FILE;
            label = 'MEMORY.md';
        } else if (/^\d{4}-\d{2}-\d{2}.*\.md$/.test(requestedFile)) {
            filePath = path.join(DAILY_MEMORY_DIR, requestedFile);
            label = path.join('memory', requestedFile);
            if (!filePath.startsWith(DAILY_MEMORY_DIR + path.sep)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Forbidden' }));
            }
        } else {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Forbidden' }));
        }

        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Memory file not found', content: '' }));
            }
            fs.stat(filePath, (statErr, stats) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ file: requestedFile, label, content, updatedAtMs: statErr ? null : stats.mtimeMs }));
            });
        });
    } else if (req.url === '/api/cron') {
        fs.readFile(CRON_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ jobs: [], total: 0, error: 'Cron jobs file not found' }));
            }
            try {
                const parsed = JSON.parse(data);
                const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
                jobs.sort((a, b) => {
                    const aNext = a.state?.nextRunAtMs || Number.MAX_SAFE_INTEGER;
                    const bNext = b.state?.nextRunAtMs || Number.MAX_SAFE_INTEGER;
                    return aNext - bNext;
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ jobs, total: jobs.length }));
            } catch {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ jobs: [], total: 0, error: 'Failed to parse cron jobs' }));
            }
        });
    } else if (req.url === '/api/goals') {
        if (req.method === 'GET') {
            fs.readFile(GOALS_FILE, 'utf8', (err, data) => {
                if (err) return res.end(JSON.stringify({ youtube: 0, skool: 0, revenue: 0 }));
                try {
                    const parsed = JSON.parse(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ youtube: parsed.youtube || 0, skool: parsed.skool || 0, revenue: parsed.revenue || 0 }));
                } catch {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ youtube: 0, skool: 0, revenue: 0 }));
                }
            });
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const cleaned = { youtube: Number(parsed.youtube) || 0, skool: Number(parsed.skool) || 0, revenue: Number(parsed.revenue) || 0 };
                    fs.writeFile(GOALS_FILE, JSON.stringify(cleaned, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            });
        }
    } else if (req.url.startsWith('/api/youtube/checklist')) {
        const queryIdx = req.url.indexOf('?');
        const queryParams = new URLSearchParams(queryIdx !== -1 ? req.url.slice(queryIdx) : '');
        const scriptPath = queryParams.get('path');
        const defaultChecklist = [
            'Subtitles',
            'Music',
            'Sound design',
            '3 x Thumbnails',
            'Colour grading',
            'Transitions',
            'Zooms',
            'Add the first comment after posting',
            'Create bloopers at the end of the video'
        ];

        if (!scriptPath) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'No path provided' }));
        }

        const readChecklistData = () => {
            try { return JSON.parse(fs.readFileSync(YOUTUBE_CHECKLIST_FILE, 'utf8')); }
            catch { return {}; }
        };
        const mergeDefaults = (items = []) => {
            const byLabel = new Map(items.filter(Boolean).map(item => [String(item.label || item).trim(), Boolean(item.done)]));
            return defaultChecklist.map(label => ({ label, done: byLabel.get(label) || false }));
        };

        if (req.method === 'GET') {
            const data = readChecklistData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ items: mergeDefaults(data[scriptPath]) }));
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const data = readChecklistData();
                    data[scriptPath] = mergeDefaults(parsed.items);
                    fs.writeFile(YOUTUBE_CHECKLIST_FILE, JSON.stringify(data, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            });
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    } else if (req.url.startsWith('/api/youtube/script')) {
        const queryIdx = req.url.indexOf('?');
        const queryParams = new URLSearchParams(queryIdx !== -1 ? req.url.slice(queryIdx) : '');
        const scriptPath = queryParams.get('path');
        
        if (!scriptPath) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: "No path provided" }));
        }

        const YOUTUBE_SKILL_DIR = path.join(WORKSPACE_DIR, 'skills', 'youtube-long-form-planner', 'references');
        const fullPath = path.join(YOUTUBE_SKILL_DIR, scriptPath);

        if (!fullPath.startsWith(YOUTUBE_SKILL_DIR)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: "Forbidden" }));
        }

        if (req.method === 'GET') {
            fs.readFile(fullPath, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Script not found", content: "" }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ content: data }));
            });
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const { content } = JSON.parse(body);
                    // Create directory if it doesn't exist
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    
                    fs.writeFile(fullPath, content, (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: "Failed to save script" }));
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    });
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Invalid JSON" }));
                }
            });
        }
    } else if (req.url === '/api/youtube/status' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { title, status } = JSON.parse(body);
                fs.readFile(YOUTUBE_CSV, 'utf8', (err, data) => {
                    if (err) return res.writeHead(500).end();
                    const lines = data.split('\n').filter(l => l.trim());
                    if (lines.length === 0) return res.writeHead(400).end();
                    
                    const parseLine = (line) => {
                        const row = [];
                        let inQ = false, curr = '';
                        for(let i=0; i<line.length; i++) {
                            if(line[i] === '"') inQ = !inQ;
                            else if(line[i] === ',' && !inQ) { row.push(curr); curr = ''; }
                            else curr += line[i];
                        }
                        row.push(curr);
                        return row;
                    };
                    
                    let headers = parseLine(lines[0]).map(h => h.trim());
                    let statusIdx = headers.indexOf('Status');
                    if (statusIdx === -1) {
                        headers.push('Status');
                        statusIdx = headers.length - 1;
                    }
                    
                    const formatVal = v => {
                        v = v || '';
                        if (v.includes(',') || v.includes('"')) return `"${v.replace(/"/g, '""')}"`;
                        return v;
                    };
                    
                    const newLines = [headers.map(formatVal).join(',')];
                    for(let i=1; i<lines.length; i++) {
                        let row = parseLine(lines[i]);
                        while(row.length < headers.length) row.push('');
                        if (row[0].trim() === title) {
                            row[statusIdx] = status;
                        }
                        newLines.push(row.map(formatVal).join(','));
                    }
                    
                    fs.writeFile(YOUTUBE_CSV, newLines.join('\n') + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err }));
                    });
                });
            } catch (e) {
                res.writeHead(400).end();
            }
        });
    } else if (req.url === '/api/workouts') {
        fs.readFile(WORKOUT_LOGS_FILE, 'utf8', (err, data) => {
            fs.readFile(WEIGHT_LOGS_FILE, 'utf8', (_weightErr, weightCsv) => {
                if (err) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ rows: [], sessions: [], exercises: [], summary: {}, weight: processWeightData(weightCsv || ''), error: 'Workout logs not found' }));
                }
                fs.readFile(WORKOUT_PLAN_FILE, 'utf8', (_planErr, plan) => {
                const results = { ...processWorkoutData(data, plan || ''), weight: processWeightData(weightCsv || '') };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(results));
                });
            });
        });
    } else if (req.url === '/api/analytics/youtube') {
        const analytics = readJsonFile(YOUTUBE_ANALYTICS_FILE, { channel: { name: 'Phil Lougher AI', url: 'https://www.youtube.com/@PhilLougherAI' }, videos: [] });
        fs.readFile(YOUTUBE_CSV, 'utf8', (err, plannerCsv) => {
            const plannerVideos = err ? [] : parsePlannerVideos(plannerCsv);
            const results = processYouTubeAnalytics(analytics, plannerVideos);
            results.auth = { connected: fs.existsSync(YOUTUBE_TOKEN_FILE), tokenPath: fs.existsSync(YOUTUBE_TOKEN_FILE) ? 'secrets/youtube-token.json' : null };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        });
    } else if (req.url === '/api/analytics/youtube/refresh' && req.method === 'POST') {
        const child = spawn(process.execPath, [YOUTUBE_ANALYTICS_REFRESH_SCRIPT], { cwd: __dirname, env: process.env });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => stdout += chunk.toString());
        child.stderr.on('data', chunk => stderr += chunk.toString());
        child.on('close', (code) => {
            if (code !== 0) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: stderr || stdout || `Refresh exited with code ${code}` }));
            }
            let refreshResult = { success: true };
            try { refreshResult = { success: true, ...JSON.parse(stdout) }; } catch { refreshResult.output = stdout; }
            const analytics = readJsonFile(YOUTUBE_ANALYTICS_FILE, { channel: { name: 'Phil Lougher AI', url: 'https://www.youtube.com/@PhilLougherAI' }, videos: [] });
            fs.readFile(YOUTUBE_CSV, 'utf8', (err, plannerCsv) => {
                const plannerVideos = err ? [] : parsePlannerVideos(plannerCsv);
                const results = processYouTubeAnalytics(analytics, plannerVideos);
                results.refresh = refreshResult;
                results.auth = { connected: fs.existsSync(YOUTUBE_TOKEN_FILE), tokenPath: fs.existsSync(YOUTUBE_TOKEN_FILE) ? 'secrets/youtube-token.json' : null };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(results));
            });
        });
    } else if (req.url === '/api/youtube/strategy') {
        fs.readFile(YOUTUBE_STRATEGY_FILE, 'utf8', (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'YouTube strategy not found', content: '' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content }));
        });
    } else if (req.url === '/api/youtube/team') {
        fs.readFile(PERSONAL_CRM_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ team: [] }));
            }
            
            const lines = data.split('\n').filter(l => l.trim());
            if (lines.length <= 1) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ team: [] }));
            }
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const team = [];
            for (let idx = 1; idx < lines.length; idx++) {
                const line = lines[idx];
                const row = [];
                let inQuotes = false;
                let current = '';
                for (let i = 0; i < line.length; i++) {
                    if (line[i] === '"') {
                        inQuotes = !inQuotes;
                    } else if (line[i] === ',' && !inQuotes) {
                        row.push(current);
                        current = '';
                    } else {
                        current += line[i];
                    }
                }
                row.push(current);
                const member = {};
                headers.forEach((h, i) => { member[h] = row[i] ? row[i].trim().replace(/^"|"$/g, '') : ''; });
                if (member['Name'] && member['Role/Tags'] && member['Role/Tags'].toLowerCase().includes('video') || member['Role/Tags']?.toLowerCase().includes('thumbnail') || member['Role/Tags']?.toLowerCase().includes('youtube')) {
                    team.push(member);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ team }));
        });
    } else if (req.url === '/api/youtube/competitors') {
        const competitorData = readJsonFile(YOUTUBE_COMPETITORS_FILE, { competitors: [] });
        const competitors = Array.isArray(competitorData.competitors) ? competitorData.competitors : [];
        let entries = [];
        try {
            entries = fs.readdirSync(YOUTUBE_COMPETITOR_DIR, { withFileTypes: true })
                .filter(entry => entry.isFile() && /\.(md|csv|vtt)$/i.test(entry.name))
                .map(entry => entry.name)
                .sort((a, b) => {
                    const rank = (name) => name.endsWith('.md') ? 0 : name.endsWith('.csv') ? 1 : 2;
                    return rank(a) - rank(b) || a.localeCompare(b);
                });
        } catch {}
        const items = entries.map(filename => {
            const filePath = path.join(YOUTUBE_COMPETITOR_DIR, filename);
            try {
                const rawContent = fs.readFileSync(filePath, 'utf8');
                const ext = path.extname(filename).slice(1).toLowerCase();
                const title = (rawContent.match(/^#\s+(.+)$/m) || [])[1] || filename.replace(/_/g, ' ').replace(/\.(md|csv|vtt)$/i, '');
                const content = rawContent.length > 40000
                    ? `${rawContent.slice(0, 40000)}\n\n[Transcript truncated in dashboard preview — full file lives in ${path.join('skills/youtube-long-form-planner/references/Competitor_Analysis', filename)}]`
                    : rawContent;
                const summary = rawContent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('WEBVTT') && !/^\d{2}:\d{2}:\d{2}/.test(line) && !line.startsWith('#'))
                    .slice(0, 8)
                    .join('\n');
                return { filename, title, type: ext, content, summary };
            } catch {
                return null;
            }
        }).filter(Boolean);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            directory: path.relative(WORKSPACE_DIR, YOUTUBE_COMPETITORS_DIR),
            competitors,
            items
        }));
    } else if (req.url === '/api/youtube/swipe-file') {
        if (req.method === 'GET') {
            const swipe = readJsonFile(YOUTUBE_SWIPE_FILE, { items: [] });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ items: Array.isArray(swipe.items) ? swipe.items : [] }));
        }
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const swipe = readJsonFile(YOUTUBE_SWIPE_FILE, { items: [] });
                    const items = Array.isArray(swipe.items) ? swipe.items : [];
                    const nextItem = {
                        id: incoming.id || `swipe-${Date.now()}`,
                        type: ['title', 'thumbnail'].includes(incoming.type) ? incoming.type : 'title',
                        title: String(incoming.title || '').trim(),
                        notes: String(incoming.notes || '').trim(),
                        source: String(incoming.source || '').trim(),
                        createdAt: incoming.createdAt || new Date().toISOString()
                    };
                    if (!nextItem.title) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
                    }
                    const next = { items: [nextItem, ...items] };
                    fs.writeFile(YOUTUBE_SWIPE_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err, item: nextItem, items: next.items }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
                }
            });
            return;
        }
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    } else if (req.url === '/api/youtube') {
        fs.readFile(YOUTUBE_CSV, 'utf8', (err, data) => {
            if (err) return res.end(JSON.stringify({ videos: [] }));
            
            const lines = data.split('\n').filter(l => l.trim());
            if (lines.length <= 1) return res.end(JSON.stringify({ videos: [] }));
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const videos = lines.slice(1).map(line => {
                const row = [];
                let inQuotes = false;
                let current = '';
                for (let i = 0; i < line.length; i++) {
                    if (line[i] === '"') {
                        inQuotes = !inQuotes;
                    } else if (line[i] === ',' && !inQuotes) {
                        row.push(current);
                        current = '';
                    } else {
                        current += line[i];
                    }
                }
                row.push(current);
                
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i] ? row[i].trim() : '';
                });
                return obj;
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ videos }));
        });
    } else {
        res.writeHead(404);
        res.end("Not Found");
    }
});

function serveFile(res, filePath, contentType, req = null) {
    fs.stat(filePath, (statErr, stats) => {
        if (statErr) {
            res.writeHead(500);
            res.end("Error loading file.");
            return;
        }

        const headers = {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Accept-Ranges': 'bytes'
        };

        const range = req?.headers?.range;
        if (range) {
            const match = range.match(/bytes=(\d*)-(\d*)/);
            if (!match) {
                res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
                res.end();
                return;
            }

            const start = match[1] ? parseInt(match[1], 10) : 0;
            const end = match[2] ? parseInt(match[2], 10) : stats.size - 1;

            if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stats.size) {
                res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
                res.end();
                return;
            }

            const safeEnd = Math.min(end, stats.size - 1);
            res.writeHead(206, {
                ...headers,
                'Content-Length': safeEnd - start + 1,
                'Content-Range': `bytes ${start}-${safeEnd}/${stats.size}`
            });
            fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
            return;
        }

        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
    });
}

function readJsonFile(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function parseCsvRows(data = '') {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < data.length; i++) {
        const ch = data[i];
        const next = data[i + 1];
        if (ch === '"' && inQuotes && next === '"') {
            current += '"';
            i++;
        } else if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            row.push(current);
            current = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            if (ch === '\r' && next === '\n') i++;
            row.push(current);
            if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
            row = [];
            current = '';
        } else {
            current += ch;
        }
    }
    if (current || row.length) {
        row.push(current);
        if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
    }
    return rows;
}

function parsePlannerVideos(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return [];
    const headers = rows[0].map(h => String(h).trim());
    return rows.slice(1).map(cols => {
        if (cols.length > headers.length) {
            const extraTitleParts = cols.length - headers.length + 1;
            cols = [cols.slice(0, extraTitleParts).join(',').trim(), ...cols.slice(extraTitleParts)];
        } else if (cols.length === headers.length && cols[1] && !/^(Scripts\/|https?:\/\/)/i.test(String(cols[1]).trim())) {
            cols = [`${cols[0]},${cols[1]}`.trim(), '', ...cols.slice(2, headers.length - 1)];
        }
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return obj;
    }).filter(row => row['Video Title']);
}

function normaliseTitle(value = '') {
    return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function processYouTubeAnalytics(analytics = {}, plannerVideos = []) {
    const metricVideos = Array.isArray(analytics.videos) ? analytics.videos : [];
    const metricsByTitle = new Map(metricVideos.map(video => [normaliseTitle(video.title || video.videoTitle || video.name), video]));
    const plannerRows = plannerVideos
        .filter(video => String(video.Status || '').toLowerCase() === 'done' || metricVideos.length === 0)
        .map(video => {
            const title = video['Video Title'];
            const metric = metricsByTitle.get(normaliseTitle(title)) || {};
            return {
                title,
                url: metric.url || video.Url || video.URL || '',
                status: video.Status || metric.status || 'Planned',
                impressionsCtrPct: numberOrNull(metric.impressionsCtrPct ?? metric.ctrPct ?? metric.ctr),
                audienceRetentionPct: numberOrNull(metric.audienceRetentionPct ?? metric.retentionPct ?? metric.averageViewPercentage),
                source: metric.title ? 'analytics-file' : 'planner-placeholder'
            };
        });
    const extraMetricRows = metricVideos
        .filter(metric => !plannerVideos.some(video => normaliseTitle(video['Video Title']) === normaliseTitle(metric.title || metric.videoTitle || metric.name)))
        .map(metric => ({
            title: metric.title || metric.videoTitle || metric.name || 'Untitled video',
            url: metric.url || '',
            status: metric.status || 'Published',
            impressionsCtrPct: numberOrNull(metric.impressionsCtrPct ?? metric.ctrPct ?? metric.ctr),
            audienceRetentionPct: numberOrNull(metric.audienceRetentionPct ?? metric.retentionPct ?? metric.averageViewPercentage),
            source: 'analytics-file'
        }));
    const videos = [...plannerRows, ...extraMetricRows];
    const ctrValues = videos.map(v => v.impressionsCtrPct).filter(v => typeof v === 'number');
    const retentionValues = videos.map(v => v.audienceRetentionPct).filter(v => typeof v === 'number');
    return {
        channel: analytics.channel || { name: 'Phil Lougher AI', url: 'https://www.youtube.com/@PhilLougherAI' },
        note: analytics.note || 'YouTube impressions CTR and audience retention require YouTube Analytics API access or manual export.',
        videos,
        summary: {
            videoCount: videos.length,
            metricsCount: videos.filter(v => typeof v.impressionsCtrPct === 'number' || typeof v.audienceRetentionPct === 'number').length,
            avgCtrPct: average(ctrValues),
            avgAudienceRetentionPct: average(retentionValues)
        }
    };
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function average(values = []) {
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseWorkoutLog(logString = '') {
    const clean = String(logString).replace(/\(Note:.*?\)/gi, '').trim();
    const secondsMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:sec|second|seconds)\b/i);
    if (secondsMatch) {
        const seconds = Number(secondsMatch[1]);
        return { type: 'time', seconds, display: `${seconds}s`, sets: [], totalReps: 0, volume: 0, topSet: null };
    }

    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    const sets = parts.map(part => {
        const weighted = part.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*kg)?/i);
        if (weighted) {
            const reps = Number(weighted[1]);
            const weight = Number(weighted[2]);
            return { reps, weight, volume: reps * weight, label: `${reps}×${weight}kg` };
        }
        const repsOnly = part.match(/^(\d+(?:\.\d+)?)(?:\s*x\s*BW)?$/i);
        if (repsOnly) {
            const reps = Number(repsOnly[1]);
            return { reps, weight: 0, volume: 0, label: `${reps} reps` };
        }
        return null;
    }).filter(Boolean);

    const totalReps = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
    const volume = sets.reduce((sum, set) => sum + (set.volume || 0), 0);
    const topSet = sets.find(set => set.weight > 0) || sets[0] || null;
    return { type: 'sets', seconds: 0, display: parts.join(', '), sets, totalReps, volume, topSet };
}

function processWorkoutData(csv, plan = '') {
    const parsed = parseCsvRows(csv);
    if (parsed.length <= 1) return { rows: [], sessions: [], exercises: [], summary: {}, plan };
    const headers = parsed[0].map(h => String(h).trim());
    const rows = parsed.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        const parsedLog = parseWorkoutLog(obj.LogString || '');
        return { ...obj, parsed: parsedLog, volume: parsedLog.volume, totalReps: parsedLog.totalReps, seconds: parsedLog.seconds };
    }).filter(row => row.Date && row.Shortcode);

    const sessionMap = new Map();
    rows.forEach(row => {
        const key = `${row.Date}|${row.WorkoutDay}`;
        if (!sessionMap.has(key)) sessionMap.set(key, { date: row.Date, workoutDay: row.WorkoutDay, exercises: [], volume: 0, totalReps: 0, bestDeadHang: 0 });
        const session = sessionMap.get(key);
        session.exercises.push(row);
        session.volume += row.volume || 0;
        session.totalReps += row.totalReps || 0;
        if (row.Shortcode === 'DEADHANG') session.bestDeadHang = Math.max(session.bestDeadHang, row.seconds || 0);
    });
    const sessions = Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const exerciseMap = new Map();
    rows.forEach(row => {
        if (!exerciseMap.has(row.Shortcode)) exerciseMap.set(row.Shortcode, []);
        exerciseMap.get(row.Shortcode).push(row);
    });
    const exercises = Array.from(exerciseMap.entries()).map(([shortcode, logs]) => {
        logs.sort((a, b) => a.Date.localeCompare(b.Date));
        const latest = logs[logs.length - 1];
        const previous = logs.length > 1 ? logs[logs.length - 2] : null;
        return {
            shortcode,
            count: logs.length,
            latest,
            previous,
            volumeChange: previous ? (latest.volume || 0) - (previous.volume || 0) : null,
            topSetChangeKg: previous?.parsed?.topSet && latest?.parsed?.topSet ? (latest.parsed.topSet.weight || 0) - (previous.parsed.topSet.weight || 0) : null
        };
    }).sort((a, b) => String(b.latest?.Date || '').localeCompare(String(a.latest?.Date || '')) || b.count - a.count);

    const splitCounts = sessions.reduce((acc, s) => {
        acc[s.workoutDay] = (acc[s.workoutDay] || 0) + 1;
        return acc;
    }, {});
    const deadhangs = rows.filter(r => r.Shortcode === 'DEADHANG');
    const latestSession = sessions[sessions.length - 1] || null;
    const summary = {
        totalRows: rows.length,
        sessionCount: sessions.length,
        totalVolume: Math.round(sessions.reduce((sum, s) => sum + s.volume, 0)),
        bestDeadHang: Math.max(0, ...deadhangs.map(r => r.seconds || 0)),
        firstDate: sessions[0]?.date || null,
        latestDate: latestSession?.date || null,
        latestWorkoutDay: latestSession?.workoutDay || null,
        splitCounts
    };
    return { rows, sessions, exercises, summary, plan };
}

function processWeightData(csv = '') {
    const parsed = parseCsvRows(csv);
    if (parsed.length <= 1) return { rows: [], summary: {} };
    const headers = parsed[0].map(h => String(h).trim());
    const rows = parsed.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        const weightLbs = Number(obj.Weight_lbs || 0);
        const weightKg = Number(obj.Weight_kg || 0);
        return {
            dateTime: obj.Date,
            date: String(obj.Date || '').slice(0, 10),
            weightKg,
            weightLbs,
            notes: obj.Notes || ''
        };
    }).filter(row => row.dateTime && Number.isFinite(row.weightLbs) && row.weightLbs > 0)
      .sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));

    const latest = rows[rows.length - 1] || null;
    const previous = rows.length > 1 ? rows[rows.length - 2] : null;
    const latestTime = latest ? new Date(latest.dateTime.replace(' ', 'T')).getTime() : 0;
    const thirtyDaysAgo = latestTime - (30 * 86400000);
    const ninetyDaysAgo = latestTime - (90 * 86400000);
    const closestBefore30d = rows.filter(r => new Date(r.dateTime.replace(' ', 'T')).getTime() <= thirtyDaysAgo).at(-1) || rows[0] || null;
    const chartRows = rows.filter(r => new Date(r.dateTime.replace(' ', 'T')).getTime() >= ninetyDaysAgo).slice(-24);
    const weights = rows.map(r => r.weightLbs);
    const summary = {
        count: rows.length,
        latest,
        previous,
        changeSincePreviousLbs: latest && previous ? latest.weightLbs - previous.weightLbs : null,
        change30dLbs: latest && closestBefore30d ? latest.weightLbs - closestBefore30d.weightLbs : null,
        firstDate: rows[0]?.date || null,
        latestDate: latest?.date || null,
        minLbs: weights.length ? Math.min(...weights) : null,
        maxLbs: weights.length ? Math.max(...weights) : null
    };
    return { rows, chartRows, summary };
}

function processUsageData(sessions) {
    let files = [];
    try {
        files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
    } catch(e) {}

    const allMessages = [];

    // Process all jsonl files to get accurate time-bounded metrics
    files.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8');
            const lines = content.split('\n');
            
            let sessionId = file.replace('.jsonl', '');
            const sessionObj = Object.values(sessions).find(s => s.sessionId && file.includes(s.sessionId));
            const label = sessionObj && sessionObj.label ? sessionObj.label : sessionId;

            lines.forEach(lineStr => {
                if (!lineStr.trim()) return;
                try {
                    const line = JSON.parse(lineStr);
                    if (line.type === 'message' && line.message && line.message.role === 'assistant' && line.message.usage) {
                        const usage = line.message.usage;
                        let cost = usage.cost ? usage.cost.total : 0;
                        if (cost < 0) cost = 0; // Fix negative cost anomalies from old openrouter logs
                        const tokens = usage.totalTokens || ((usage.input || 0) + (usage.output || 0));
                        const timestamp = new Date(line.timestamp || line.message.timestamp || 0).getTime();
                        
                        allMessages.push({
                            timestamp,
                            model: line.message.model || sessionObj?.model || "Unknown",
                            tokens,
                            cost,
                            label
                        });
                    }
                } catch(e) {}
            });
        } catch(e) {}
    });

    allMessages.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate time buckets
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    
    // Start of week (Monday)
    const day = now.getDay() || 7; 
    const startOfWeek = startOfToday - ((day - 1) * 86400000);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    const metrics = {
        today: { cost: 0, tokens: 0 },
        yesterday: { cost: 0, tokens: 0 },
        thisWeek: { cost: 0, tokens: 0 },
        thisMonth: { cost: 0, tokens: 0 },
        thisYear: { cost: 0, tokens: 0 },
        lifetime: { cost: 0, tokens: 0 }
    };

    allMessages.forEach(msg => {
        const t = msg.timestamp;
        const c = msg.cost;
        const tk = msg.tokens;

        metrics.lifetime.cost += c;
        metrics.lifetime.tokens += tk;

        if (t >= startOfToday) {
            metrics.today.cost += c;
            metrics.today.tokens += tk;
        }
        if (t >= startOfYesterday && t < startOfToday) {
            metrics.yesterday.cost += c;
            metrics.yesterday.tokens += tk;
        }
        if (t >= startOfWeek) {
            metrics.thisWeek.cost += c;
            metrics.thisWeek.tokens += tk;
        }
        if (t >= startOfMonth) {
            metrics.thisMonth.cost += c;
            metrics.thisMonth.tokens += tk;
        }
        if (t >= startOfYear) {
            metrics.thisYear.cost += c;
            metrics.thisYear.tokens += tk;
        }
    });

    // Add any orphaned costs from sessions.json that aren't in jsonl
    let sessionJsonCost = 0;
    let sessionJsonTokens = 0;
    Object.values(sessions).forEach(s => {
        let sc = s.estimatedCostUsd || 0;
        if (sc < 0) sc = 0;
        sessionJsonCost += sc;
        sessionJsonTokens += (s.inputTokens || 0) + (s.outputTokens || 0);
    });
    
    if (sessionJsonCost > metrics.lifetime.cost) {
        metrics.lifetime.cost = sessionJsonCost;
    }
    if (sessionJsonTokens > metrics.lifetime.tokens) {
        metrics.lifetime.tokens = sessionJsonTokens;
    }

    return {
        metrics,
        allActivity: allMessages.slice(0, 50)
    };
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function displayDate(dateKey) {
    const [year, month, day] = String(dateKey).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return dateKey;
    return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function updateNewsHistory(content) {
    const trimmed = String(content || '').trim();
    let history = [];
    try {
        const parsed = JSON.parse(fs.readFileSync(DAILY_NEWS_HISTORY_FILE, 'utf8'));
        history = Array.isArray(parsed.items) ? parsed.items : [];
    } catch {}

    if (trimmed) {
        const date = localDateKey();
        const existingIndex = history.findIndex(item => item.date === date);
        const entry = {
            date,
            title: displayDate(date),
            content: trimmed,
            updatedAtMs: Date.now()
        };
        if (existingIndex >= 0) history[existingIndex] = { ...history[existingIndex], ...entry };
        else history.unshift(entry);
    }

    history = history
        .filter(item => item && item.date && item.content)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 7);

    try {
        fs.writeFileSync(DAILY_NEWS_HISTORY_FILE, JSON.stringify({ items: history }, null, 2) + '\n');
    } catch (err) {
        console.error('Failed to write daily news history:', err);
    }

    return history;
}

function dispatchNewInProgressTasks(fleet) {
    if (!fleet || !Array.isArray(fleet.tasks)) return fleet;
    const now = Date.now();
    fleet.activity = Array.isArray(fleet.activity) ? fleet.activity : [];

    fleet.tasks.forEach(task => {
        if (!task || task.status !== 'inprogress' || task.dispatchedAt) return;
        const agentId = normaliseTaskAgent(task.assignee);
        task.dispatchedAt = now;
        task.dispatchMethod = 'openclaw-agent-cli';
        task.dispatchStatus = 'starting';
        task.lastActive = now;
        task.updatedAt = now;
        fleet.activity.unshift({
            agent: 'Mission Control',
            action: `Dispatched task "${task.title || 'Untitled task'}" to ${agentId}.`,
            timestamp: now
        });
        const dispatch = spawnTaskAgent(task, agentId);
        task.dispatchPid = dispatch.pid || null;
        task.dispatchLog = dispatch.logPath || null;
        task.dispatchStatus = dispatch.started ? 'running' : 'failed_to_start';
    });

    return fleet;
}

function normaliseTaskAgent(assignee) {
    const value = String(assignee || 'main').trim().toLowerCase();
    if (['cto', 'cmo', 'daily-tasks', 'main'].includes(value)) return value;
    return 'main';
}

function spawnTaskAgent(task, agentId) {
    const title = task.title || 'Untitled task';
    const description = task.description || '';
    const tag = task.tag || 'General';
    const message = [
        `Mission Control task ${task.id || ''} is now In Progress and assigned to ${agentId}.`,
        '',
        `Title: ${title}`,
        description ? `Description: ${description}` : '',
        `Tag: ${tag}`,
        '',
        'Please complete this task. If it requires code or file changes, inspect the workspace, make the focused change, and run a lightweight verification. When finished, update mission-control/fleet_data.json: set this task status to "done", set updatedAt/lastActive, and add a short activity entry explaining what changed.'
    ].filter(Boolean).join('\n');

    fs.mkdirSync(DISPATCH_LOG_DIR, { recursive: true });
    const safeId = String(task.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const logPath = path.join(DISPATCH_LOG_DIR, `${safeId}.log`);
    const out = fs.createWriteStream(logPath, { flags: 'a' });
    out.write(`\n--- Dispatch ${new Date().toISOString()} ${task.id || ''} -> ${agentId} ---\n`);

    const child = spawn('/opt/homebrew/bin/openclaw', [
        'agent',
        '--agent', agentId,
        '--session-id', `mission-control-task-${task.id || Date.now()}`,
        '--message', message,
        '--timeout', '900',
        '--json'
    ], {
        cwd: WORKSPACE_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });

    child.on('error', (err) => {
        out.write(`\nDISPATCH_START_ERROR: ${err.stack || err.message}\n`);
        out.end();
        updateDispatchedTaskState(task.id, 'error', `Failed to start ${task.title || 'task'}: ${err.message}`);
    });

    child.on('close', (code) => {
        out.write(`\n--- Dispatch finished code=${code} ${new Date().toISOString()} ---\n`);
        out.end();
        if (code === 0) {
            updateDispatchedTaskState(task.id, 'done', `Completed task "${task.title || 'Untitled task'}" via ${agentId}.`);
        } else {
            updateDispatchedTaskState(task.id, 'error', `Task "${task.title || 'Untitled task'}" failed in ${agentId}. Check ${path.relative(__dirname, logPath)}.`);
        }
    });

    return { started: true, pid: child.pid, logPath: path.relative(__dirname, logPath) };
}

function updateDispatchedTaskState(taskId, status, action) {
    if (!taskId) return;
    let fleet;
    try {
        fleet = JSON.parse(fs.readFileSync(FLEET_FILE, 'utf8'));
    } catch (err) {
        console.error('Failed to read fleet file for dispatch update:', err);
        return;
    }

    const task = Array.isArray(fleet.tasks) ? fleet.tasks.find(t => t.id === taskId) : null;
    if (!task) return;
    const now = Date.now();
    task.status = status;
    task.dispatchStatus = status === 'done' ? 'completed' : 'failed';
    task.lastActive = now;
    task.updatedAt = now;
    if (status === 'done') task.completedAt = now;
    if (status === 'error') task.failedAt = now;
    fleet.activity = Array.isArray(fleet.activity) ? fleet.activity : [];
    fleet.activity.unshift({ agent: 'Mission Control', action, timestamp: now });

    try {
        fs.writeFileSync(FLEET_FILE, JSON.stringify(fleet, null, 2) + '\n');
    } catch (err) {
        console.error('Failed to write fleet dispatch update:', err);
    }
}

function readBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > 5 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => callback(body));
}

function ensureReadDirs() {
    fs.mkdirSync(READ_CONTENT_DIR, { recursive: true });
    fs.mkdirSync(READ_AUDIO_DIR, { recursive: true });
}

function readReadLibrary() {
    ensureReadDirs();
    try {
        const parsed = JSON.parse(fs.readFileSync(READ_LIBRARY_FILE, 'utf8'));
        return { items: Array.isArray(parsed.items) ? parsed.items : [] };
    } catch {
        return { items: [] };
    }
}

function writeReadLibrary(library) {
    ensureReadDirs();
    fs.writeFileSync(READ_LIBRARY_FILE, JSON.stringify({ items: library.items || [] }, null, 2) + '\n');
}

function readSlug(text) {
    return String(text || 'read-item')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'read-item';
}

function createReadItem({ title, type, text }) {
    const cleanTitle = String(title || '').trim();
    const cleanType = String(type || 'article').trim().toLowerCase();
    const cleanText = String(text || '').trim();
    if (!cleanTitle) throw new Error('Title is required');
    if (!cleanText) throw new Error('Content text is required');

    const library = readReadLibrary();
    const idBase = `${Date.now()}-${readSlug(cleanTitle)}`;
    const id = idBase.replace(/[^a-z0-9-]/g, '');
    const textFile = `${id}.txt`;
    const audioFile = `${id}.wav`;
    fs.writeFileSync(path.join(READ_CONTENT_DIR, textFile), cleanText);

    const item = {
        id,
        title: cleanTitle,
        type: cleanType || 'article',
        textFile,
        audioFile,
        listenCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastListenedAt: null,
        charCount: cleanText.length,
        preview: cleanText.slice(0, 240)
    };
    library.items.unshift(item);
    writeReadLibrary(library);
    return item;
}

function findReadItem(id) {
    const library = readReadLibrary();
    const item = library.items.find(entry => entry.id === id);
    return { library, item };
}

function synthesizeReadAudio(id, callback) {
    const { item } = findReadItem(id);
    if (!item) return callback(new Error('Read item not found'));
    ensureReadDirs();
    const textPath = path.join(READ_CONTENT_DIR, item.textFile);
    const audioPath = path.join(READ_AUDIO_DIR, item.audioFile || `${item.id}.wav`);
    if (fs.existsSync(audioPath)) return callback(null, audioPath);

    let text;
    try {
        text = fs.readFileSync(textPath, 'utf8');
    } catch {
        return callback(new Error('Saved text file not found'));
    }

    const child = spawn(MLX_TTS_SCRIPT, [audioPath], { cwd: WORKSPACE_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', chunk => stderr += chunk.toString());
    child.on('error', err => callback(err));
    child.on('close', code => {
        if (code !== 0 || !fs.existsSync(audioPath)) {
            return callback(new Error(`MLX TTS failed${stderr ? `: ${stderr.slice(-500)}` : ''}`));
        }
        callback(null, audioPath);
    });
    child.stdin.write(text);
    child.stdin.end();
}

function markReadItemListened(id) {
    const { library, item } = findReadItem(id);
    if (!item) throw new Error('Read item not found');
    item.listenCount = Number(item.listenCount || 0) + 1;
    item.lastListenedAt = new Date().toISOString();
    item.updatedAt = item.lastListenedAt;
    writeReadLibrary(library);
    return item;
}

function startServer() {
    const instance = server.listen(PORT, () => {
        console.log(`\n🚀 OpenClaw Mission Control is running!`);
        console.log(`👉 Open http://localhost:${PORT} in your browser.\n`);
    });

    instance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is busy, retrying in 2s...`);
            setTimeout(startServer, 2000);
            return;
        }
        console.error('Server error:', err);
        setTimeout(startServer, 2000);
    });
}

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    setTimeout(startServer, 2000);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

startServer();

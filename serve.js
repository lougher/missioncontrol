const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = Number(process.env.MISSION_CONTROL_PORT || 3000);
const HOST = process.env.MISSION_CONTROL_HOST || '127.0.0.1';
const SESSIONS_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');
const WORKSPACE_DIR = path.join(os.homedir(), '.openclaw', 'workspace');
const FLEET_FILE = path.join(__dirname, 'fleet_data.json');
const PERSONAL_CRM_FILE = process.env.MISSION_CONTROL_CRM_FILE || path.join(WORKSPACE_DIR, 'Personal_CRM.csv');
const YOUTUBE_LONG_FORM_DIR = path.join(WORKSPACE_DIR, 'skills', 'youtube-long-form-planner-aug-2026');
const YOUTUBE_REFERENCES_DIR = path.join(YOUTUBE_LONG_FORM_DIR, 'references');
const YOUTUBE_CSV = path.join(YOUTUBE_REFERENCES_DIR, 'Video_Planner.csv');
const YOUTUBE_SHORTS_CSV = path.join(WORKSPACE_DIR, 'skills', 'youtube-short-form-planner', 'references', 'Short_Video_Planner.csv');
const INSTAGRAM_REELS_CSV = path.join(__dirname, 'instagram_reels_pipeline.csv');
const INSTAGRAM_REELS_PRIORITY_FILE = path.join(__dirname, 'instagram_reels_priorities.json');
const INSTAGRAM_IDEAS_FILE = path.join(__dirname, 'instagram_ideas.json');
const INSTAGRAM_ACCOUNTS_FILE = path.join(__dirname, 'instagram_accounts.json');
const YOUTUBE_COMPETITOR_DIR = path.join(YOUTUBE_REFERENCES_DIR, 'Competitor_Analysis');
const YOUTUBE_COMPETITORS_DIR = path.join(YOUTUBE_REFERENCES_DIR, 'Competitors');
const YOUTUBE_COMPETITORS_FILE = path.join(YOUTUBE_COMPETITORS_DIR, 'competitors.json');
const YOUTUBE_STRATEGY_FILE = path.join(YOUTUBE_REFERENCES_DIR, 'YouTube_100K_Strategy.md');
const YOUTUBE_CHECKLIST_FILE = path.join(__dirname, 'youtube_checklists.json');
const YOUTUBE_SWIPE_FILE = path.join(__dirname, 'youtube_swipe_file.json');
const YOUTUBE_ANALYTICS_FILE = path.join(__dirname, 'youtube_analytics_metrics.json');
const YOUTUBE_ANALYTICS_REFRESH_SCRIPT = path.join(__dirname, 'youtube-refresh-analytics.js');
const YOUTUBE_PRIORITY_FILE = path.join(__dirname, 'youtube_video_priorities.json');
const YOUTUBE_SHORTS_PRIORITY_FILE = path.join(__dirname, 'youtube_short_video_priorities.json');
const YOUTUBE_TOKEN_FILE = path.join(WORKSPACE_DIR, 'secrets', 'youtube-token.json');
const DAILY_NEWS_FILE = path.join(__dirname, 'daily_news.md');
const DAILY_NEWS_HISTORY_FILE = path.join(__dirname, 'daily_news_history.json');
const RELEASES_FILE = path.join(__dirname, 'releases.md');
const LEARNINGS_FILE = path.join(WORKSPACE_DIR, 'skills', 'learnings', 'learning_log.md');
const JOURNAL_FILE = path.join(WORKSPACE_DIR, 'journal.md');
const GOALS_FILE = path.join(__dirname, 'goals.json');
const DREAMS_FILE = path.join(__dirname, 'dreams.json');
const BUSINESS_IDEAS_FILE = path.join(__dirname, 'business_ideas.json');
const CURRENT_WORKOUT_DIR = path.join(WORKSPACE_DIR, 'skills', 'workout-tracker', 'plans', 'jorge-workout-routine');
const WORKOUT_LOGS_FILE = path.join(CURRENT_WORKOUT_DIR, 'workout_logs.csv');
const WORKOUT_PLAN_FILE = path.join(CURRENT_WORKOUT_DIR, 'workout_plan.md');
const WORKOUT_PLAN_CSV_FILE = path.join(CURRENT_WORKOUT_DIR, 'workout_plan.csv');
const NUTRITION_DIR = path.join(WORKSPACE_DIR, 'skills', 'nutrition-tracker');
const NUTRITION_DAILY_MACROS_FILE = path.join(NUTRITION_DIR, 'daily_macros.csv');
const NUTRITION_DAILY_FOOD_LOG_FILE = path.join(NUTRITION_DIR, 'daily_food_log.csv');
const NUTRITION_FOOD_DATABASE_FILE = path.join(NUTRITION_DIR, 'food_database.csv');
const NUTRITION_RECIPE_DATABASE_FILE = path.join(NUTRITION_DIR, 'recipe_database.csv');
const JORGE_NUTRITION_DIR = path.join(NUTRITION_DIR, 'plans', 'jorge-nutrition-plan');
const JORGE_NUTRITION_PLAN_FILE = path.join(JORGE_NUTRITION_DIR, 'jorge_nutrition_plan.csv');
const JORGE_NUTRITION_MACROS_FILE = path.join(JORGE_NUTRITION_DIR, 'jorge_macro_estimates.csv');
const JORGE_NUTRITION_SCHEDULE_FILE = path.join(JORGE_NUTRITION_DIR, 'jorge_weekly_schedule.csv');
const WEIGHT_LOGS_FILE = path.join(WORKSPACE_DIR, 'weight_logs.csv');
const BIOMARKERS_FILE = path.join(WORKSPACE_DIR, 'health', 'biomarkers', 'biomarkers.json');
const CRON_FILE = path.join(os.homedir(), '.openclaw', 'cron', 'jobs.json');
const MEMORY_FILE = path.join(WORKSPACE_DIR, 'MEMORY.md');
const DAILY_MEMORY_DIR = path.join(WORKSPACE_DIR, 'memory');
const DISPATCH_LOG_DIR = path.join(__dirname, 'dispatch-logs');
const READ_LIBRARY_FILE = path.join(__dirname, 'read_library.json');
const READ_CONTENT_DIR = path.join(__dirname, 'read-content');
const READ_AUDIO_DIR = path.join(__dirname, 'read-audio');
const MLX_TTS_SCRIPT = path.join(WORKSPACE_DIR, 'scripts', 'mlx-tts-kokoro.sh');
const LINKEDIN_JOBS_DB_FILE = path.join(__dirname, 'linkedin_jobs_db.json');
const YTJOBS_DB_FILE = path.join(__dirname, 'ytjobs_jobs.json');
const YTJOBS_TALENT_FILE = path.join(__dirname, 'ytjobs_talking_head_editor_shortlist.json');
const PROPERTY_DEALS_DB_FILE = path.join(__dirname, 'property_deals.json');
const PROPERTY_TRACKER_STATE_FILE = path.join(WORKSPACE_DIR, 'property-deals', 'cardiff-hmo-tracker-state.json');
const DUMMY_CALENDAR_JOBS = [
    { id: 'dummy-youtube-planning', name: 'YouTube Planning', hour: 8, minute: 0, calendarTag: 'YouTube' },
    { id: 'dummy-lunch-check-in', name: 'Lunch Check-In', hour: 13, minute: 0, calendarTag: 'Check-In' },
    { id: 'dummy-evening-wrap-up', name: 'Evening Wrap Up', hour: 18, minute: 0, calendarTag: 'Wrap Up' },
    { id: 'dummy-daily-journal', name: 'Daily Journal', hour: 19, minute: 0, calendarTag: 'Journal' }
];

const DEFAULT_GOAL_TARGETS = {
    youtube: 100000,
    skool: 10000,
    revenue: 10000
};

function normalizeGoalEntry(rawValue, fallbackTarget) {
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        return {
            current: Number(rawValue.current) || 0,
            target: Number(rawValue.target) || fallbackTarget
        };
    }

    return {
        current: Number(rawValue) || 0,
        target: fallbackTarget
    };
}

function normalizeGoals(raw = {}) {
    return {
        youtube: normalizeGoalEntry(raw.youtube, DEFAULT_GOAL_TARGETS.youtube),
        skool: normalizeGoalEntry(raw.skool, DEFAULT_GOAL_TARGETS.skool),
        revenue: normalizeGoalEntry(raw.revenue, DEFAULT_GOAL_TARGETS.revenue)
    };
}

function nextDailyRunAtMs(hour, minute) {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next.getTime();
}

function buildDummyCalendarJobs() {
    return DUMMY_CALENDAR_JOBS.map(job => ({
        id: job.id,
        name: job.name,
        enabled: true,
        schedule: {
            kind: 'cron',
            expr: `${job.minute} ${job.hour} * * *`,
            tz: 'Europe/London'
        },
        payload: {
            message: 'Dummy recurring calendar item for Mission Control.'
        },
        state: {
            nextRunAtMs: nextDailyRunAtMs(job.hour, job.minute),
            lastStatus: 'scheduled'
        },
        meta: {
            dummyCalendarItem: true,
            calendarTag: job.calendarTag
        }
    }));
}

function parseJournalDocument(content = '') {
    const normalized = String(content || '').replace(/\r\n/g, '\n');
    const firstSectionIndex = normalized.search(/^##\s+/m);
    const preamble = firstSectionIndex >= 0 ? normalized.slice(0, firstSectionIndex).trimEnd() : normalized.trimEnd();
    const sectionChunks = firstSectionIndex >= 0
        ? normalized.slice(firstSectionIndex).split(/^##\s+/m).filter(Boolean)
        : [];
    const sections = sectionChunks.map(chunk => {
        const [headerLine = '', ...rest] = chunk.split('\n');
        const title = headerLine.trim();
        const body = rest.join('\n').replace(/^\n+|\n+$/g, '').replace(/\n+---\s*$/g, '').trim();
        return { title, body };
    }).filter(section => section.title);
    return { preamble, sections };
}

function stringifyJournalDocument(preamble = '', sections = []) {
    const header = String(preamble || '').trimEnd();
    const renderedSections = sections
        .map(section => `## ${String(section.title || '').trim()}\n\n${String(section.body || '').trim()}`.trim())
        .filter(Boolean)
        .join('\n\n---\n\n');
    return `${header}\n\n${renderedSections}`.trimEnd() + '\n';
}

function readJournalSections() {
    const raw = fs.readFileSync(JOURNAL_FILE, 'utf8');
    return parseJournalDocument(raw);
}

function parseJournalDate(title = '') {
    const cleaned = String(title || '').trim().replace(/(\d+)(st|nd|rd|th)/i, '$1');
    const parsed = new Date(cleaned);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

function sortJournalSections(sections = []) {
    return [...sections].sort((a, b) => {
        const aDate = parseJournalDate(a?.title);
        const bDate = parseJournalDate(b?.title);
        const aTime = aDate ? aDate.getTime() : Number.NEGATIVE_INFINITY;
        const bTime = bDate ? bDate.getTime() : Number.NEGATIVE_INFINITY;
        if (bTime !== aTime) return bTime - aTime;
        return String(a?.title || '').localeCompare(String(b?.title || ''));
    });
}

function writeJournalSections(doc) {
    fs.writeFileSync(JOURNAL_FILE, stringifyJournalDocument(doc.preamble, sortJournalSections(doc.sections)), 'utf8');
}

const server = http.createServer((req, res) => {
    res.on('error', (err) => console.error('Response error:', err));
    const requestPath = req.url.split('?')[0];
    if (requestPath === '/' || requestPath === '/index.html' || requestPath === '/linkedin-jobs' || requestPath === '/jobs/linkedin' || requestPath === '/ytjobs' || requestPath === '/jobs/youtube' || requestPath === '/property' || requestPath === '/people' || requestPath === '/read') {
        serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
    } else if (requestPath === '/styles.css') {
        serveFile(res, path.join(__dirname, 'styles.css'), 'text/css');
    } else if (requestPath === '/app.js') {
        serveFile(res, path.join(__dirname, 'app.js'), 'text/javascript');
    } else if (requestPath === '/workouts.js') {
        serveFile(res, path.join(__dirname, 'workouts.js'), 'text/javascript');
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
    } else if (req.url === '/api/linkedin-jobs') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const db = readLinkedInJobsDb();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jobs: db.jobs || [] }));
    } else if (req.url === '/api/ytjobs') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const db = readYtJobsDb();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db));
    } else if (req.url === '/api/ytjobs-talents') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const db = readYtJobsTalentDb();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db));
    } else if (req.url.match(/^\/api\/ytjobs-talents\/[^/]+\/status$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const { status } = JSON.parse(body || '{}');
                const talent = updateYtJobsTalentStatus(id, status);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, talent }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update YTJobs talent status' }));
            }
        });
    } else if (req.url.match(/^\/api\/ytjobs\/[^/]+\/status$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const { status } = JSON.parse(body || '{}');
                const job = updateYtJobStatus(id, status);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, job }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update YTJobs status' }));
            }
        });
    } else if (req.url.match(/^\/api\/linkedin-jobs\/[^/]+\/status$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const { status } = JSON.parse(body || '{}');
                const job = updateLinkedInJob(id, { status: normalizeLinkedInJobStatus(status) });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, job }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update status' }));
            }
        });
    } else if (req.url === '/api/property-deals') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const db = syncPropertyDealsFromTracker();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ deals: db.deals || [] }));
    } else if (req.url.match(/^\/api\/property-deals\/[^/]+\/reviewed$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const { reviewed } = JSON.parse(body || '{}');
                const deal = updatePropertyDealReviewed(id, Boolean(reviewed));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, deal }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update property deal' }));
            }
        });
    } else if (req.url.match(/^\/api\/property-deals\/[^/]+\/workflow$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const payload = JSON.parse(body || '{}');
                const deal = updatePropertyDealWorkflow(id, payload);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, deal }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update property workflow' }));
            }
        });
    } else if (req.url.match(/^\/api\/property-deals\/[^/]+\/analysis$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const payload = JSON.parse(body || '{}');
                const deal = updatePropertyDealAnalysis(id, payload);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, deal }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update property analysis' }));
            }
        });
    } else if (req.url.match(/^\/api\/linkedin-jobs\/[^/]+\/cover-letter$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        generateLinkedInJobCoverLetter(id)
            .then(job => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, job }));
            })
            .catch(err => {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to generate cover letter' }));
            });
    } else if (req.url.match(/^\/api\/linkedin-jobs\/[^/]+\/job-description$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        readBody(req, (body) => {
            try {
                const { job_description } = JSON.parse(body || '{}');
                const job = updateLinkedInJob(id, { pasted_job_description: String(job_description || '').trim() });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, job }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save job description' }));
            }
        });
    } else if (req.url.match(/^\/api\/linkedin-jobs\/[^/]+\/cover-letter-doc$/)) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        const id = decodeURIComponent(req.url.split('/')[3]);
        createLinkedInCoverLetterGoogleDoc(id)
            .then(job => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, job }));
            })
            .catch(err => {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to create Google Doc' }));
            });
    } else if (req.url === '/api/linkedin-jobs/check-agentmail') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        pullLinkedInJobsFromAgentMail()
            .then(result => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, ...result }));
            })
            .catch(err => {
                console.error('LinkedIn Jobs AgentMail pull failed:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to check AgentMail inbox' }));
            });
    } else if (req.url === '/api/webhooks/agentmail/linkedin-jobs') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        readBody(req, async (body) => {
            try {
                if (!validateAgentMailSignature(req, body)) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Invalid webhook signature' }));
                }
                const payload = JSON.parse(body || '{}');
                const result = await ingestLinkedInJobAlertEmail(payload);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, ...result }));
            } catch (err) {
                console.error('LinkedIn Jobs AgentMail webhook failed:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Invalid webhook payload' }));
            }
        });
    } else if (req.url === '/api/read') {
        if (req.method === 'GET') {
            const library = readReadLibrary();
            const items = (library.items || []).map(item => ({
                ...item,
                durationSeconds: getReadAudioDuration(item)
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ items }));
        } else if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const item = createReadItem({
                        title: incoming.title,
                        type: incoming.type,
                        text: incoming.text
                    });
                    synthesizeReadAudio(item.id, (audioErr) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            item,
                            audioReady: !audioErr,
                            audioError: audioErr ? (audioErr.message || 'Failed to generate audio') : null
                        }));
                    });
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
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/read/')) {
        const id = decodeURIComponent(req.url.replace('/api/read/', '').replace(/\/$/, ''));
        try {
            const item = deleteReadItem(id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ item, deleted: true }));
        } catch (err) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Failed to delete content' }));
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
        fs.readFile(RELEASES_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Releases not found", content: "", items: [] }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: data, items: [] }));
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
    } else if (req.url === '/api/journal') {
        if (req.method === 'GET') {
            fs.readFile(JOURNAL_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Journal not found", content: "" }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ content: data }));
            });
        } else if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const payload = JSON.parse(body || '{}');
                    const title = String(payload.title || '').trim();
                    const content = String(payload.content || '').trim();
                    if (!title || !content) throw new Error('Title and content are required');
                    const doc = readJournalSections();
                    if (doc.sections.some(section => section.title === title)) throw new Error('An entry with that title already exists');
                    doc.sections.unshift({ title, body: content });
                    writeJournalSections(doc);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to create journal entry' }));
                }
            });
        } else if (req.method === 'PUT') {
            readBody(req, (body) => {
                try {
                    const payload = JSON.parse(body || '{}');
                    const originalTitle = String(payload.originalTitle || '').trim();
                    const nextTitle = String(payload.title || '').trim();
                    const content = String(payload.content || '').trim();
                    if (!originalTitle || !nextTitle || !content) throw new Error('Original title, title, and content are required');
                    const doc = readJournalSections();
                    const index = doc.sections.findIndex(section => section.title === originalTitle);
                    if (index === -1) throw new Error('Journal entry not found');
                    if (originalTitle !== nextTitle && doc.sections.some(section => section.title === nextTitle)) throw new Error('An entry with that title already exists');
                    doc.sections[index] = { title: nextTitle, body: content };
                    writeJournalSections(doc);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update journal entry' }));
                }
            });
        } else if (req.method === 'DELETE') {
            readBody(req, (body) => {
                try {
                    const payload = JSON.parse(body || '{}');
                    const title = String(payload.title || '').trim();
                    if (!title) throw new Error('Title is required');
                    const doc = readJournalSections();
                    const nextSections = doc.sections.filter(section => section.title !== title);
                    if (nextSections.length === doc.sections.length) throw new Error('Journal entry not found');
                    doc.sections = nextSections;
                    writeJournalSections(doc);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to delete journal entry' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
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
            const dummyJobs = buildDummyCalendarJobs();
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ jobs: dummyJobs, total: dummyJobs.length, error: 'Cron jobs file not found' }));
            }
            try {
                const parsed = JSON.parse(data);
                const jobs = [...(Array.isArray(parsed.jobs) ? parsed.jobs : []), ...dummyJobs];
                jobs.sort((a, b) => {
                    const aNext = a.state?.nextRunAtMs || Number.MAX_SAFE_INTEGER;
                    const bNext = b.state?.nextRunAtMs || Number.MAX_SAFE_INTEGER;
                    return aNext - bNext;
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ jobs, total: jobs.length }));
            } catch {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ jobs: dummyJobs, total: dummyJobs.length, error: 'Failed to parse cron jobs' }));
            }
        });
    } else if (req.url === '/api/goals') {
        const goalHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' };
        if (req.method === 'GET') {
            fs.readFile(GOALS_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(200, goalHeaders);
                    return res.end(JSON.stringify(normalizeGoals()));
                }
                try {
                    const parsed = JSON.parse(data);
                    res.writeHead(200, goalHeaders);
                    res.end(JSON.stringify(normalizeGoals(parsed)));
                } catch {
                    res.writeHead(200, goalHeaders);
                    res.end(JSON.stringify(normalizeGoals()));
                }
            });
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const cleaned = normalizeGoals(parsed);
                    fs.writeFile(GOALS_FILE, JSON.stringify(cleaned, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, goalHeaders);
                        res.end(JSON.stringify({ success: !err, goals: cleaned }));
                    });
                } catch {
                    res.writeHead(400, goalHeaders);
                    res.end(JSON.stringify({ success: false }));
                }
            });
        }
    } else if (req.url === '/api/dreams') {
        if (req.method === 'GET') {
            const dreams = readJsonFile(DREAMS_FILE, { items: [] });
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            return res.end(JSON.stringify({ items: Array.isArray(dreams.items) ? dreams.items : [] }));
        }
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const dreams = readJsonFile(DREAMS_FILE, { items: [] });
                    const items = Array.isArray(dreams.items) ? dreams.items : [];
                    const nextItem = {
                        id: incoming.id || `dream-${Date.now()}`,
                        description: String(incoming.description || '').trim(),
                        url: String(incoming.url || '').trim(),
                        createdAt: incoming.createdAt || new Date().toISOString()
                    };
                    if (!nextItem.description) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Description is required' }));
                    }
                    const next = { items: [nextItem, ...items] };
                    fs.writeFile(DREAMS_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
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
    } else if (req.url.match(/^\/api\/dreams\/[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'PUT' || req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const dreams = readJsonFile(DREAMS_FILE, { items: [] });
                    const items = Array.isArray(dreams.items) ? dreams.items : [];
                    const target = items.find(item => item.id === id);
                    if (!target) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Dream not found' }));
                    }
                    target.description = String(incoming.description || '').trim();
                    target.url = String(incoming.url || '').trim();
                    target.updatedAt = new Date().toISOString();
                    if (!target.description) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Description is required' }));
                    }
                    fs.writeFile(DREAMS_FILE, JSON.stringify({ items }, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err, item: target, items }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
                }
            });
            return;
        }
        if (req.method === 'DELETE') {
            const dreams = readJsonFile(DREAMS_FILE, { items: [] });
            const items = Array.isArray(dreams.items) ? dreams.items : [];
            const remaining = items.filter(item => item.id !== id);
            fs.writeFile(DREAMS_FILE, JSON.stringify({ items: remaining }, null, 2) + '\n', (err) => {
                res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: !err, items: remaining }));
            });
            return;
        }
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    } else if (req.url === '/api/business-ideas') {
        if (req.method === 'GET') {
            const ideas = readJsonFile(BUSINESS_IDEAS_FILE, { items: [] });
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            return res.end(JSON.stringify({ items: Array.isArray(ideas.items) ? ideas.items : [] }));
        }
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const ideas = readJsonFile(BUSINESS_IDEAS_FILE, { items: [] });
                    const items = Array.isArray(ideas.items) ? ideas.items : [];
                    const rank = Math.max(1, Math.floor(Number(incoming.rank) || items.length + 1));
                    const nextItem = {
                        id: incoming.id || `business-idea-${Date.now()}`,
                        idea: String(incoming.idea || '').trim(),
                        date: String(incoming.date || new Date().toISOString().slice(0, 10)).trim(),
                        source: String(incoming.source || '').trim(),
                        rank,
                        createdAt: incoming.createdAt || new Date().toISOString()
                    };
                    if (!nextItem.idea || !nextItem.date || !nextItem.source) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Idea, date and where you thought of it are required' }));
                    }
                    const ordered = [...items].sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
                    ordered.splice(Math.min(rank - 1, ordered.length), 0, nextItem);
                    const next = { items: ordered.map((item, index) => ({ ...item, rank: index + 1 })) };
                    fs.writeFile(BUSINESS_IDEAS_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err, item: next.items.find(item => item.id === nextItem.id), items: next.items }));
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
    } else if (req.url.match(/^\/api\/business-ideas\/(?!reorder$)[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'PUT' || req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const ideas = readJsonFile(BUSINESS_IDEAS_FILE, { items: [] });
                    const items = Array.isArray(ideas.items) ? ideas.items : [];
                    const target = items.find(item => item.id === id);
                    if (!target) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Business idea not found' }));
                    }
                    target.idea = String(incoming.idea || '').trim();
                    target.date = String(incoming.date || '').trim();
                    target.source = String(incoming.source || '').trim();
                    target.rank = Math.max(1, Math.floor(Number(incoming.rank) || target.rank || 1));
                    target.updatedAt = new Date().toISOString();
                    if (!target.idea || !target.date || !target.source) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Idea, date and where you thought of it are required' }));
                    }
                    const otherItems = items.filter(item => item.id !== id).sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
                    otherItems.splice(Math.min(target.rank - 1, otherItems.length), 0, target);
                    const nextItems = otherItems.map((item, index) => ({ ...item, rank: index + 1 }));
                    fs.writeFile(BUSINESS_IDEAS_FILE, JSON.stringify({ items: nextItems }, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err, item: nextItems.find(item => item.id === id), items: nextItems }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
                }
            });
            return;
        }
        if (req.method === 'DELETE') {
            const ideas = readJsonFile(BUSINESS_IDEAS_FILE, { items: [] });
            const items = Array.isArray(ideas.items) ? ideas.items : [];
            const remaining = items.filter(item => item.id !== id);
            const nextItems = remaining.sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999)).map((item, index) => ({ ...item, rank: index + 1 }));
            fs.writeFile(BUSINESS_IDEAS_FILE, JSON.stringify({ items: nextItems }, null, 2) + '\n', (err) => {
                res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: !err, items: nextItems }));
            });
            return;
        }
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    } else if (req.url === '/api/business-ideas/reorder' && req.method === 'POST') {
        readBody(req, (body) => {
            try {
                const incoming = JSON.parse(body || '{}');
                const ids = Array.isArray(incoming.ids) ? incoming.ids.map(String) : [];
                const ideas = readJsonFile(BUSINESS_IDEAS_FILE, { items: [] });
                const items = Array.isArray(ideas.items) ? ideas.items : [];
                const byId = new Map(items.map(item => [item.id, item]));
                const ordered = ids.map(id => byId.get(id)).filter(Boolean);
                items.forEach(item => { if (!ordered.some(orderedItem => orderedItem.id === item.id)) ordered.push(item); });
                const nextItems = ordered.map((item, index) => ({ ...item, rank: index + 1, updatedAt: new Date().toISOString() }));
                fs.writeFile(BUSINESS_IDEAS_FILE, JSON.stringify({ items: nextItems }, null, 2) + '\n', (err) => {
                    res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: !err, items: nextItems }));
                });
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
        return;
    } else if (req.url.startsWith('/api/youtube/checklist')) {
        const queryIdx = req.url.indexOf('?');
        const queryParams = new URLSearchParams(queryIdx !== -1 ? req.url.slice(queryIdx) : '');
        const scriptPath = queryParams.get('path');
        const defaultChecklist = [
            'Subtitles',
            'Music',
            'Sound design',
            'Audio mixing',
            'Audio Processing (Auphonic)',
            'A Roll Compound Clip',
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

        const YOUTUBE_SKILL_DIR = YOUTUBE_REFERENCES_DIR;
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
    } else if (req.url === '/api/youtube/add' && req.method === 'POST') {
        handleCsvAddPost(req, res, YOUTUBE_CSV, YOUTUBE_PRIORITY_FILE, 7);
    } else if (req.url === '/api/youtube/rename' && req.method === 'POST') {
        handleCsvRenamePost(req, res, YOUTUBE_CSV, YOUTUBE_PRIORITY_FILE);
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
    } else if (req.url === '/api/youtube/delete' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { title } = JSON.parse(body || '{}');
                if (!title) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
                }
                fs.readFile(YOUTUBE_CSV, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Failed to read planner file' }));
                    }
                    const lines = data.split('\n').filter(l => l.trim());
                    if (lines.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Planner file is empty' }));
                    }

                    const parseLine = (line) => {
                        const row = [];
                        let inQ = false, curr = '';
                        for (let i = 0; i < line.length; i++) {
                            if (line[i] === '"') inQ = !inQ;
                            else if (line[i] === ',' && !inQ) { row.push(curr); curr = ''; }
                            else curr += line[i];
                        }
                        row.push(curr);
                        return row;
                    };

                    const remaining = [lines[0]];
                    let deleted = false;
                    for (let i = 1; i < lines.length; i++) {
                        const row = parseLine(lines[i]);
                        if (row[0]?.trim() === title) {
                            deleted = true;
                            continue;
                        }
                        remaining.push(lines[i]);
                    }

                    if (!deleted) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Video not found' }));
                    }

                    fs.writeFile(YOUTUBE_CSV, remaining.join('\n') + '\n', (writeErr) => {
                        res.writeHead(writeErr ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !writeErr }));
                    });
                });
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
    } else if (req.url === '/api/youtube/priority' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { title, slot } = JSON.parse(body || '{}');
                const normalised = normaliseTitle(title || '');
                if (!normalised) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
                }
                const cleanSlot = ['1', '2', '3', '4', '5', '6', '7'].includes(String(slot || '')) ? String(slot) : '';
                const current = readJsonFile(YOUTUBE_PRIORITY_FILE, { assignments: {} });
                const assignments = { ...(current.assignments || {}) };
                Object.keys(assignments).forEach(key => {
                    if (assignments[key] === normalised || key === cleanSlot) delete assignments[key];
                });
                if (cleanSlot) assignments[cleanSlot] = normalised;
                const next = { assignments };
                fs.writeFile(YOUTUBE_PRIORITY_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
                    res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: !err, assignments }));
                });
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
    } else if (req.url === '/api/nutrition') {
        fs.readFile(NUTRITION_DAILY_MACROS_FILE, 'utf8', (err, data) => {
            const results = err ? processNutritionData('') : processNutritionData(data || '');
            results.mealPlan = processNutritionMealPlan(readTextFileSafe(JORGE_NUTRITION_PLAN_FILE));
            results.macroTargets = processNutritionMacroTargets(readTextFileSafe(JORGE_NUTRITION_MACROS_FILE));
            results.weeklySchedule = processNutritionWeeklySchedule(readTextFileSafe(JORGE_NUTRITION_SCHEDULE_FILE));
            results.foodDatabase = processNutritionFoodDatabase(readTextFileSafe(NUTRITION_FOOD_DATABASE_FILE));
            results.recipeDatabase = processNutritionRecipeDatabase(readTextFileSafe(NUTRITION_RECIPE_DATABASE_FILE));
            results.foodLog = processNutritionFoodLog(readTextFileSafe(NUTRITION_DAILY_FOOD_LOG_FILE));
            if (results.foodLog.dailyTotals.length) {
                const dailyTotals = results.foodLog.dailyTotals;
                const last7 = dailyTotals.slice(-7);
                const average = key => Math.round((last7.reduce((total, row) => total + Number(row[key] || 0), 0) / last7.length) * 10) / 10;
                results.rows = dailyTotals;
                results.chartRows = dailyTotals.slice(-30);
                results.summary = {
                    count: dailyTotals.length,
                    latest: dailyTotals[dailyTotals.length - 1],
                    firstDate: dailyTotals[0].date,
                    latestDate: dailyTotals[dailyTotals.length - 1].date,
                    last7Average: {
                        calories: average('calories'),
                        protein: average('protein'),
                        fat: average('fat'),
                        carbs: average('carbs')
                    }
                };
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        });
    } else if (req.url === '/api/nutrition/food-database') {
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const entry = upsertNutritionFoodDatabaseEntry(JSON.parse(body || '{}'));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, entry, foodDatabase: processNutritionFoodDatabase(readTextFileSafe(NUTRITION_FOOD_DATABASE_FILE)) }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save food database item' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url.match(/^\/api\/nutrition\/food-database\/[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'DELETE') {
            try {
                const removed = deleteNutritionFoodDatabaseEntry(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, removed, foodDatabase: processNutritionFoodDatabase(readTextFileSafe(NUTRITION_FOOD_DATABASE_FILE)) }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to delete food database item' }));
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url === '/api/nutrition/recipe-database') {
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const entry = upsertNutritionRecipeDatabaseEntry(JSON.parse(body || '{}'));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, entry, recipeDatabase: processNutritionRecipeDatabase(readTextFileSafe(NUTRITION_RECIPE_DATABASE_FILE)) }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save recipe database item' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url.match(/^\/api\/nutrition\/recipe-database\/[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'DELETE') {
            try {
                const removed = deleteNutritionRecipeDatabaseEntry(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, removed, recipeDatabase: processNutritionRecipeDatabase(readTextFileSafe(NUTRITION_RECIPE_DATABASE_FILE)) }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to delete recipe database item' }));
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url === '/api/nutrition/food-log') {
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const entry = upsertNutritionFoodLogEntry(JSON.parse(body || '{}'));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, entry, foodLog: processNutritionFoodLog(readTextFileSafe(NUTRITION_DAILY_FOOD_LOG_FILE)) }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save food entry' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url.match(/^\/api\/nutrition\/food-log\/[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'DELETE') {
            try {
                const removed = deleteNutritionFoodLogEntry(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, removed, foodLog: processNutritionFoodLog(readTextFileSafe(NUTRITION_DAILY_FOOD_LOG_FILE)) }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to delete food entry' }));
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url === '/api/biomarkers') {
        const biomarkers = readJsonFile(BIOMARKERS_FILE, { markers: [], error: 'Biomarker log not found' });
        biomarkers.summary = processBiomarkerSummary(biomarkers);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(biomarkers));
    } else if (req.url === '/api/workouts/session') {
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const saved = upsertWorkoutSession(JSON.parse(body || '{}'));
                    const results = processWorkoutData(
                        readTextFileSafe(WORKOUT_LOGS_FILE),
                        readTextFileSafe(WORKOUT_PLAN_FILE),
                        readTextFileSafe(WORKOUT_PLAN_CSV_FILE)
                    );
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, saved, ...results }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save workout session' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (req.url === '/api/workouts') {
        fs.readFile(WORKOUT_LOGS_FILE, 'utf8', (err, data) => {
            fs.readFile(WEIGHT_LOGS_FILE, 'utf8', (_weightErr, weightCsv) => {
                if (err) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ rows: [], sessions: [], exercises: [], summary: {}, weight: processWeightData(weightCsv || ''), error: 'Workout logs not found' }));
                }
                fs.readFile(WORKOUT_PLAN_FILE, 'utf8', (_planErr, plan) => {
                    fs.readFile(WORKOUT_PLAN_CSV_FILE, 'utf8', (_planCsvErr, planCsv) => {
                        const results = { ...processWorkoutData(data, plan || '', planCsv || ''), weight: processWeightData(weightCsv || '') };
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(results));
                    });
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
        const { items } = readCsvObjects(PERSONAL_CRM_FILE, 'Name');
        const team = items.filter(isYouTubeTeamMember);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ team }));
    } else if (requestPath === '/api/people' && req.method === 'GET') {
        const people = readPeople().items.map(enrichPerson);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ people }));
    } else if (requestPath === '/api/people' && req.method === 'POST') {
        handlePeopleCreate(req, res);
    } else if (/^\/api\/people\/\d+$/.test(requestPath) && req.method === 'PUT') {
        handlePeopleUpdate(req, res, Number(requestPath.split('/').pop()));
    } else if (/^\/api\/people\/\d+$/.test(requestPath) && req.method === 'DELETE') {
        handlePeopleDelete(res, Number(requestPath.split('/').pop()));
    } else if (/^\/api\/people\/\d+\/contact$/.test(requestPath) && req.method === 'POST') {
        handlePeopleContact(req, res, Number(requestPath.split('/')[3]));
    } else if (req.url === '/api/youtube/team/update' && req.method === 'POST') {
        handleYouTubeTeamUpdate(req, res);
    } else if (req.url === '/api/youtube/team/delete' && req.method === 'POST') {
        handleYouTubeTeamDelete(req, res);
    } else if (req.url === '/api/youtube/competitors' && req.method === 'POST') {
        readBody(req, (body) => {
            try {
                const incoming = JSON.parse(body || '{}');
                const name = String(incoming.name || '').trim();
                const url = String(incoming.url || '').trim();
                const handle = String(incoming.handle || '').trim();
                const notes = String(incoming.notes || '').trim();
                if (!name || !url) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Channel name and URL are required' }));
                }
                const data = readJsonFile(YOUTUBE_COMPETITORS_FILE, { competitors: [] });
                const competitors = Array.isArray(data.competitors) ? data.competitors : [];
                const normalisedUrl = url.replace(/\/$/, '').toLowerCase();
                if (competitors.some(item => String(item.url || '').replace(/\/$/, '').toLowerCase() === normalisedUrl)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'This channel is already saved' }));
                }
                fs.mkdirSync(YOUTUBE_COMPETITORS_DIR, { recursive: true });
                const competitor = { name, url, handle, notes };
                const next = { ...data, competitors: [competitor, ...competitors] };
                fs.writeFile(YOUTUBE_COMPETITORS_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
                    res.writeHead(err ? 500 : 201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: !err, competitor, competitors: next.competitors }));
                });
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
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
    } else if (req.url === '/api/youtube/shorts/add' && req.method === 'POST') {
        handleCsvAddPost(req, res, YOUTUBE_SHORTS_CSV, YOUTUBE_SHORTS_PRIORITY_FILE);
    } else if (req.url === '/api/youtube/shorts/rename' && req.method === 'POST') {
        handleCsvRenamePost(req, res, YOUTUBE_SHORTS_CSV, YOUTUBE_SHORTS_PRIORITY_FILE);
    } else if (req.url === '/api/youtube/shorts/status' && req.method === 'POST') {
        handleCsvStatusPost(req, res, YOUTUBE_SHORTS_CSV);
    } else if (req.url === '/api/youtube/shorts/delete' && req.method === 'POST') {
        handleCsvDeletePost(req, res, YOUTUBE_SHORTS_CSV);
    } else if (req.url === '/api/youtube/shorts/priority' && req.method === 'POST') {
        handlePriorityPost(req, res, YOUTUBE_SHORTS_PRIORITY_FILE);
    } else if (req.url === '/api/youtube/shorts') {
        const { items } = readCsvObjects(YOUTUBE_SHORTS_CSV);
        const priorityAssignments = readJsonFile(YOUTUBE_SHORTS_PRIORITY_FILE, { assignments: {} }).assignments || {};
        const slotByTitle = new Map(Object.entries(priorityAssignments).map(([slot, key]) => [key, slot]));
        const shorts = items.map(item => ({
            ...item,
            prioritySlot: slotByTitle.get(normaliseTitle(item['Video Title'])) || ''
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ shorts }));
    } else if (req.url === '/api/instagram/reels/add' && req.method === 'POST') {
        ensureInstagramReelsFile();
        handleCsvAddPost(req, res, INSTAGRAM_REELS_CSV, INSTAGRAM_REELS_PRIORITY_FILE);
    } else if (req.url === '/api/instagram/reels/rename' && req.method === 'POST') {
        ensureInstagramReelsFile();
        handleCsvRenamePost(req, res, INSTAGRAM_REELS_CSV, INSTAGRAM_REELS_PRIORITY_FILE);
    } else if (req.url === '/api/instagram/reels/update' && req.method === 'POST') {
        ensureInstagramReelsFile();
        handleCsvUpdatePost(req, res, INSTAGRAM_REELS_CSV, INSTAGRAM_REELS_PRIORITY_FILE);
    } else if (req.url === '/api/instagram/reels/status' && req.method === 'POST') {
        ensureInstagramReelsFile();
        handleCsvStatusPost(req, res, INSTAGRAM_REELS_CSV);
    } else if (req.url === '/api/instagram/reels/delete' && req.method === 'POST') {
        ensureInstagramReelsFile();
        handleCsvDeletePost(req, res, INSTAGRAM_REELS_CSV);
    } else if (req.url === '/api/instagram/reels/priority' && req.method === 'POST') {
        handlePriorityPost(req, res, INSTAGRAM_REELS_PRIORITY_FILE);
    } else if (req.url === '/api/instagram/reels') {
        ensureInstagramReelsFile();
        const { items } = readCsvObjects(INSTAGRAM_REELS_CSV);
        const priorityAssignments = readJsonFile(INSTAGRAM_REELS_PRIORITY_FILE, { assignments: {} }).assignments || {};
        const slotByTitle = new Map(Object.entries(priorityAssignments).map(([slot, key]) => [key, slot]));
        const reels = items.map(item => ({
            ...item,
            prioritySlot: slotByTitle.get(normaliseTitle(item['Video Title'])) || ''
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reels }));
    } else if (req.url === '/api/instagram/ideas') {
        if (req.method === 'GET') {
            const ideas = readJsonFile(INSTAGRAM_IDEAS_FILE, { items: [] });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ items: Array.isArray(ideas.items) ? ideas.items : [] }));
        }
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const ideas = readJsonFile(INSTAGRAM_IDEAS_FILE, { items: [] });
                    const items = Array.isArray(ideas.items) ? ideas.items : [];
                    const nextItem = {
                        id: incoming.id || `instagram-idea-${Date.now()}`,
                        type: String(incoming.type || 'inspiration').trim() || 'inspiration',
                        title: String(incoming.title || '').trim(),
                        notes: String(incoming.notes || '').trim(),
                        createdAt: incoming.createdAt || new Date().toISOString()
                    };
                    if (!nextItem.title) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
                    }
                    const next = { items: [nextItem, ...items] };
                    fs.writeFile(INSTAGRAM_IDEAS_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
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
    } else if (req.url.match(/^\/api\/instagram\/ideas\/[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'PUT' || req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const ideas = readJsonFile(INSTAGRAM_IDEAS_FILE, { items: [] });
                    const items = Array.isArray(ideas.items) ? ideas.items : [];
                    const target = items.find(item => item.id === id);
                    if (!target) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Idea not found' }));
                    }
                    target.type = String(incoming.type || target.type || 'inspiration').trim() || 'inspiration';
                    target.title = String(incoming.title || '').trim();
                    target.notes = String(incoming.notes || '').trim();
                    target.updatedAt = new Date().toISOString();
                    if (!target.title) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
                    }
                    fs.writeFile(INSTAGRAM_IDEAS_FILE, JSON.stringify({ items }, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err, item: target, items }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
                }
            });
            return;
        }
        if (req.method === 'DELETE') {
            const ideas = readJsonFile(INSTAGRAM_IDEAS_FILE, { items: [] });
            const items = Array.isArray(ideas.items) ? ideas.items : [];
            const remaining = items.filter(item => item.id !== id);
            fs.writeFile(INSTAGRAM_IDEAS_FILE, JSON.stringify({ items: remaining }, null, 2) + '\n', (err) => {
                res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: !err, items: remaining }));
            });
            return;
        }
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    } else if (req.url === '/api/instagram/accounts') {
        if (req.method === 'GET') {
            const accounts = readJsonFile(INSTAGRAM_ACCOUNTS_FILE, { items: [] });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ items: Array.isArray(accounts.items) ? accounts.items : [] }));
        }
        if (req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const accounts = readJsonFile(INSTAGRAM_ACCOUNTS_FILE, { items: [] });
                    const items = Array.isArray(accounts.items) ? accounts.items : [];
                    const handle = String(incoming.handle || '').trim();
                    const nextItem = {
                        id: incoming.id || `instagram-account-${Date.now()}`,
                        handle,
                        url: String(incoming.url || '').trim(),
                        niche: String(incoming.niche || '').trim(),
                        notes: String(incoming.notes || '').trim(),
                        createdAt: incoming.createdAt || new Date().toISOString()
                    };
                    if (!nextItem.handle) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Handle is required' }));
                    }
                    const normalised = nextItem.handle.replace(/^@/, '').toLowerCase();
                    if (items.some(item => String(item.handle || '').replace(/^@/, '').toLowerCase() === normalised)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'This account is already saved' }));
                    }
                    const next = { items: [nextItem, ...items] };
                    fs.writeFile(INSTAGRAM_ACCOUNTS_FILE, JSON.stringify(next, null, 2) + '\n', (err) => {
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
    } else if (req.url.match(/^\/api\/instagram\/accounts\/[^/]+$/)) {
        const id = decodeURIComponent(req.url.split('/').pop());
        if (req.method === 'PUT' || req.method === 'POST') {
            readBody(req, (body) => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    const accounts = readJsonFile(INSTAGRAM_ACCOUNTS_FILE, { items: [] });
                    const items = Array.isArray(accounts.items) ? accounts.items : [];
                    const target = items.find(item => item.id === id);
                    if (!target) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Account not found' }));
                    }
                    const handle = String(incoming.handle || '').trim();
                    if (!handle) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Handle is required' }));
                    }
                    const normalised = handle.replace(/^@/, '').toLowerCase();
                    if (items.some(item => item.id !== id && String(item.handle || '').replace(/^@/, '').toLowerCase() === normalised)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'This account is already saved' }));
                    }
                    target.handle = handle;
                    target.url = String(incoming.url || '').trim();
                    target.niche = String(incoming.niche || '').trim();
                    target.notes = String(incoming.notes || '').trim();
                    target.updatedAt = new Date().toISOString();
                    fs.writeFile(INSTAGRAM_ACCOUNTS_FILE, JSON.stringify({ items }, null, 2) + '\n', (err) => {
                        res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !err, item: target, items }));
                    });
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
                }
            });
            return;
        }
        if (req.method === 'DELETE') {
            const accounts = readJsonFile(INSTAGRAM_ACCOUNTS_FILE, { items: [] });
            const items = Array.isArray(accounts.items) ? accounts.items : [];
            const remaining = items.filter(item => item.id !== id);
            fs.writeFile(INSTAGRAM_ACCOUNTS_FILE, JSON.stringify({ items: remaining }, null, 2) + '\n', (err) => {
                res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: !err, items: remaining }));
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
            const priorityAssignments = readJsonFile(YOUTUBE_PRIORITY_FILE, { assignments: {} }).assignments || {};
            const slotByTitle = new Map(Object.entries(priorityAssignments).map(([slot, key]) => [key, slot]));
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
                obj.prioritySlot = slotByTitle.get(normaliseTitle(obj['Video Title'])) || '';
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
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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

function readTextFileSafe(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf8');
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

function csvRowsToObjects(rows = [], titleColumn = 'Video Title') {
    if (rows.length <= 1) return { headers: rows[0] || [], items: [] };
    const headers = rows[0].map(h => String(h).trim());
    const items = rows.slice(1).map((cols, index) => {
        const obj = { _index: index };
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return obj;
    }).filter(row => !titleColumn || row[titleColumn]);
    return { headers, items };
}

function isYouTubeTeamMember(member = {}) {
    const tags = String(member['Role/Tags'] || '').toLowerCase();
    return Boolean(member['Name'] && (tags.includes('video') || tags.includes('thumbnail') || tags.includes('youtube')));
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

const LINKEDIN_JOB_STATUSES = ['new', 'saved', 'applied', 'interview', 'rejected', 'ignored'];
const YTJOBS_STATUSES = ['new', 'interested', 'not_interested', 'applied'];
const YTJOBS_TALENT_STATUSES = ['new', 'interested', 'contacted', 'replied', 'feedback_booked', 'not_fit'];

function normalizeLinkedInJobStatus(status = 'new') {
    const clean = String(status || 'new').toLowerCase();
    return LINKEDIN_JOB_STATUSES.includes(clean) ? clean : 'new';
}

function normalizeYtJobStatus(status = 'new') {
    const clean = String(status || 'new').toLowerCase();
    return YTJOBS_STATUSES.includes(clean) ? clean : 'new';
}

function normalizeYtJobsTalentStatus(status = 'new') {
    const clean = String(status || 'new').toLowerCase();
    return YTJOBS_TALENT_STATUSES.includes(clean) ? clean : 'new';
}

function readLinkedInJobsDb() {
    try {
        const parsed = JSON.parse(fs.readFileSync(LINKEDIN_JOBS_DB_FILE, 'utf8'));
        return {
            jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
            rawEmails: Array.isArray(parsed.rawEmails) ? parsed.rawEmails : []
        };
    } catch {
        return { jobs: [], rawEmails: [] };
    }
}

function writeLinkedInJobsDb(db) {
    fs.writeFileSync(LINKEDIN_JOBS_DB_FILE, JSON.stringify({
        jobs: Array.isArray(db.jobs) ? db.jobs : [],
        rawEmails: Array.isArray(db.rawEmails) ? db.rawEmails.slice(-100) : []
    }, null, 2) + '\n');
}

function readYtJobsDb() {
    try {
        const parsed = JSON.parse(fs.readFileSync(YTJOBS_DB_FILE, 'utf8'));
        return {
            source: parsed.source || 'YTJobs',
            source_url: parsed.source_url || 'https://ytjobs.co/',
            searched_at: parsed.searched_at || '',
            source_total_jobs: Number(parsed.source_total_jobs || 0),
            filter_notes: parsed.filter_notes || '',
            jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
        };
    } catch {
        return {
            source: 'YTJobs',
            source_url: 'https://ytjobs.co/',
            searched_at: '',
            source_total_jobs: 0,
            filter_notes: '',
            jobs: []
        };
    }
}

function writeYtJobsDb(db) {
    fs.writeFileSync(YTJOBS_DB_FILE, JSON.stringify({
        source: db.source || 'YTJobs',
        source_url: db.source_url || 'https://ytjobs.co/',
        searched_at: db.searched_at || '',
        source_total_jobs: Number(db.source_total_jobs || 0),
        filter_notes: db.filter_notes || '',
        jobs: Array.isArray(db.jobs) ? db.jobs : []
    }, null, 2) + '\n');
}

function updateYtJobStatus(id, status) {
    const db = readYtJobsDb();
    const job = db.jobs.find(item => item.id === id);
    if (!job) throw new Error('YTJobs role not found');
    job.status = normalizeYtJobStatus(status);
    job.updated_at = new Date().toISOString();
    writeYtJobsDb(db);
    return job;
}

function getYtJobsTalentId(talent) {
    const url = String(talent?.profileUrl || talent?.url || '');
    const match = url.match(/\/talent\/profile\/([^/?#]+)/);
    return talent?.id || (match ? match[1] : '');
}

function normalizeYtJobsTalent(talent, group) {
    const id = String(getYtJobsTalentId(talent));
    return {
        ...talent,
        id,
        group,
        status: normalizeYtJobsTalentStatus(talent.status),
        updated_at: talent.updated_at || ''
    };
}

function readYtJobsTalentDb() {
    try {
        const parsed = JSON.parse(fs.readFileSync(YTJOBS_TALENT_FILE, 'utf8'));
        const walesMatches = Array.isArray(parsed.wales_matches) ? parsed.wales_matches.map(item => normalizeYtJobsTalent(item, 'Wales')) : [];
        const ukMatches = Array.isArray(parsed.uk_matches) ? parsed.uk_matches.map(item => normalizeYtJobsTalent(item, 'UK')) : [];
        const globalMatches = Array.isArray(parsed.top_global_talking_head_matches) ? parsed.top_global_talking_head_matches.map(item => normalizeYtJobsTalent(item, 'Global')) : [];
        return {
            ...parsed,
            wales_matches: walesMatches,
            uk_matches: ukMatches,
            top_global_talking_head_matches: globalMatches,
            talents: [...walesMatches, ...ukMatches, ...globalMatches]
        };
    } catch {
        return {
            generated_at: '',
            source: 'YTJobs',
            scanned_ranked_profiles: 0,
            total_candidates: 0,
            explicit_talking_head_candidates: 0,
            adjacent_candidates: 0,
            location_note: '',
            wales_matches: [],
            uk_matches: [],
            top_global_talking_head_matches: [],
            talents: []
        };
    }
}

function writeYtJobsTalentDb(db) {
    const serializable = { ...db };
    delete serializable.talents;
    fs.writeFileSync(YTJOBS_TALENT_FILE, JSON.stringify(serializable, null, 2) + '\n');
}

function updateYtJobsTalentStatus(id, status) {
    const db = readYtJobsTalentDb();
    const groups = ['wales_matches', 'uk_matches', 'top_global_talking_head_matches'];
    let talent = null;
    for (const group of groups) {
        talent = db[group].find(item => String(item.id) === String(id));
        if (talent) break;
    }
    if (!talent) throw new Error('YTJobs talent not found');
    talent.status = normalizeYtJobsTalentStatus(status);
    talent.updated_at = new Date().toISOString();
    writeYtJobsTalentDb(db);
    return talent;
}

function readPropertyDealsDb() {
    try {
        const parsed = JSON.parse(fs.readFileSync(PROPERTY_DEALS_DB_FILE, 'utf8'));
        return { deals: Array.isArray(parsed.deals) ? parsed.deals : [] };
    } catch {
        return { deals: [] };
    }
}

function writePropertyDealsDb(db) {
    fs.writeFileSync(PROPERTY_DEALS_DB_FILE, JSON.stringify({
        deals: Array.isArray(db.deals) ? db.deals : []
    }, null, 2) + '\n');
}

function readPropertyTrackerSeen() {
    try {
        const parsed = JSON.parse(fs.readFileSync(PROPERTY_TRACKER_STATE_FILE, 'utf8'));
        return Array.isArray(parsed.seen) ? parsed.seen : [];
    } catch {
        return [];
    }
}

function syncPropertyDealsFromTracker() {
    const db = readPropertyDealsDb();
    const existingById = new Map(db.deals.map(deal => [deal.id, deal]));
    const listingKey = item => {
        const address = String(item.address || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const price = propertyPriceNumber(item.price);
        const bedrooms = Number(item.bedrooms || 0);
        return address && price ? `${address}|${price}|${bedrooms}` : '';
    };
    const existingListingKeys = new Set(db.deals.map(listingKey).filter(Boolean));
    let changed = false;
    for (const item of readPropertyTrackerSeen()) {
        const id = String(item.id || item.url || '').trim();
        const key = listingKey(item);
        if (!id || existingById.has(id) || (key && existingListingKeys.has(key))) continue;
        const deal = {
            id,
            url: String(item.url || '').trim(),
            source: String(item.source || 'Unknown').trim(),
            address: String(item.address || 'Address unknown').trim(),
            price: String(item.price || '').trim(),
            bedrooms: Number(item.bedrooms || 0),
            found: String(item.found || '').trim(),
            status: 'outstanding',
            reviewed: false,
            reviewed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.deals.push(deal);
        existingById.set(id, deal);
        if (key) existingListingKeys.add(key);
        changed = true;
    }
    db.deals.sort((a, b) => {
        if (Boolean(a.reviewed) !== Boolean(b.reviewed)) return a.reviewed ? 1 : -1;
        const priceDelta = propertyPriceNumber(b.price) - propertyPriceNumber(a.price);
        if (priceDelta) return priceDelta;
        return String(a.address || '').localeCompare(String(b.address || ''));
    });
    if (changed) writePropertyDealsDb(db);
    return db;
}

function propertyPriceNumber(price = '') {
    return Number(String(price || '').replace(/[^0-9.]/g, '')) || 0;
}

function updatePropertyDealReviewed(id, reviewed) {
    const db = syncPropertyDealsFromTracker();
    const deal = db.deals.find(item => item.id === id);
    if (!deal) throw new Error('Property deal not found');
    deal.reviewed = reviewed;
    deal.status = reviewed ? 'reviewed' : 'outstanding';
    deal.reviewed_at = reviewed ? new Date().toISOString() : null;
    deal.updated_at = new Date().toISOString();
    writePropertyDealsDb(db);
    return deal;
}

function updatePropertyDealWorkflow(id, payload = {}) {
    const db = syncPropertyDealsFromTracker();
    const deal = db.deals.find(item => item.id === id);
    if (!deal) throw new Error('Property deal not found');
    const allowedStatuses = ['active', 'good', 'not_interested'];
    const allowedTags = ['research', 'called', 'viewing_organised', 'offer_made'];
    if (payload.status !== undefined) {
        if (!allowedStatuses.includes(payload.status)) throw new Error('Invalid property status');
        deal.deal_status = payload.status;
        deal.status = payload.status;
        deal.archived_at = payload.status === 'not_interested' ? new Date().toISOString() : null;
    }
    if (payload.tags !== undefined) {
        if (!Array.isArray(payload.tags)) throw new Error('Tags must be an array');
        deal.tags = [...new Set(payload.tags.filter(tag => allowedTags.includes(tag)))];
    }
    deal.updated_at = new Date().toISOString();
    writePropertyDealsDb(db);
    return deal;
}

function cleanPropertyNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function cleanPropertyInputs(inputs = {}) {
    const allowed = [
        'purchase_price',
        'room_rate',
        'achievable_rent',
        'deposit_pct',
        'tax_legals_pct',
        'renovation',
        'furnishing_dressing',
        'finders_fee',
        'mortgage_interest_pct',
        'management_fee_pct',
        'maintenance_voids_pct',
        'target_roi_pct',
        'opening_offer_discount_pct',
        'utilities',
        'wifi',
        'council_tax'
    ];
    return allowed.reduce((acc, key) => {
        acc[key] = cleanPropertyNumber(inputs[key]);
        return acc;
    }, {});
}

function updatePropertyDealAnalysis(id, payload = {}) {
    const db = syncPropertyDealsFromTracker();
    const deal = db.deals.find(item => item.id === id);
    if (!deal) throw new Error('Property deal not found');
    deal.investment_inputs = cleanPropertyInputs(payload.investment_inputs || {});
    deal.analysis = {
        ...(deal.analysis || {}),
        ...(payload.analysis && typeof payload.analysis === 'object' ? payload.analysis : {})
    };
    deal.updated_at = new Date().toISOString();
    writePropertyDealsDb(db);
    return deal;
}

function linkedinJobId() {
    return `lj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function normalizeLinkedInUrl(url = '') {
    const clean = String(url || '').replace(/&amp;/g, '&').trim();
    if (!clean) return '';
    try {
        const parsed = new URL(clean);
        if (!/linkedin\.com$/i.test(parsed.hostname) && !/\.linkedin\.com$/i.test(parsed.hostname)) return clean;
        const jobId = parsed.pathname.match(/\/jobs\/view\/(\d+)/i)?.[1] || parsed.searchParams.get('currentJobId');
        return jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : `${parsed.origin}${parsed.pathname}`;
    } catch {
        return clean;
    }
}

function stripHtml(html = '') {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function compactReadableText(text = '', maxLength = 6000) {
    return String(text || '')
        .replace(/[\u200B-\u200F\uFEFF]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
        .slice(0, maxLength);
}

async function fetchPublicPageText(url, maxLength = 6000) {
    if (!url) return '';
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        if (!response.ok) return '';
        const html = await response.text();
        const metaDescription = (html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)
            || [])[1] || '';
        const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
            .map(match => stripHtml(match[1] || ''))
            .join('\n');
        return compactReadableText(`${metaDescription}\n${jsonLdBlocks}\n${stripHtml(html)}`, maxLength);
    } catch (err) {
        console.error(`Failed to fetch public page text from ${url}:`, err.message || err);
        return '';
    }
}

async function fetchPhilCvText() {
    return fetchPublicPageText(process.env.PHIL_CV_URL || 'https://www.phillougher.com/cv.html', 8000);
}

async function fetchLinkedInJobDescription(job) {
    const pageText = await fetchPublicPageText(job.linkedin_url, 8000);
    if (!pageText) return '';
    const title = String(job.title || '').toLowerCase();
    if (title && !pageText.toLowerCase().includes(title.slice(0, Math.min(title.length, 35)))) return '';
    return pageText;
}

function findNestedValue(obj, keys) {
    if (!obj || typeof obj !== 'object') return '';
    const stack = [obj];
    const seen = new Set();
    while (stack.length) {
        const cur = stack.shift();
        if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
        seen.add(cur);
        for (const key of Object.keys(cur)) {
            if (keys.includes(key) && cur[key] != null && typeof cur[key] !== 'object') return String(cur[key]);
            if (cur[key] && typeof cur[key] === 'object') stack.push(cur[key]);
        }
    }
    return '';
}

function extractAgentMailEmail(payload = {}) {
    const candidate = payload.message || payload.email || payload.data || payload.event?.data || payload;
    const subject = candidate.subject || findNestedValue(payload, ['subject']) || '';
    const fromRaw = candidate.from || candidate.sender || candidate.from_email || candidate.fromEmail || findNestedValue(payload, ['from_email', 'fromEmail', 'sender_email']) || '';
    const from = typeof fromRaw === 'object' ? (fromRaw.email || fromRaw.address || fromRaw.name || JSON.stringify(fromRaw)) : String(fromRaw || '');
    const html = candidate.html || candidate.html_body || candidate.body_html || findNestedValue(payload, ['html', 'html_body', 'body_html']) || '';
    const text = candidate.text || candidate.text_body || candidate.body_text || candidate.body || findNestedValue(payload, ['text', 'text_body', 'body_text']) || stripHtml(html);
    const id = candidate.id || candidate.message_id || candidate.messageId || payload.id || findNestedValue(payload, ['message_id', 'messageId']) || crypto.createHash('sha1').update(subject + from + text.slice(0, 500)).digest('hex');
    const receivedAt = candidate.received_at || candidate.receivedAt || payload.created_at || payload.createdAt || new Date().toISOString();
    return { id: String(id), subject: String(subject || ''), from, html: String(html || ''), text: String(text || ''), receivedAt };
}

function isLinkedInJobAlertEmail(email) {
    const haystack = `${email.subject}\n${email.from}\n${email.text || stripHtml(email.html)}`.toLowerCase();
    return haystack.includes('linkedin') && /(job alert|jobs? for you|new jobs?|hiring|recommended jobs?|job opportunity|jobs matching)/i.test(haystack);
}

function parseLinkedInJobAlert(email) {
    const html = email.html || '';
    const text = email.text || stripHtml(html);
    const urlMatches = [...`${html}\n${text}`.matchAll(/https?:\/\/(?:[\w.-]+\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/[^\s"'<>)]*/gi)]
        .map(m => ({ raw: m[0], url: normalizeLinkedInUrl(m[0]) }));
    const uniqueUrls = [...new Map(urlMatches.map(match => [match.url, match])).values()];
    const alertKeyword = (email.subject.match(/(?:for|alert[:\-]?|jobs?:?)\s+(.+)$/i) || [])[1]?.replace(/\s*\|\s*LinkedIn.*/i, '').trim() || '';
    const jobs = [];

    const digestLines = (stripHtml(html) || text)
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .filter(l => !/^<https?:/i.test(l) && !/^\[image:/i.test(l) && !/^act(iv)?ely recruiting|promoted|your job alert|\d+ new jobs match/i.test(l));
    const digestPairs = [];
    digestLines.forEach((line, index) => {
        if (!/\s·\s/.test(line)) return;
        const title = digestLines[index - 1] || '';
        if (!title || /forwarded message|^from:|^date:|^subject:|^to:|linkedin/i.test(title)) return;
        const [company, ...locationParts] = line.split('·').map(part => part.trim()).filter(Boolean);
        if (!company || !locationParts.length) return;
        digestPairs.push({ title, company, location: locationParts.join(' · ') });
    });
    if (digestPairs.length && uniqueUrls.length) {
        digestPairs.slice(0, uniqueUrls.length).forEach((pair, index) => {
            jobs.push({
                title: pair.title,
                company: pair.company,
                location: pair.location,
                linkedin_url: uniqueUrls[index]?.url || '',
                description: `${pair.title}\n${pair.company} · ${pair.location}`,
                salary: '',
                workplace_type: (pair.location.match(/\b(remote|hybrid|on[- ]?site|onsite)\b/i) || [])[1] || '',
                alert_keyword: alertKeyword
            });
        });
        return jobs.filter(job => job.title || job.company || job.linkedin_url);
    }

    if (uniqueUrls.length) {
        const plain = stripHtml(html) || text;
        uniqueUrls.forEach(({ raw, url }) => {
            const idx = Math.max(plain.indexOf(raw), plain.indexOf(url), 0);
            const windowText = plain.slice(Math.max(0, idx - 700), idx + 1200).replace(/\n{2,}/g, '\n').trim() || plain.slice(0, 1200);
            const lines = windowText.split('\n').map(l => l.trim()).filter(Boolean).filter(l => !/^view job|apply|linkedin|unsubscribe|act(iv)?ely recruiting|promoted$/i.test(l) && !/^<https?:/i.test(l) && !/^\[image:/i.test(l));
            const urlLineIndex = lines.findIndex(l => l.includes(raw) || l.includes(url) || /linkedin\.com\/(?:comm\/)?jobs\/view\//i.test(l));
            const afterUrl = urlLineIndex >= 0 ? lines.slice(urlLineIndex + 1) : lines;
            const firstLine = afterUrl.find(l => l.length > 3 && l.length < 140 && !/(remote|hybrid|on-site|london|united kingdom|linkedin|radar icon)/i.test(l))
                || lines.find(l => l.length > 3 && l.length < 140 && !/(remote|hybrid|on-site|london|united kingdom|linkedin|radar icon)/i.test(l)) || '';
            const titleCompany = firstLine.match(/^(.{3,100}?)\s+(?:at|@)\s+(.{2,80})$/i);
            const title = titleCompany ? titleCompany[1].trim() : firstLine;
            const company = titleCompany
                ? titleCompany[2].trim()
                : (afterUrl.find(l => l.length > 1 && l.length < 120 && /\s·\s/.test(l))?.split('·')[0]?.trim()
                    || afterUrl.slice(1).find(l => l.length > 1 && l.length < 100 && !/(remote|hybrid|on-site|london|united kingdom|ago|applicant|^£|^\$|^€|radar icon)/i.test(l)) || '');
            const location = lines.find(l => /(london|remote|hybrid|united kingdom|uk|england|wales|scotland|on-site|onsite)/i.test(l)) || '';
            const salary = (windowText.match(/(?:£|\$|€)\s?[\d,.]+\s?(?:k|K)?(?:\s?[-–]\s?(?:£|\$|€)?\s?[\d,.]+\s?(?:k|K)?)?/i) || [])[0] || '';
            const workplace = (windowText.match(/\b(remote|hybrid|on[- ]?site|onsite)\b/i) || [])[1] || '';
            jobs.push({
                title,
                company,
                location,
                linkedin_url: url,
                description: windowText.slice(0, 1500),
                salary,
                workplace_type: workplace ? workplace.replace(/onsite/i, 'on-site').replace(/on site/i, 'on-site') : '',
                alert_keyword: alertKeyword
            });
        });
    }

    if (!jobs.length) {
        const blocks = text.split(/\n{2,}|(?=\b[A-Z][\w '&.-]+\s+at\s+[A-Z])/).map(b => b.trim()).filter(Boolean);
        blocks.forEach(block => {
            if (!/(account executive|sales|business development|revenue|gtm|crm|software|saas|manager|consultant|linkedin\.com\/jobs)/i.test(block)) return;
            const titleCompany = block.match(/^(.{3,100}?)\s+(?:at|@|-|–)\s+(.{2,80}?)(?:\n|,|$)/i);
            jobs.push({
                title: titleCompany?.[1]?.trim() || '',
                company: titleCompany?.[2]?.trim() || '',
                location: (block.match(/\b(London[^\n,]*|Remote|Hybrid|United Kingdom|UK)\b/i) || [])[0] || '',
                linkedin_url: '',
                description: block.slice(0, 1500),
                salary: (block.match(/(?:£|\$|€)\s?[\d,.]+\s?(?:k|K)?(?:\s?[-–]\s?(?:£|\$|€)?\s?[\d,.]+\s?(?:k|K)?)?/i) || [])[0] || '',
                workplace_type: (block.match(/\b(remote|hybrid|on[- ]?site|onsite)\b/i) || [])[1] || '',
                alert_keyword: alertKeyword
            });
        });
    }

    return jobs.filter(job => job.title || job.company || job.linkedin_url);
}

function findExistingLinkedInJob(jobs, incoming) {
    const url = normalizeLinkedInUrl(incoming.linkedin_url);
    if (url) return jobs.find(job => normalizeLinkedInUrl(job.linkedin_url) === url);
    const key = [incoming.title, incoming.company, incoming.location].map(normaliseTitle).join('|');
    return jobs.find(job => [job.title, job.company, job.location].map(normaliseTitle).join('|') === key);
}

async function callOpenAIJson(messages, fallback) {
    if (process.env.MISSION_CONTROL_USE_OPENAI_API_KEY !== 'true') {
        try {
            return await callOpenClawOAuthJson(messages, fallback);
        } catch (err) {
            console.error('OpenClaw OAuth model call failed:', err.message || err);
        }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return fallback;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages
        })
    });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

function extractJsonObject(text = '') {
    const clean = String(text || '').trim();
    try { return JSON.parse(clean); } catch {}
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object returned');
    return JSON.parse(match[0]);
}

function callOpenClawOAuthJson(messages, fallback) {
    return new Promise((resolve, reject) => {
        const prompt = `${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}\n\nReturn valid JSON only. No markdown.`;
        const child = spawn('openclaw', [
            'agent',
            '--agent', 'linkedin-jobs-ai',
            '--model', process.env.LINKEDIN_JOBS_MODEL || 'openai-codex/gpt-5.5',
            '--message', prompt,
            '--json',
            '--timeout', '120'
        ], { env: process.env, cwd: __dirname });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error('OpenClaw OAuth model call timed out'));
        }, 130000);
        child.stdout.on('data', chunk => stdout += chunk.toString());
        child.stderr.on('data', chunk => stderr += chunk.toString());
        child.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });
        child.on('close', code => {
            clearTimeout(timer);
            if (code !== 0) return reject(new Error(stderr || `openclaw exited with code ${code}`));
            try {
                const cli = JSON.parse(stdout);
                const text = cli.payloads?.[0]?.text || cli.text || stdout;
                resolve(extractJsonObject(text));
            } catch (err) {
                try { resolve(extractJsonObject(stdout)); }
                catch { reject(err); }
            }
        });
    }).catch(err => {
        if (fallback) return fallback;
        throw err;
    });
}

function heuristicLinkedInJobScore(job) {
    const text = `${job.title} ${job.company} ${job.location} ${job.description} ${job.workplace_type}`.toLowerCase();
    let score = 35;
    ['account executive', 'software sales', 'saas', 'crm', 'business development', 'revenue', 'gtm', 'sales consultant', 'enterprise'].forEach(term => { if (text.includes(term)) score += 8; });
    if (/london|united kingdom|uk|remote|hybrid/.test(text)) score += 10;
    if (/door to door|retail|commission only|unpaid/.test(text)) score -= 25;
    score = Math.max(0, Math.min(100, score));
    return {
        ai_score: score,
        ai_summary: score >= 75 ? 'Strong fit for Phil’s SaaS/software sales background.' : score >= 55 ? 'Possible fit; worth reviewing against role specifics.' : 'Weak or unclear fit based on the available email snippet.',
        ai_pros: ['Relevant sales/GTM keywords found', 'Location or workplace type may fit Phil’s UK preference'].filter((_, i) => score >= 55 || i === 0),
        ai_concerns: score < 65 ? ['Limited job detail available from the alert email'] : [],
        suggested_action: score >= 75 ? 'apply' : score >= 55 ? 'save' : 'ignore'
    };
}

async function scoreLinkedInJob(job) {
    const fallback = heuristicLinkedInJobScore(job);
    if (process.env.LINKEDIN_JOBS_USE_MODEL !== 'true') return fallback;
    try {
        const result = await callOpenAIJson([
            { role: 'system', content: 'Score LinkedIn job alert opportunities for Phil. Return only JSON with ai_score number 0-100, ai_summary string, ai_pros array, ai_concerns array, suggested_action apply|save|ignore.' },
            { role: 'user', content: `Target roles: Account Executive, Software Sales Consultant, SaaS Sales, CRM Sales, Business Development Manager, Revenue/GTM. Background: software sales, SaaS demos, CRM software, enterprise sales, consultative selling, discovery calls, pipeline management. Based London/UK. Interested in hybrid, remote, London-based roles.\n\nJob:\n${JSON.stringify(job, null, 2)}` }
        ], fallback);
        return {
            ai_score: Math.max(0, Math.min(100, Number(result.ai_score ?? fallback.ai_score))),
            ai_summary: String(result.ai_summary || fallback.ai_summary),
            ai_pros: Array.isArray(result.ai_pros) ? result.ai_pros.map(String).slice(0, 5) : fallback.ai_pros,
            ai_concerns: Array.isArray(result.ai_concerns) ? result.ai_concerns.map(String).slice(0, 5) : fallback.ai_concerns,
            suggested_action: ['apply', 'save', 'ignore'].includes(result.suggested_action) ? result.suggested_action : fallback.suggested_action
        };
    } catch (err) {
        console.error('LinkedIn job OpenAI scoring failed:', err.message || err);
        return fallback;
    }
}

async function ingestLinkedInJobAlertEmail(payload) {
    const email = extractAgentMailEmail(payload);
    const db = readLinkedInJobsDb();
    db.rawEmails.push({
        id: email.id,
        subject: email.subject,
        from: email.from,
        receivedAt: email.receivedAt,
        relevant: isLinkedInJobAlertEmail(email),
        textSnippet: (email.text || stripHtml(email.html)).slice(0, 5000)
    });
    if (!isLinkedInJobAlertEmail(email)) {
        writeLinkedInJobsDb(db);
        return { ignored: true, reason: 'Not a LinkedIn job alert email', inserted: 0, updated: 0 };
    }
    const parsedJobs = parseLinkedInJobAlert(email);
    let inserted = 0;
    let updated = 0;
    for (const parsed of parsedJobs) {
        const now = new Date().toISOString();
        const existing = findExistingLinkedInJob(db.jobs, parsed);
        if (existing) {
            Object.assign(existing, {
                ...parsed,
                linkedin_url: normalizeLinkedInUrl(parsed.linkedin_url || existing.linkedin_url),
                source_email_subject: email.subject,
                source_email_from: email.from,
                raw_email_id: email.id,
                updated_at: now
            });
            updated++;
            continue;
        }
        const scored = await scoreLinkedInJob(parsed);
        db.jobs.unshift({
            id: linkedinJobId(),
            title: parsed.title || 'Untitled role',
            company: parsed.company || '',
            location: parsed.location || '',
            linkedin_url: normalizeLinkedInUrl(parsed.linkedin_url),
            description: parsed.description || '',
            salary: parsed.salary || '',
            workplace_type: parsed.workplace_type || '',
            alert_keyword: parsed.alert_keyword || '',
            source_email_subject: email.subject,
            source_email_from: email.from,
            raw_email_id: email.id,
            ai_score: scored.ai_score,
            ai_summary: scored.ai_summary,
            ai_pros: scored.ai_pros,
            ai_concerns: scored.ai_concerns,
            suggested_action: scored.suggested_action,
            cover_letter: '',
            status: 'new',
            created_at: now,
            updated_at: now
        });
        inserted++;
    }
    writeLinkedInJobsDb(db);
    return { ignored: false, parsed: parsedJobs.length, inserted, updated };
}

async function fetchAgentMailJson(pathname, params = {}) {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey || apiKey === 'paste_agentmail_api_key_here') throw new Error('AGENTMAIL_API_KEY is not configured');
    const baseUrl = (process.env.AGENTMAIL_API_BASE_URL || 'https://api.agentmail.to').replace(/\/$/, '');
    const url = new URL(`${baseUrl}${pathname}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) {
        const message = data.error?.message || data.error || data.message || `AgentMail API request failed: ${response.status}`;
        throw new Error(String(message));
    }
    return data;
}

function resolveAgentMailInboxId(inboxes = []) {
    const configured = process.env.AGENTMAIL_INBOX || 'philmacmini@agentmail.to';
    const found = inboxes.find(inbox => inbox.inbox_id === configured || inbox.email === configured);
    return found?.inbox_id || configured;
}

async function pullLinkedInJobsFromAgentMail() {
    const dbBefore = readLinkedInJobsDb();
    const seenRawEmailIds = new Set((dbBefore.jobs || []).map(job => String(job.raw_email_id || '')).filter(Boolean));
    const inboxesData = await fetchAgentMailJson('/v0/inboxes', { limit: 50 });
    const inboxId = resolveAgentMailInboxId(inboxesData.inboxes || []);
    const messagesData = await fetchAgentMailJson(`/v0/inboxes/${encodeURIComponent(inboxId)}/messages`, { limit: 25 });
    const messageItems = Array.isArray(messagesData.messages) ? messagesData.messages : [];
    let checked = 0;
    let skipped = 0;
    let ignored = 0;
    let inserted = 0;
    let updated = 0;
    const processed = [];

    for (const item of messageItems) {
        const messageId = item.message_id;
        if (!messageId || seenRawEmailIds.has(String(messageId))) {
            skipped += 1;
            continue;
        }
        checked += 1;
        const message = await fetchAgentMailJson(`/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`);
        const result = await ingestLinkedInJobAlertEmail({ message });
        processed.push({ message_id: messageId, subject: message.subject || item.subject || '', ...result });
        if (result.ignored) ignored += 1;
        inserted += Number(result.inserted || 0);
        updated += Number(result.updated || 0);
    }

    return {
        inbox: inboxId,
        messages_seen: messageItems.length,
        checked,
        skipped_existing: skipped,
        ignored,
        inserted,
        updated,
        processed
    };
}

function updateLinkedInJob(id, patch) {
    const db = readLinkedInJobsDb();
    const job = db.jobs.find(j => j.id === id);
    if (!job) throw new Error('Job not found');
    Object.assign(job, patch, { updated_at: new Date().toISOString() });
    writeLinkedInJobsDb(db);
    return job;
}

async function generateLinkedInJobCoverLetter(id) {
    const db = readLinkedInJobsDb();
    const job = db.jobs.find(j => j.id === id);
    if (!job) throw new Error('Job not found');
    if (!String(job.pasted_job_description || '').trim()) {
        throw new Error('Paste the job description before generating a cover letter.');
    }
    const cvUrl = process.env.PHIL_CV_URL || 'https://www.phillougher.com/cv.html';
    const cvText = await fetchPhilCvText();
    const jobDescription = compactReadableText(job.pasted_job_description, 12000);
    const fallbackLetter = `TL;DR\n- SaaS/software sales professional with full-cycle experience across discovery, demos, consultative selling, and pipeline management.\n- Proven track record closing and growing mid-market/enterprise accounts, with CRM-led selling discipline.\n- Interested in ${job.company || 'your team'} because the ${job.title || 'role'} role aligns with my commercial, technical, and customer-facing background.\n\nHi ${job.company || 'there'},\n\nI’m interested in the ${job.title || 'role'} opportunity. My background is in software and SaaS sales, including discovery calls, demos, consultative selling, CRM-led pipeline management, and closing enterprise/mid-market customers.\n\nThe role looks aligned with my experience helping customers understand business problems and match them to practical software solutions. You can see my CV here: ${cvUrl}\n\nBest,\nPhil Lougher`;
    let coverLetter = fallbackLetter;
    try {
        const result = await callOpenAIJson([
            { role: 'system', content: 'Write concise, human cover letters for Phil Lougher. Return JSON: {"cover_letter":"..."}. Do not sound over-written.' },
            { role: 'user', content: `Write a concise cover letter for this job using the pasted job description and Phil's CV/profile below. Keep it specific, confident, and human.

Required format:
TL;DR
- Three short bullet points for hiring managers to skim quickly.
- Each bullet should connect Phil's strongest relevant experience to this exact role.
- Avoid generic filler.

Then write the cover letter body below the TL;DR. Include this CV link naturally: ${cvUrl}

Job record:
${JSON.stringify({ title: job.title, company: job.company, location: job.location, linkedin_url: job.linkedin_url }, null, 2)}

Pasted job description:
${jobDescription}

Phil CV/profile source (${cvText ? cvUrl : 'CV fetch unavailable; use known profile'}):
${cvText}` }
        ], { cover_letter: fallbackLetter });
        coverLetter = String(result.cover_letter || fallbackLetter).trim();
    } catch (err) {
        console.error('LinkedIn cover letter generation failed:', err.message || err);
    }
    job.cover_letter = coverLetter;
    job.cover_letter_sources = {
        cv_url: cvUrl,
        cv_fetched: Boolean(cvText),
        linkedin_url: job.linkedin_url || '',
        pasted_job_description: true,
        linkedin_description_fetched: false
    };
    job.updated_at = new Date().toISOString();
    writeLinkedInJobsDb(db);
    return job;
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options);
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', chunk => stdout += chunk.toString());
        child.stderr?.on('data', chunk => stderr += chunk.toString());
        child.on('error', reject);
        child.on('close', code => {
            if (code !== 0) return reject(new Error(stderr || `${command} exited with code ${code}`));
            resolve({ stdout, stderr });
        });
    });
}

async function createLinkedInCoverLetterGoogleDoc(id) {
    const db = readLinkedInJobsDb();
    const job = db.jobs.find(j => j.id === id);
    if (!job) throw new Error('Job not found');
    if (!String(job.cover_letter || '').trim()) throw new Error('Generate a cover letter before creating a Google Doc.');

    const safeTitle = `${job.company || 'Company'} - ${job.title || 'Cover Letter'} - Phil Lougher`.replace(/[\r\n\t]+/g, ' ').slice(0, 180);
    const tempFile = path.join(os.tmpdir(), `phil-cover-letter-${Date.now()}.md`);
    fs.writeFileSync(tempFile, `# Cover Letter - ${job.title || 'Role'}\n\n${job.cover_letter}\n`, 'utf8');
    try {
        const gogBin = process.env.GOG_BIN || '/opt/homebrew/bin/gog';
        const { stdout } = await runCommand(gogBin, ['docs', 'create', safeTitle, '--file', tempFile, '--pageless', '--json', '--no-input'], { env: process.env, cwd: __dirname });
        const data = JSON.parse(stdout || '{}');
        const doc = data.document || data.file || data.result || data;
        const docId = doc.documentId || doc.document_id || doc.id || doc.fileId || doc.file_id;
        if (!docId) throw new Error('Google Doc was created but no doc id was returned');
        job.google_doc_id = docId;
        job.google_doc_url = doc.webViewLink || doc.url || `https://docs.google.com/document/d/${docId}/edit`;
        job.updated_at = new Date().toISOString();
        writeLinkedInJobsDb(db);
        return job;
    } finally {
        try { fs.unlinkSync(tempFile); } catch {}
    }
}

function validateAgentMailSignature(req, rawBody) {
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    if (!secret) return true;
    const provided = req.headers['x-agentmail-signature'] || req.headers['agentmail-signature'] || req.headers['x-signature'];
    if (!provided) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const cleanProvided = String(provided).replace(/^sha256=/i, '').trim();
    try {
        return crypto.timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(expected));
    } catch {
        return false;
    }
}

function formatCsvCell(value = '') {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function defaultYouTubeScriptPath(title = '') {
    const slug = String(title || 'untitled-video')
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 90) || 'untitled-video';
    return `Scripts/${slug}.md`;
}

function readCsvObjects(filePath, titleColumn = 'Video Title') {
    try {
        const rows = parseCsvRows(fs.readFileSync(filePath, 'utf8'));
        return csvRowsToObjects(rows, titleColumn);
    } catch {
        return { headers: [], items: [] };
    }
}

function writeCsvObjects(filePath, headers, items) {
    const lines = [headers.map(formatCsvCell).join(',')];
    items.forEach(item => {
        lines.push(headers.map(header => formatCsvCell(item[header] || '')).join(','));
    });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

const PEOPLE_HEADERS = [
    'Name', 'Relationship', 'Role/Tags', 'Link/Contact', 'Location', 'How We Met',
    'Source', 'Notes', 'Date Added', 'Last Contacted', 'Catch-up Every Days',
    'Next Contact', 'Birthday', 'Status', 'Interaction History'
];

function isoDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
    const date = new Date(`${dateText}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + Number(days || 90));
    return isoDate(date);
}

function readPeople() {
    const current = readCsvObjects(PERSONAL_CRM_FILE, 'Name');
    const headers = current.headers.length ? [...current.headers] : [...PEOPLE_HEADERS];
    let changed = false;
    PEOPLE_HEADERS.forEach(header => {
        if (!headers.includes(header)) {
            headers.push(header);
            changed = true;
        }
    });
    current.items.forEach(person => {
        if (!person.Relationship) person.Relationship = 'Professional';
        if (!person['Catch-up Every Days']) person['Catch-up Every Days'] = '90';
        if (!person.Status) person.Status = 'Active';
    });
    if (changed) writeCsvObjects(PERSONAL_CRM_FILE, headers, current.items);
    return { headers, items: current.items };
}

function personNextContact(person = {}) {
    if (person['Next Contact']) return isoDate(person['Next Contact']);
    const anchor = person['Last Contacted'] || person['Date Added'];
    return anchor ? addDays(anchor, person['Catch-up Every Days'] || 90) : '';
}

function enrichPerson(person = {}) {
    const nextContact = personNextContact(person);
    const today = isoDate();
    const inSevenDays = addDays(today, 7);
    let timing = 'later';
    if (nextContact && nextContact <= today) timing = 'due';
    else if (nextContact && nextContact <= inSevenDays) timing = 'upcoming';
    return { ...person, _nextContact: nextContact, _timing: timing };
}

function cleanPersonPayload(payload = {}, existing = {}) {
    const person = { ...existing };
    PEOPLE_HEADERS.forEach(header => {
        if (Object.prototype.hasOwnProperty.call(payload, header)) person[header] = String(payload[header] ?? '').trim();
    });
    person.Name = String(payload.Name ?? existing.Name ?? '').trim();
    if (!person.Name) throw new Error('Name is required');
    person.Relationship = person.Relationship || 'Friend';
    person['Catch-up Every Days'] = String(Math.max(1, Number(person['Catch-up Every Days']) || 90));
    person['Date Added'] = person['Date Added'] || isoDate();
    person.Status = person.Status || 'Active';
    return person;
}

function sendPeopleError(res, err, status = 400) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message || 'Invalid request' }));
}

function handlePeopleCreate(req, res) {
    readBody(req, body => {
        try {
            const payload = JSON.parse(body || '{}');
            const { headers, items } = readPeople();
            const person = cleanPersonPayload(payload);
            if (items.some(item => item.Name.toLowerCase() === person.Name.toLowerCase())) throw new Error('A person with this name already exists');
            items.push(person);
            writeCsvObjects(PERSONAL_CRM_FILE, headers, items);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, person: enrichPerson({ ...person, _index: items.length - 1 }) }));
        } catch (err) { sendPeopleError(res, err); }
    });
}

function handlePeopleUpdate(req, res, index) {
    readBody(req, body => {
        try {
            const payload = JSON.parse(body || '{}');
            const { headers, items } = readPeople();
            const target = items.find(item => Number(item._index) === index);
            if (!target) return sendPeopleError(res, new Error('Person not found'), 404);
            const updated = cleanPersonPayload(payload, target);
            if (items.some(item => item !== target && item.Name.toLowerCase() === updated.Name.toLowerCase())) throw new Error('A person with this name already exists');
            Object.assign(target, updated);
            writeCsvObjects(PERSONAL_CRM_FILE, headers, items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, person: enrichPerson(target) }));
        } catch (err) { sendPeopleError(res, err); }
    });
}

function handlePeopleDelete(res, index) {
    try {
        const { headers, items } = readPeople();
        const remaining = items.filter(item => Number(item._index) !== index);
        if (remaining.length === items.length) return sendPeopleError(res, new Error('Person not found'), 404);
        writeCsvObjects(PERSONAL_CRM_FILE, headers, remaining);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } catch (err) { sendPeopleError(res, err); }
}

function handlePeopleContact(req, res, index) {
    readBody(req, body => {
        try {
            const payload = JSON.parse(body || '{}');
            const { headers, items } = readPeople();
            const target = items.find(item => Number(item._index) === index);
            if (!target) return sendPeopleError(res, new Error('Person not found'), 404);
            const contacted = isoDate(payload.date || new Date());
            if (!contacted) throw new Error('A valid contact date is required');
            const note = String(payload.note || '').trim();
            const historyLine = `${contacted}${note ? ` - ${note}` : ' - Caught up'}`;
            target['Last Contacted'] = contacted;
            target['Next Contact'] = isoDate(payload.nextContact) || addDays(contacted, target['Catch-up Every Days'] || 90);
            target['Interaction History'] = [historyLine, target['Interaction History']].filter(Boolean).join('\n');
            writeCsvObjects(PERSONAL_CRM_FILE, headers, items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, person: enrichPerson(target) }));
        } catch (err) { sendPeopleError(res, err); }
    });
}

function ensureInstagramReelsFile() {
    const headers = [
        'Video Title',
        'Format',
        'Core Idea',
        'Inspo',
        'Visual Hook',
        'Shot Notes',
        'Caption Notes',
        'Audio / Trend',
        'CTA',
        'Production Notes',
        'Results / Learnings',
        'Status'
    ];
    if (fs.existsSync(INSTAGRAM_REELS_CSV)) {
        const existing = readCsvObjects(INSTAGRAM_REELS_CSV);
        if (existing.headers.length && !existing.headers.includes('Inspo')) {
            const nextHeaders = [...existing.headers];
            const coreIdeaIndex = nextHeaders.indexOf('Core Idea');
            if (coreIdeaIndex >= 0) nextHeaders.splice(coreIdeaIndex + 1, 0, 'Inspo');
            else nextHeaders.push('Inspo');
            writeCsvObjects(INSTAGRAM_REELS_CSV, nextHeaders, existing.items);
        }
        return;
    }
    writeCsvObjects(INSTAGRAM_REELS_CSV, headers, []);
}

function handleCsvAddPost(req, res, filePath, priorityFile = null, maxPrioritySlot = 3) {
    readBody(req, (body) => {
        try {
            const incoming = JSON.parse(body || '{}');
            const row = incoming.row && typeof incoming.row === 'object' ? incoming.row : incoming;
            const title = String(row['Video Title'] || row.title || '').trim();
            if (!title) throw new Error('Video title is required');

            const { headers, items } = readCsvObjects(filePath);
            if (!headers.length) throw new Error('Planner file has no headers');
            if (items.some(item => normaliseTitle(item['Video Title']) === normaliseTitle(title))) {
                throw new Error('A video with this title already exists');
            }

            const nextItem = {};
            headers.forEach(header => {
                nextItem[header] = String(row[header] ?? '').trim();
            });
            nextItem['Video Title'] = title;
            if (headers.includes('Script Link') && !nextItem['Script Link']) nextItem['Script Link'] = defaultYouTubeScriptPath(title);
            if (headers.includes('Status') && !nextItem.Status) nextItem.Status = 'Planned';
            items.push(nextItem);
            writeCsvObjects(filePath, headers, items);

            const validPrioritySlots = Array.from({ length: maxPrioritySlot }, (_, index) => String(index + 1));
            const cleanSlot = validPrioritySlots.includes(String(incoming.prioritySlot || '')) ? String(incoming.prioritySlot) : '';
            let assignments = null;
            if (priorityFile && cleanSlot) {
                const current = readJsonFile(priorityFile, { assignments: {} });
                assignments = { ...(current.assignments || {}) };
                const normalised = normaliseTitle(title);
                Object.keys(assignments).forEach(key => {
                    if (assignments[key] === normalised || key === cleanSlot) delete assignments[key];
                });
                assignments[cleanSlot] = normalised;
                fs.writeFileSync(priorityFile, JSON.stringify({ assignments }, null, 2) + '\n');
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, item: nextItem, assignments }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handleCsvRenamePost(req, res, filePath, priorityFile = null) {
    readBody(req, (body) => {
        try {
            const { title, newTitle } = JSON.parse(body || '{}');
            const oldTitle = String(title || '').trim();
            const nextTitle = String(newTitle || '').trim();
            if (!oldTitle || !nextTitle) throw new Error('Current and new title are required');
            if (normaliseTitle(oldTitle) === normaliseTitle(nextTitle)) throw new Error('New title is the same as the current title');

            const { headers, items } = readCsvObjects(filePath);
            if (!headers.length) throw new Error('Planner file has no headers');
            const target = items.find(item => normaliseTitle(item['Video Title']) === normaliseTitle(oldTitle));
            if (!target) throw new Error('Video not found');
            if (items.some(item => item !== target && normaliseTitle(item['Video Title']) === normaliseTitle(nextTitle))) {
                throw new Error('A video with this title already exists');
            }

            const oldDefaultScript = defaultYouTubeScriptPath(oldTitle);
            target['Video Title'] = nextTitle;
            if (headers.includes('Script Link') && (!target['Script Link'] || target['Script Link'] === oldDefaultScript)) {
                target['Script Link'] = defaultYouTubeScriptPath(nextTitle);
            }
            writeCsvObjects(filePath, headers, items);

            let assignments = null;
            if (priorityFile) {
                const current = readJsonFile(priorityFile, { assignments: {} });
                assignments = { ...(current.assignments || {}) };
                const oldNormalised = normaliseTitle(oldTitle);
                const nextNormalised = normaliseTitle(nextTitle);
                Object.keys(assignments).forEach(slot => {
                    if (assignments[slot] === oldNormalised) assignments[slot] = nextNormalised;
                });
                fs.writeFileSync(priorityFile, JSON.stringify({ assignments }, null, 2) + '\n');
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, item: target, assignments }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handleCsvUpdatePost(req, res, filePath, priorityFile = null) {
    readBody(req, (body) => {
        try {
            const incoming = JSON.parse(body || '{}');
            const oldTitle = String(incoming.title || '').trim();
            const row = incoming.row && typeof incoming.row === 'object' ? incoming.row : {};
            const nextTitle = String(row['Video Title'] || '').trim();
            if (!oldTitle || !nextTitle) throw new Error('Current and new title are required');

            const { headers, items } = readCsvObjects(filePath);
            if (!headers.length) throw new Error('Planner file has no headers');
            const target = items.find(item => normaliseTitle(item['Video Title']) === normaliseTitle(oldTitle));
            if (!target) throw new Error('Video not found');
            if (items.some(item => item !== target && normaliseTitle(item['Video Title']) === normaliseTitle(nextTitle))) {
                throw new Error('A video with this title already exists');
            }

            headers.forEach(header => {
                if (Object.prototype.hasOwnProperty.call(row, header)) {
                    target[header] = String(row[header] ?? '').trim();
                }
            });
            target['Video Title'] = nextTitle;
            if (headers.includes('Status') && !target.Status) target.Status = 'Idea';
            writeCsvObjects(filePath, headers, items);

            let assignments = null;
            if (priorityFile && normaliseTitle(oldTitle) !== normaliseTitle(nextTitle)) {
                const current = readJsonFile(priorityFile, { assignments: {} });
                assignments = { ...(current.assignments || {}) };
                const oldNormalised = normaliseTitle(oldTitle);
                const nextNormalised = normaliseTitle(nextTitle);
                Object.keys(assignments).forEach(slot => {
                    if (assignments[slot] === oldNormalised) assignments[slot] = nextNormalised;
                });
                fs.writeFileSync(priorityFile, JSON.stringify({ assignments }, null, 2) + '\n');
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, item: target, assignments }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handleCsvStatusPost(req, res, filePath) {
    readBody(req, (body) => {
        try {
            const { title, status } = JSON.parse(body || '{}');
            const { headers, items } = readCsvObjects(filePath);
            if (!title) throw new Error('Title is required');
            const nextHeaders = headers.includes('Status') ? headers : [...headers, 'Status'];
            const found = items.some(item => item['Video Title'] === title);
            if (!found) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Video not found' }));
            }
            items.forEach(item => { if (item['Video Title'] === title) item.Status = status || 'Planned'; });
            writeCsvObjects(filePath, nextHeaders, items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handleCsvDeletePost(req, res, filePath) {
    readBody(req, (body) => {
        try {
            const { title } = JSON.parse(body || '{}');
            const { headers, items } = readCsvObjects(filePath);
            if (!title) throw new Error('Title is required');
            const remaining = items.filter(item => item['Video Title'] !== title);
            if (remaining.length === items.length) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Video not found' }));
            }
            writeCsvObjects(filePath, headers, remaining);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handleYouTubeTeamUpdate(req, res) {
    readBody(req, (body) => {
        try {
            const payload = JSON.parse(body || '{}');
            const index = Number(payload.index);
            if (!Number.isInteger(index) || index < 0) throw new Error('Valid member index is required');

            const { headers, items } = readCsvObjects(PERSONAL_CRM_FILE, 'Name');
            if (!headers.length) throw new Error('Personal CRM file has no headers');
            const target = items.find(item => Number(item._index) === index);
            if (!target) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Team member not found' }));
            }

            const editableHeaders = ['Name', 'Role/Tags', 'Link/Contact', 'Source', 'Notes', 'Date Added'];
            editableHeaders.forEach(header => {
                if (Object.prototype.hasOwnProperty.call(payload, header) && headers.includes(header)) {
                    target[header] = String(payload[header] ?? '').trim();
                }
            });
            if (!target['Name']) throw new Error('Name is required');
            if (!target['Role/Tags']) target['Role/Tags'] = 'YouTube Dream Team';

            writeCsvObjects(PERSONAL_CRM_FILE, headers, items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, member: target }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handleYouTubeTeamDelete(req, res) {
    readBody(req, (body) => {
        try {
            const { index } = JSON.parse(body || '{}');
            const targetIndex = Number(index);
            if (!Number.isInteger(targetIndex) || targetIndex < 0) throw new Error('Valid member index is required');

            const { headers, items } = readCsvObjects(PERSONAL_CRM_FILE, 'Name');
            if (!headers.length) throw new Error('Personal CRM file has no headers');
            const remaining = items.filter(item => Number(item._index) !== targetIndex);
            if (remaining.length === items.length) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Team member not found' }));
            }

            writeCsvObjects(PERSONAL_CRM_FILE, headers, remaining);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message || 'Invalid JSON' }));
        }
    });
}

function handlePriorityPost(req, res, priorityFile) {
    readBody(req, (body) => {
        try {
            const { title, slot } = JSON.parse(body || '{}');
            const normalised = normaliseTitle(title || '');
            if (!normalised) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
            }
            const cleanSlot = ['1', '2', '3'].includes(String(slot || '')) ? String(slot) : '';
            const current = readJsonFile(priorityFile, { assignments: {} });
            const assignments = { ...(current.assignments || {}) };
            Object.keys(assignments).forEach(key => {
                if (assignments[key] === normalised || key === cleanSlot) delete assignments[key];
            });
            if (cleanSlot) assignments[cleanSlot] = normalised;
            fs.writeFileSync(priorityFile, JSON.stringify({ assignments }, null, 2) + '\n');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, assignments }));
        } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
    });
}

function processBiomarkerSummary(data = {}) {
    const markers = Array.isArray(data.markers) ? data.markers : [];
    const categoryCounts = markers.reduce((acc, marker) => {
        const category = marker.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    const normalCount = markers.filter(marker => String(marker.status || '').toLowerCase().includes('normal')).length;
    return {
        testDate: data.test_date || '',
        printedAt: data.printed_at || '',
        markerCount: markers.length,
        normalCount,
        categoryCounts,
        highlights: markers
            .filter(marker => ['Serum vitamin B12', 'Total 25-hydroxyvitamin D level', 'Serum ferritin', 'HbA1c level - IFCC standardised', 'Serum TSH level'].includes(marker.name))
            .map(marker => ({ name: marker.name, value: marker.value, unit: marker.unit, status: marker.status }))
    };
}

function processNutritionMealPlan(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return { dayTypes: [] };
    const headers = rows[0].map(h => String(h).trim());
    const items = rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            dayType: obj.DayType || '',
            meal: obj.Meal || '',
            time: obj.Time || '',
            item: obj.Item || '',
            amount: obj.Amount || '',
            unit: obj.Unit || '',
            notes: obj.Notes || ''
        };
    }).filter(row => row.dayType && row.meal && row.item);
    const dayMap = new Map();
    items.forEach(item => {
        if (!dayMap.has(item.dayType)) dayMap.set(item.dayType, new Map());
        const mealMap = dayMap.get(item.dayType);
        const mealKey = `${item.meal}|${item.time}`;
        if (!mealMap.has(mealKey)) mealMap.set(mealKey, { meal: item.meal, time: item.time, items: [] });
        mealMap.get(mealKey).items.push({ item: item.item, amount: item.amount, unit: item.unit, notes: item.notes });
    });
    return {
        dayTypes: Array.from(dayMap.entries()).map(([dayType, mealMap]) => ({
            dayType,
            meals: Array.from(mealMap.values())
        }))
    };
}

function processNutritionMacroTargets(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return { dayTypes: [] };
    const headers = rows[0].map(h => String(h).trim());
    const entries = rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            dayType: obj.DayType || '',
            meal: obj.Meal || '',
            calories: Number(obj.EstimatedCalories || 0),
            protein: Number(obj.EstimatedProtein || 0),
            fat: Number(obj.EstimatedFat || 0),
            carbs: Number(obj.EstimatedCarbs || 0),
            notes: obj.Notes || ''
        };
    }).filter(row => row.dayType && row.meal);
    const dayMap = new Map();
    entries.forEach(entry => {
        if (!dayMap.has(entry.dayType)) dayMap.set(entry.dayType, { dayType: entry.dayType, meals: [], total: null });
        const bucket = dayMap.get(entry.dayType);
        if (String(entry.meal).toLowerCase().includes('daily total')) bucket.total = entry;
        else bucket.meals.push(entry);
    });
    return { dayTypes: Array.from(dayMap.values()) };
}

function processNutritionWeeklySchedule(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return { weeks: [] };
    const headers = rows[0].map(h => String(h).trim());
    const weeks = rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            weekStarting: obj.WeekStarting || '',
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ day, type: obj[day] || '' })),
            notes: obj.Notes || ''
        };
    }).filter(row => row.weekStarting);
    return { weeks };
}


function csvEscape(value = '') {
    const str = String(value ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function nutritionFoodLogHeader() {
    return ['Id', 'Date', 'Meal', 'Time', 'FoodId', 'Item', 'Amount', 'Calories', 'Protein', 'Fat', 'Carbs', 'Cost', 'Notes'];
}

function parseNutritionFoodLogRows(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return [];
    const headers = rows[0].map(h => String(h).trim());
    return rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            id: obj.Id || obj.id || '',
            date: obj.Date || obj.date || '',
            meal: obj.Meal || obj.meal || '',
            time: obj.Time || obj.time || '',
            foodId: obj.FoodId || obj.foodId || '',
            item: obj.Item || obj.item || '',
            amount: obj.Amount || obj.amount || '',
            calories: Number(obj.Calories || 0),
            protein: Number(obj.Protein || 0),
            fat: Number(obj.Fat || 0),
            carbs: Number(obj.Carbs || 0),
            cost: Number(obj.Cost || 0),
            notes: obj.Notes || obj.notes || ''
        };
    }).filter(row => row.id && row.date && row.item);
}

function writeNutritionFoodLogRows(rows = []) {
    fs.mkdirSync(NUTRITION_DIR, { recursive: true });
    const header = nutritionFoodLogHeader();
    const lines = [header.join(',')];
    rows.forEach(row => {
        lines.push([
            row.id,
            row.date,
            row.meal,
            row.time,
            row.foodId,
            row.item,
            row.amount,
            row.calories,
            row.protein,
            row.fat,
            row.carbs,
            row.cost,
            row.notes
        ].map(csvEscape).join(','));
    });
    fs.writeFileSync(NUTRITION_DAILY_FOOD_LOG_FILE, lines.join('\n') + '\n', 'utf8');
}


function nutritionFoodDatabaseHeader() {
    return ['Id', 'Food', 'DefaultAmount', 'Calories', 'Protein', 'Fat', 'Carbs', 'Price', 'Notes', 'Fibre', 'Salt', 'Sugars'];
}

function parseNutritionFoodDatabaseRows(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return [];
    const headers = rows[0].map(h => String(h).trim());
    return rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            id: obj.Id || obj.id || '',
            food: obj.Food || obj.food || '',
            defaultAmount: obj.DefaultAmount || obj.defaultAmount || '',
            calories: Number(obj.Calories || 0),
            protein: Number(obj.Protein || 0),
            fat: Number(obj.Fat || 0),
            carbs: Number(obj.Carbs || 0),
            price: Number(obj.Price || 0),
            notes: obj.Notes || obj.notes || '',
            fibre: Number(obj.Fibre || 0),
            salt: Number(obj.Salt || 0),
            sugars: Number(obj.Sugars || 0)
        };
    }).filter(row => row.id && row.food);
}

function writeNutritionFoodDatabaseRows(rows = []) {
    fs.mkdirSync(NUTRITION_DIR, { recursive: true });
    const header = nutritionFoodDatabaseHeader();
    const lines = [header.join(',')];
    rows.forEach(row => {
        lines.push([
            row.id,
            row.food,
            row.defaultAmount,
            row.calories,
            row.protein,
            row.fat,
            row.carbs,
            row.price,
            row.notes,
            row.fibre,
            row.salt,
            row.sugars
        ].map(csvEscape).join(','));
    });
    fs.writeFileSync(NUTRITION_FOOD_DATABASE_FILE, lines.join('\n') + '\n', 'utf8');
}

function processNutritionFoodDatabase(csv = '') {
    const rows = parseNutritionFoodDatabaseRows(csv).sort((a, b) => a.food.localeCompare(b.food));
    return {
        rows,
        summary: {
            count: rows.length,
            estimatedItems: rows.filter(row => String(row.notes || '').toLowerCase().includes('estimated')).length
        }
    };
}

function normaliseFoodDatabasePayload(raw = {}) {
    const food = String(raw.food || '').trim();
    if (!food) throw new Error('Food name is required');
    const id = String(raw.id || '').trim() || food.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `food_${Date.now()}`;
    return {
        id,
        food,
        defaultAmount: String(raw.defaultAmount || '').trim(),
        calories: Number(raw.calories || 0),
        protein: Number(raw.protein || 0),
        fat: Number(raw.fat || 0),
        carbs: Number(raw.carbs || 0),
        price: Number(raw.price || 0),
        notes: String(raw.notes || '').trim(),
        fibre: Number(raw.fibre || 0),
        salt: Number(raw.salt || 0),
        sugars: Number(raw.sugars || 0)
    };
}

function upsertNutritionFoodDatabaseEntry(raw = {}) {
    const entry = normaliseFoodDatabasePayload(raw);
    const rows = parseNutritionFoodDatabaseRows(readTextFileSafe(NUTRITION_FOOD_DATABASE_FILE));
    const index = rows.findIndex(row => row.id === entry.id);
    if (index >= 0) rows[index] = entry;
    else rows.push(entry);
    rows.sort((a, b) => a.food.localeCompare(b.food));
    writeNutritionFoodDatabaseRows(rows);
    return entry;
}

function deleteNutritionFoodDatabaseEntry(id = '') {
    const rows = parseNutritionFoodDatabaseRows(readTextFileSafe(NUTRITION_FOOD_DATABASE_FILE));
    const before = rows.length;
    const nextRows = rows.filter(row => row.id !== id);
    if (before === nextRows.length) throw new Error('Food database item not found');
    writeNutritionFoodDatabaseRows(nextRows);
    return { id };
}


function recipeDatabaseHeader() {
    return ['Id', 'Recipe', 'Meal', 'DefaultAmount', 'Calories', 'Protein', 'Fat', 'Carbs', 'Cost', 'Ingredients', 'Notes'];
}

function parseNutritionRecipeDatabaseRows(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return [];
    const headers = rows[0].map(h => String(h).trim());
    return rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            id: obj.Id || obj.id || '',
            recipe: obj.Recipe || obj.recipe || '',
            meal: obj.Meal || obj.meal || '',
            defaultAmount: obj.DefaultAmount || obj.defaultAmount || '',
            calories: Number(obj.Calories || 0),
            protein: Number(obj.Protein || 0),
            fat: Number(obj.Fat || 0),
            carbs: Number(obj.Carbs || 0),
            cost: Number(obj.Cost || 0),
            ingredients: obj.Ingredients || obj.ingredients || '',
            notes: obj.Notes || obj.notes || ''
        };
    }).filter(row => row.id && row.recipe);
}

function writeNutritionRecipeDatabaseRows(rows = []) {
    fs.mkdirSync(NUTRITION_DIR, { recursive: true });
    const lines = [recipeDatabaseHeader().join(',')];
    rows.forEach(row => {
        lines.push([row.id, row.recipe, row.meal, row.defaultAmount, row.calories, row.protein, row.fat, row.carbs, row.cost, row.ingredients, row.notes].map(csvEscape).join(','));
    });
    fs.writeFileSync(NUTRITION_RECIPE_DATABASE_FILE, lines.join('\n') + '\n', 'utf8');
}

function processNutritionRecipeDatabase(csv = '') {
    const rows = parseNutritionRecipeDatabaseRows(csv).sort((a, b) => a.recipe.localeCompare(b.recipe));
    return { rows, summary: { count: rows.length, estimatedItems: rows.filter(row => String(row.notes || '').toLowerCase().includes('estimated')).length } };
}

function normaliseRecipeDatabasePayload(raw = {}) {
    const recipe = String(raw.recipe || '').trim();
    if (!recipe) throw new Error('Recipe name is required');
    const id = String(raw.id || '').trim() || recipe.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `recipe_${Date.now()}`;
    return {
        id,
        recipe,
        meal: String(raw.meal || '').trim(),
        defaultAmount: String(raw.defaultAmount || '').trim(),
        calories: Number(raw.calories || 0),
        protein: Number(raw.protein || 0),
        fat: Number(raw.fat || 0),
        carbs: Number(raw.carbs || 0),
        cost: Number(raw.cost || 0),
        ingredients: String(raw.ingredients || '').trim(),
        notes: String(raw.notes || '').trim()
    };
}

function upsertNutritionRecipeDatabaseEntry(raw = {}) {
    const entry = normaliseRecipeDatabasePayload(raw);
    const rows = parseNutritionRecipeDatabaseRows(readTextFileSafe(NUTRITION_RECIPE_DATABASE_FILE));
    const index = rows.findIndex(row => row.id === entry.id);
    if (index >= 0) rows[index] = entry;
    else rows.push(entry);
    rows.sort((a, b) => a.recipe.localeCompare(b.recipe));
    writeNutritionRecipeDatabaseRows(rows);
    return entry;
}

function deleteNutritionRecipeDatabaseEntry(id = '') {
    const rows = parseNutritionRecipeDatabaseRows(readTextFileSafe(NUTRITION_RECIPE_DATABASE_FILE));
    const nextRows = rows.filter(row => row.id !== id);
    if (rows.length === nextRows.length) throw new Error('Recipe database item not found');
    writeNutritionRecipeDatabaseRows(nextRows);
    return { id };
}

function processNutritionFoodLog(csv = '') {
    const rows = parseNutritionFoodLogRows(csv).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const totalsByDate = new Map();
    rows.forEach(row => {
        if (!totalsByDate.has(row.date)) totalsByDate.set(row.date, { date: row.date, calories: 0, protein: 0, fat: 0, carbs: 0, cost: 0, count: 0 });
        const total = totalsByDate.get(row.date);
        total.calories += Number(row.calories || 0);
        total.protein += Number(row.protein || 0);
        total.fat += Number(row.fat || 0);
        total.carbs += Number(row.carbs || 0);
        total.cost += Number(row.cost || 0);
        total.count += 1;
    });
    const dailyTotals = Array.from(totalsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const latestDate = dailyTotals[dailyTotals.length - 1]?.date || null;
    return {
        rows,
        recentRows: rows.slice(-20).reverse(),
        dailyTotals,
        summary: {
            count: rows.length,
            loggedDays: dailyTotals.length,
            latestDate,
            latestTotal: latestDate ? dailyTotals.find(day => day.date === latestDate) : null
        }
    };
}

function normaliseNutritionFoodLogPayload(raw = {}) {
    const date = String(raw.date || '').trim();
    const item = String(raw.item || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date is required in YYYY-MM-DD format');
    if (!item) throw new Error('Food item is required');
    const id = String(raw.id || '').trim() || `food_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return {
        id,
        date,
        meal: String(raw.meal || '').trim(),
        time: String(raw.time || '').trim(),
        foodId: String(raw.foodId || '').trim(),
        item,
        amount: String(raw.amount || '').trim(),
        calories: Number(raw.calories || 0),
        protein: Number(raw.protein || 0),
        fat: Number(raw.fat || 0),
        carbs: Number(raw.carbs || 0),
        cost: Number(raw.cost || 0),
        notes: String(raw.notes || '').trim()
    };
}

function upsertNutritionFoodLogEntry(raw = {}) {
    const entry = normaliseNutritionFoodLogPayload(raw);
    const rows = parseNutritionFoodLogRows(readTextFileSafe(NUTRITION_DAILY_FOOD_LOG_FILE));
    const index = rows.findIndex(row => row.id === entry.id);
    if (index >= 0) rows[index] = entry;
    else rows.push(entry);
    rows.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    writeNutritionFoodLogRows(rows);
    return entry;
}

function deleteNutritionFoodLogEntry(id = '') {
    const rows = parseNutritionFoodLogRows(readTextFileSafe(NUTRITION_DAILY_FOOD_LOG_FILE));
    const before = rows.length;
    const nextRows = rows.filter(row => row.id !== id);
    if (before === nextRows.length) throw new Error('Food entry not found');
    writeNutritionFoodLogRows(nextRows);
    return { id };
}

function processNutritionData(csv = '') {
    const rows = parseCsvRows(csv);
    if (rows.length <= 1) return { rows: [], summary: {}, chartRows: [] };
    const headers = rows[0].map(h => String(h).trim());
    const items = rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        return {
            date: obj.Date || obj.date || '',
            calories: Number(obj.Calories || 0),
            protein: Number(obj.Protein || 0),
            fat: Number(obj.Fat || 0),
            carbs: Number(obj.Carbs || 0),
            notes: obj.Notes || ''
        };
    }).filter(row => row.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const latest = items[items.length - 1] || null;
    const last7 = items.slice(-7);
    const avg = (key) => last7.length ? Math.round(last7.reduce((sum, row) => sum + Number(row[key] || 0), 0) / last7.length) : 0;
    return {
        rows: items,
        chartRows: items.slice(-30),
        summary: {
            count: items.length,
            latest,
            firstDate: items[0]?.date || null,
            latestDate: latest?.date || null,
            last7Average: {
                calories: avg('calories'),
                protein: avg('protein'),
                fat: avg('fat'),
                carbs: avg('carbs')
            }
        }
    };
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
    const weightedSets = sets.filter(set => Number(set.weight || 0) > 0);
    const topSet = weightedSets.length
        ? weightedSets.sort((a, b) => (Number(b.weight || 0) - Number(a.weight || 0)) || (Number(b.reps || 0) - Number(a.reps || 0)))[0]
        : (sets[0] || null);
    return { type: 'sets', seconds: 0, display: parts.join(', '), sets, totalReps, volume, topSet };
}

function getWorkoutWeekNumber(dateValue = '') {
    const programmeStart = new Date('2026-07-06T00:00:00');
    const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return Math.max(1, Math.floor((date.getTime() - programmeStart.getTime()) / 604800000) + 1);
}

function parseWorkoutPlanCsv(csv = '') {
    const parsed = parseCsvRows(csv);
    if (parsed.length <= 1) return [];
    const headers = parsed[0].map(value => String(value).trim());
    return parsed.slice(1).map((cols, index) => {
        const row = {};
        headers.forEach((header, column) => row[header] = String(cols[column] || '').trim());
        return {
            order: index + 1,
            session: row.Session,
            sessionNumber: Number(String(row.Session || '').match(/\d+/)?.[0] || 0),
            day: row.Day,
            muscleGroup: row.Muscles,
            exercise: row.Exercise,
            shortcode: row.Shortcode,
            repRange: row.Reps,
            warmUpSets: Number(row.WarmUp || 0),
            workingSets: Number(row.Sets || 0),
            rir: 0
        };
    }).filter(row => row.sessionNumber && row.shortcode && row.exercise);
}

function upsertWorkoutSession(payload = {}) {
    const date = String(payload.date || '').slice(0, 10);
    const sessionNumber = Number(payload.sessionNumber || String(payload.session || '').match(/\d+/)?.[0] || 0);
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid workout date');
    if (![1, 2, 3, 4].includes(sessionNumber)) throw new Error('Choose Session 1, 2, 3 or 4');
    if (!entries.length) throw new Error('Add at least one working set before saving');

    const planRows = parseWorkoutPlanCsv(readTextFileSafe(WORKOUT_PLAN_CSV_FILE));
    const sessionPlan = planRows.filter(row => row.sessionNumber === sessionNumber);
    const planByShortcode = new Map(sessionPlan.map(row => [row.shortcode, row]));
    const parsed = parseCsvRows(readTextFileSafe(WORKOUT_LOGS_FILE));
    const headers = ['Date', 'Session', 'Day', 'Shortcode', 'Exercise', 'LogString', 'Notes'];
    const existingHeaders = parsed[0]?.map(value => String(value).trim()) || headers;
    const rows = parsed.slice(1).map(cols => {
        const row = {};
        existingHeaders.forEach((header, index) => row[header] = String(cols[index] || '').trim());
        return row;
    }).filter(row => !(row.Date === date && row.Session === `Session ${sessionNumber}`));

    const savedRows = entries.map(entry => {
        const shortcode = String(entry.shortcode || '').trim().toUpperCase();
        const planRow = planByShortcode.get(shortcode);
        if (!planRow) throw new Error(`Unknown exercise ${shortcode} for Session ${sessionNumber}`);
        const sets = (Array.isArray(entry.sets) ? entry.sets : []).map(set => ({
            weight: set.weight === '' || set.weight === null || set.weight === undefined ? null : Number(set.weight),
            reps: Number(set.reps)
        })).filter(set => Number.isFinite(set.reps) && set.reps > 0 && (set.weight === null || (Number.isFinite(set.weight) && set.weight >= 0)));
        if (!sets.length) return null;
        const logString = sets.map(set => set.weight === null || set.weight === 0 ? `${set.reps}` : `${set.reps}x${set.weight}kg`).join(', ');
        return {
            Date: date,
            Session: `Session ${sessionNumber}`,
            Day: planRow.day,
            Shortcode: shortcode,
            Exercise: planRow.exercise,
            LogString: logString,
            Notes: `Week ${getWorkoutWeekNumber(date)} - Mission Control web entry; RIR 0`
        };
    }).filter(Boolean);
    if (!savedRows.length) throw new Error('Add reps for at least one exercise before saving');

    const planOrder = new Map(planRows.map(row => [`${row.session}|${row.shortcode}`, row.order]));
    const outputRows = [...rows, ...savedRows].sort((a, b) => {
        const dateCompare = String(a.Date || '').localeCompare(String(b.Date || ''));
        if (dateCompare) return dateCompare;
        const sessionCompare = Number(String(a.Session || '').match(/\d+/)?.[0] || 0) - Number(String(b.Session || '').match(/\d+/)?.[0] || 0);
        if (sessionCompare) return sessionCompare;
        return Number(planOrder.get(`${a.Session}|${a.Shortcode}`) || 999) - Number(planOrder.get(`${b.Session}|${b.Shortcode}`) || 999);
    });
    const lines = [headers.join(','), ...outputRows.map(row => headers.map(header => csvEscape(row[header] || '')).join(','))];
    const tempFile = `${WORKOUT_LOGS_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tempFile, `${lines.join('\n')}\n`, 'utf8');
    fs.renameSync(tempFile, WORKOUT_LOGS_FILE);
    return { date, session: `Session ${sessionNumber}`, exerciseCount: savedRows.length, rows: savedRows };
}

function processWorkoutData(csv, plan = '', planCsv = '') {
    const parsed = parseCsvRows(csv);
    const programme = parseWorkoutPlanCsv(planCsv);
    if (parsed.length <= 1) return { rows: [], sessions: [], exercises: [], summary: {}, plan, programme };
    const headers = parsed[0].map(h => String(h).trim());
    const rows = parsed.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = String(cols[i] || '').trim());
        obj.WorkoutDay = obj.WorkoutDay || [obj.Session, obj.Day].filter(Boolean).join(' · ');
        const parsedLog = parseWorkoutLog(obj.LogString || '');
        return { ...obj, weekNumber: getWorkoutWeekNumber(obj.Date), parsed: parsedLog, volume: parsedLog.volume, totalReps: parsedLog.totalReps, seconds: parsedLog.seconds };
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
        const exerciseKey = `${row.Session}|${row.Shortcode}`;
        if (!exerciseMap.has(exerciseKey)) exerciseMap.set(exerciseKey, []);
        exerciseMap.get(exerciseKey).push(row);
    });
    const exercises = Array.from(exerciseMap.entries()).map(([_exerciseKey, logs]) => {
        logs.sort((a, b) => a.Date.localeCompare(b.Date));
        const latest = logs[logs.length - 1];
        const previous = logs.length > 1 ? logs[logs.length - 2] : null;
        const history = logs.map(log => ({
            date: log.Date,
            workoutDay: log.WorkoutDay,
            logString: log.LogString,
            weight: Number(log.parsed?.topSet?.weight || 0),
            reps: Number(log.parsed?.topSet?.reps || 0),
            volume: Number(log.volume || 0),
            totalReps: Number(log.totalReps || 0),
            seconds: Number(log.seconds || 0)
        }));
        return {
            shortcode: latest.Shortcode,
            exercise: latest.Exercise,
            session: latest.Session,
            sessionNumber: Number(String(latest.Session || '').match(/\d+/)?.[0] || 0),
            day: latest.Day,
            count: logs.length,
            latest,
            previous,
            history,
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
    return { rows, sessions, exercises, summary, plan, programme, programmeStart: '2026-07-06' };
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
        appendFleetLog(fleet, 'Mission Control', `Dispatched task "${task.title || 'Untitled task'}" to ${agentId}.`, now);
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
        'Please complete this task. If it requires code or file changes, inspect the workspace, make the focused change, and run a lightweight verification.',
        'Important: update the real source of truth used by Mission Control for the requested feature — do not just edit mission-control/fleet_data.json unless that is genuinely the data source the UI reads.',
        'Before finishing, verify the requested change actually appears in the relevant file/API/UI path.',
        'When finished, update mission-control/fleet_data.json: set this task status to "done", set updatedAt/lastActive, add a short activity entry explaining what changed, and append a concise shared log entry for the meaningful result/status change.'
    ].filter(Boolean).join('\n');

    fs.mkdirSync(DISPATCH_LOG_DIR, { recursive: true });
    const safeId = String(task.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const logPath = path.join(DISPATCH_LOG_DIR, `${safeId}.log`);
    const out = fs.createWriteStream(logPath, { flags: 'a' });
    out.write(`\n--- Dispatch ${new Date().toISOString()} ${task.id || ''} -> ${agentId} ---\n`);

    const childEnv = {
        ...process.env,
        PATH: [
            process.env.PATH,
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin',
            '/bin'
        ].filter(Boolean).join(':'),
    };

    const child = spawn('/opt/homebrew/bin/openclaw', [
        'agent',
        '--agent', agentId,
        '--session-id', `mission-control-task-${task.id || Date.now()}`,
        '--message', message,
        '--timeout', '900',
        '--json'
    ], {
        cwd: WORKSPACE_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: childEnv
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
            const latestTask = readTaskFromFleet(task.id);
            if (latestTask?.status === 'done') {
                updateDispatchedTaskState(task.id, 'done', `Completed task "${task.title || 'Untitled task'}" via ${agentId}.`);
            } else {
                updateDispatchedTaskState(task.id, 'error', `Task "${task.title || 'Untitled task'}" exited cleanly in ${agentId} but was not actually marked done. Check ${path.relative(__dirname, logPath)}.`);
            }
        } else {
            updateDispatchedTaskState(task.id, 'error', `Task "${task.title || 'Untitled task'}" failed in ${agentId}. Check ${path.relative(__dirname, logPath)}.`);
        }
    });

    return { started: true, pid: child.pid, logPath: path.relative(__dirname, logPath) };
}

function appendFleetLog(fleet, author, message, timestamp = Date.now()) {
    const text = String(message || '').trim();
    if (!text) return;
    fleet.logs = Array.isArray(fleet.logs) ? fleet.logs : [];
    fleet.logs.unshift({ author, message: text, timestamp });
}

function readTaskFromFleet(taskId) {
    if (!taskId) return null;
    try {
        const fleet = JSON.parse(fs.readFileSync(FLEET_FILE, 'utf8'));
        return Array.isArray(fleet.tasks) ? fleet.tasks.find(t => t.id === taskId) || null : null;
    } catch (err) {
        console.error('Failed to read fleet file for task lookup:', err);
        return null;
    }
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
    appendFleetLog(fleet, 'Mission Control', action, now);

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

function getReadAudioDuration(item = {}) {
    const audioPath = path.join(READ_AUDIO_DIR, item.audioFile || `${item.id || ''}.wav`);
    let fileHandle;
    try {
        fileHandle = fs.openSync(audioPath, 'r');
        const stats = fs.fstatSync(fileHandle);
        const header = Buffer.alloc(Math.min(stats.size, 65536));
        fs.readSync(fileHandle, header, 0, header.length, 0);
        if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') return null;
        let offset = 12;
        let byteRate = 0;
        let dataBytes = 0;
        while (offset + 8 <= header.length) {
            const chunkId = header.toString('ascii', offset, offset + 4);
            const chunkSize = header.readUInt32LE(offset + 4);
            if (chunkId === 'fmt ' && offset + 20 <= header.length) byteRate = header.readUInt32LE(offset + 16);
            if (chunkId === 'data') {
                dataBytes = chunkSize;
                break;
            }
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        return byteRate && dataBytes ? Math.round((dataBytes / byteRate) * 100) / 100 : null;
    } catch {
        return null;
    } finally {
        if (fileHandle !== undefined) try { fs.closeSync(fileHandle); } catch {}
    }
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

function deleteReadItem(id) {
    const library = readReadLibrary();
    const index = library.items.findIndex(entry => entry.id === id);
    if (index === -1) throw new Error('Read item not found');

    const [item] = library.items.splice(index, 1);
    writeReadLibrary(library);

    try { fs.unlinkSync(path.join(READ_CONTENT_DIR, item.textFile)); } catch {}
    try { fs.unlinkSync(path.join(READ_AUDIO_DIR, item.audioFile || `${item.id}.wav`)); } catch {}

    return item;
}

let startRetryTimer = null;
let startRetryDelayMs = 5000;

function scheduleServerStart(reason) {
    if (startRetryTimer || server.listening) return;
    const delay = startRetryDelayMs;
    startRetryDelayMs = Math.min(startRetryDelayMs * 2, 60000);
    console.error(`${reason} Retrying in ${Math.round(delay / 1000)}s.`);
    startRetryTimer = setTimeout(() => {
        startRetryTimer = null;
        startServer();
    }, delay);
}

function startServer() {
    if (server.listening) return;
    try {
        server.listen(PORT, HOST);
    } catch (err) {
        scheduleServerStart(`Mission Control failed to start: ${err.message || err}.`);
    }
}

server.on('listening', () => {
    startRetryDelayMs = 5000;
    console.log(`\n🚀 OpenClaw Mission Control is running!`);
    console.log(`👉 Open http://localhost:${PORT} in your browser.\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        scheduleServerStart(`Port ${PORT} is busy.`);
        return;
    }
    scheduleServerStart(`Server error: ${err.message || err}.`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception; exiting so launchd can restart with throttle:', err);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

startServer();

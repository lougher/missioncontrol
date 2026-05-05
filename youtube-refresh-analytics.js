#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const WORKSPACE_DIR = path.join(os.homedir(), '.openclaw', 'workspace');
const DEFAULT_CLIENT_SECRET = path.join(WORKSPACE_DIR, 'secrets', 'client_secret_88562565691-vifd4b2hrhhg24lu6196osjkmhaj307t.apps.googleusercontent.com.json');
const CLIENT_SECRET_PATH = process.env.YOUTUBE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
const TOKEN_PATH = process.env.YOUTUBE_TOKEN_PATH || path.join(WORKSPACE_DIR, 'secrets', 'youtube-token.json');
const OUTPUT_PATH = process.env.YOUTUBE_ANALYTICS_OUTPUT || path.join(WORKSPACE_DIR, 'mission-control', 'youtube_analytics_metrics.json');
const CHANNEL_URL = 'https://www.youtube.com/@PhilLougherAI';
const LONG_FORM_SECONDS = Number(process.env.YOUTUBE_LONG_FORM_SECONDS || 61);
const DAYS_BACK = Number(process.env.YOUTUBE_ANALYTICS_DAYS_BACK || 365);

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function getClient() {
  const raw = readJson(CLIENT_SECRET_PATH);
  const config = raw?.installed || raw?.web;
  if (!config?.client_id || !config?.client_secret) throw new Error('OAuth client JSON missing client_id/client_secret');
  return config;
}

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch { parsed = { raw: data }; }
        if (res.statusCode >= 400) return reject(new Error(parsed.error?.message || parsed.error_description || parsed.error || data || `HTTP ${res.statusCode}`));
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function refreshAccessToken() {
  const client = getClient();
  const token = readJson(TOKEN_PATH);
  if (!token?.refresh_token) throw new Error(`No refresh token found. Run: node mission-control/youtube-auth.js`);
  if (token.access_token && token.expires_at && Date.now() < token.expires_at - 120000) return token.access_token;

  const body = new URLSearchParams({
    client_id: client.client_id,
    client_secret: client.client_secret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token'
  }).toString();
  const refreshed = await requestJson(client.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  const next = {
    ...token,
    ...refreshed,
    refresh_token: token.refresh_token,
    obtained_at: Date.now(),
    expires_at: refreshed.expires_in ? Date.now() + Number(refreshed.expires_in) * 1000 : null
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
  return next.access_token;
}

function authedGet(baseUrl, token, params = {}) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return requestJson(url, { headers: { Authorization: `Bearer ${token}` } });
}

function isoDate(daysBack) {
  const date = new Date(Date.now() - daysBack * 86400000);
  return date.toISOString().slice(0, 10);
}

function parseIsoDuration(duration = '') {
  const match = String(duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

async function getVideoDetails(token, ids) {
  const details = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await authedGet('https://www.googleapis.com/youtube/v3/videos', token, {
      part: 'snippet,contentDetails,status',
      id: batch.join(','),
      maxResults: 50
    });
    (data.items || []).forEach(item => {
      const seconds = parseIsoDuration(item.contentDetails?.duration);
      details.set(item.id, {
        id: item.id,
        title: item.snippet?.title || item.id,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        publishedAt: item.snippet?.publishedAt || null,
        durationSeconds: seconds,
        privacyStatus: item.status?.privacyStatus || null
      });
    });
  }
  return details;
}

async function main() {
  const token = await refreshAccessToken();
  const startDate = process.env.YOUTUBE_ANALYTICS_START_DATE || isoDate(DAYS_BACK);
  const endDate = process.env.YOUTUBE_ANALYTICS_END_DATE || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const report = await authedGet('https://youtubeanalytics.googleapis.com/v2/reports', token, {
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: 'views,averageViewPercentage,estimatedMinutesWatched,averageViewDuration',
    dimensions: 'video',
    sort: '-views',
    maxResults: 200
  });

  const headers = (report.columnHeaders || []).map(h => h.name);
  const rows = report.rows || [];
  const videoIdx = headers.indexOf('video');
  const viewsIdx = headers.indexOf('views');
  const retentionIdx = headers.indexOf('averageViewPercentage');
  const minutesIdx = headers.indexOf('estimatedMinutesWatched');
  const avgDurationIdx = headers.indexOf('averageViewDuration');
  const ids = rows.map(row => row[videoIdx]).filter(Boolean);
  const details = await getVideoDetails(token, ids);

  const videos = rows.map(row => {
    const id = row[videoIdx];
    const detail = details.get(id) || { id, title: id, url: `https://www.youtube.com/watch?v=${id}`, durationSeconds: 0 };
    return {
      videoId: id,
      title: detail.title,
      url: detail.url,
      publishedAt: detail.publishedAt,
      durationSeconds: detail.durationSeconds,
      views: Number(row[viewsIdx] || 0),
      impressionsCtrPct: null,
      audienceRetentionPct: retentionIdx === -1 ? null : Number(row[retentionIdx]),
      estimatedMinutesWatched: minutesIdx === -1 ? null : Number(row[minutesIdx]),
      averageViewDurationSeconds: avgDurationIdx === -1 ? null : Number(row[avgDurationIdx]),
      status: 'Published'
    };
  }).filter(video => video.durationSeconds >= LONG_FORM_SECONDS);

  const output = {
    channel: { name: 'Phil Lougher AI', url: CHANNEL_URL },
    source: 'youtube-analytics-api',
    fetchedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    note: 'Fetched from YouTube Analytics API. Retention is averageViewPercentage. Per-video impressions CTR is not returned by the public YouTube Analytics API query shape for this channel; keep CTR null unless supplied by Studio export/manual data.',
    warnings: [
      'Per-video impressions CTR could not be fetched from the official YouTube Analytics API. The documented videoThumbnailImpressionsClickRate metric returns unsupported-query errors with video-level reports for this channel.'
    ],
    videos
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, videos: videos.length, output: OUTPUT_PATH, startDate, endDate }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});

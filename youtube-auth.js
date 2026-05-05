#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const WORKSPACE_DIR = path.join(require('os').homedir(), '.openclaw', 'workspace');
const DEFAULT_CLIENT_SECRET = path.join(WORKSPACE_DIR, 'secrets', 'client_secret_88562565691-vifd4b2hrhhg24lu6196osjkmhaj307t.apps.googleusercontent.com.json');
const CLIENT_SECRET_PATH = process.env.YOUTUBE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
const TOKEN_PATH = process.env.YOUTUBE_TOKEN_PATH || path.join(WORKSPACE_DIR, 'secrets', 'youtube-token.json');
const PORT = Number(process.env.YOUTUBE_OAUTH_PORT || 53682);
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.readonly'
];

function readClient() {
  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  const config = raw.installed || raw.web;
  if (!config?.client_id || !config?.client_secret) throw new Error('OAuth client JSON is missing client_id/client_secret');
  return config;
}

function openUrl(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  const child = spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' });
  child.unref();
}

function postForm(url, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = require('https').request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (res.statusCode >= 400) return reject(new Error(parsed.error_description || parsed.error || data));
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const client = readClient();
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });

  const authUrl = new URL(client.auth_uri || 'https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', client.client_id);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  const server = http.createServer(async (req, res) => {
    try {
      const incoming = new URL(req.url, REDIRECT_URI);
      if (incoming.pathname !== '/oauth2callback') {
        res.writeHead(404);
        return res.end('Not found');
      }
      const error = incoming.searchParams.get('error');
      if (error) throw new Error(error);
      const code = incoming.searchParams.get('code');
      if (!code) throw new Error('Missing OAuth code');

      const token = await postForm(client.token_uri || 'https://oauth2.googleapis.com/token', {
        code,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      const payload = {
        ...token,
        obtained_at: Date.now(),
        expires_at: token.expires_in ? Date.now() + (Number(token.expires_in) * 1000) : null,
        scope: token.scope || SCOPES.join(' ')
      };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 });
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>YouTube Analytics connected</h1><p>You can close this tab and return to Mission Control.</p>');
      console.log(`YouTube token saved to ${TOKEN_PATH}`);
      setTimeout(() => server.close(() => process.exit(0)), 500);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`OAuth failed: ${err.message}`);
      console.error(err.message);
      setTimeout(() => server.close(() => process.exit(1)), 500);
    }
  });

  server.listen(PORT, () => {
    console.log(`Opening browser for YouTube OAuth on ${REDIRECT_URI}`);
    console.log('If it does not open automatically, paste this URL into your browser:');
    console.log(authUrl.toString());
    openUrl(authUrl.toString());
  });
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});

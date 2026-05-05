#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LIBRARY_FILE = path.join(ROOT, 'read_library.json');
const CONTENT_DIR = path.join(ROOT, 'read-content');
const AUDIO_DIR = path.join(ROOT, 'read-audio');

function argValue(name, fallback = '') {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? (process.argv[idx + 1] || fallback) : fallback;
}

function readStdin() {
  return fs.readFileSync(0, 'utf8');
}

function ensureDirs() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function readLibrary() {
  ensureDirs();
  try {
    const parsed = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function writeLibrary(library) {
  ensureDirs();
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify({ items: library.items || [] }, null, 2) + '\n');
}

function slugify(text) {
  return String(text || 'read-item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'read-item';
}

const title = argValue('title').trim();
const type = (argValue('type', 'article') || 'article').trim().toLowerCase();
const text = readStdin().trim();

if (!title) {
  console.error('Missing --title');
  process.exit(64);
}
if (!text) {
  console.error('No content received on stdin');
  process.exit(65);
}

const library = readLibrary();
const id = `${Date.now()}-${slugify(title)}`;
const textFile = `${id}.txt`;
const audioFile = `${id}.wav`;
fs.writeFileSync(path.join(CONTENT_DIR, textFile), text);

const item = {
  id,
  title,
  type,
  textFile,
  audioFile,
  listenCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastListenedAt: null,
  charCount: text.length,
  preview: text.slice(0, 240)
};

library.items.unshift(item);
writeLibrary(library);
console.log(JSON.stringify(item, null, 2));

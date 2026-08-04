#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const journalFile = path.join(__dirname, '..', 'journal.md');
const timeZone = 'Europe/London';

const now = new Date();
const parts = Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .formatToParts(now)
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, value]),
);

const ordinal = (day) => {
  const value = Number(day);
  const suffix = value % 100 >= 11 && value % 100 <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th');
  return `${value}${suffix}`;
};

const title = `${parts.weekday}, ${ordinal(parts.day)} ${parts.month} ${parts.year}`;
const content = fs.readFileSync(journalFile, 'utf8');
const heading = `## ${title}`;

if (content.split(/\r?\n/).some((line) => line.trim() === heading)) {
  console.log(`Journal entry already exists: ${title}`);
  process.exit(0);
}

const firstEntryIndex = content.search(/^##\s+/m);
const preamble = firstEntryIndex >= 0 ? content.slice(0, firstEntryIndex).trimEnd() : content.trimEnd();
const existingEntries = firstEntryIndex >= 0 ? content.slice(firstEntryIndex).trim() : '';
const updated = [preamble, heading, existingEntries].filter(Boolean).join('\n\n---\n\n') + '\n';

fs.writeFileSync(journalFile, updated, 'utf8');
console.log(`Created blank journal entry: ${title}`);

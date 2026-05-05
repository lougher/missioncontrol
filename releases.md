# OpenClaw Releases

_Last fetched: 2026-05-05 via GitHub REST API_

## May 2026

### OpenClaw 2026.5.4 (2026-05-05)
- Google Meet/Voice Call: Twilio dial-in joins speak through the realtime Gemini voice bridge with paced audio streaming, backpressure-aware buffering, barge-in queue.
- Gateway/Windows: bind loopback listener only to `127.0.0.1` on Windows to prevent dual-stack exposure.

### OpenClaw 2026.5.3 (2026-05-04)
- File-transfer plugin bundled, with default-deny permissions and paired-node routing.
- Core npm hotfix (2026.5.3-1): stop install scanner blocking official bundled plugins.

### Mission Control (May 2026)
- Task Board: columns now capped at ~3 visible cards with scrollbars.
- Read audio: pre-generated at creation time instead of on-demand at play.
- Read UI: play/pause icons, speed control (1x–2x), title/preview clickable to edit, delete via edit modal.
- Releases: switched to markdown-first format, fetched from GitHub releases.
- GitHub version control: Mission Control repo connected to `philmacmini26/mission-control`.

## April 2026

### OpenClaw 2026.5.2 (2026-05-02)
- External plugin installation, update, doctor repair, dependency reporting, npm-first cutover.

### OpenClaw 2026.4.29 (2026-04-30)
- Active-run steering by default, visible-reply enforcement, spawned subagent routing metadata, opt-in follow-up commitments for heartbeats.

### OpenClaw 2026.4.27 (2026-04-29)
- Codex Computer Use setup with status/install commands, marketplace discovery, fail-closed MCP checks.

### OpenClaw 2026.4.26 (2026-04-28)
- Control UI/Talk with generic browser realtime transport, Google Live browser Talk sessions, constrained ephemeral tokens.

### OpenClaw 2026.4.25 (2026-04-27)
- Full TTS upgrade: `/tts latest`, chat-scoped auto-TTS controls, personas, per-agent overrides, Azure Speech, Xiaomi, Local CLI.

### OpenClaw 2026.4.24 (2026-04-25)
- Google Meet bundled participant plugin, personal Google auth, Chrome/Twilio realtime sessions, paired-node Chrome support.

### OpenClaw 2026.4.23 (2026-04-24)
- OpenAI image generation + reference-image editing through Codex OAuth, various bug fixes.

### Mission Control (April 2026)
- Mission Control improved with safer YouTube Planner rendering and more resilient data loading.
- Goals view simplified to focus on YouTube and Skool targets.
- Mission Control server now retries on startup issues instead of dying silently.
- Mobile responsive layout with sidebar as horizontal scroll nav.
- Audio playback fixed on iOS with byte-range support.

---

_Source: [OpenClaw GitHub releases](https://github.com/openclaw/openclaw/releases) · fetched 2026-05-05 via REST API_

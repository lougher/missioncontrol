# Mission Control

Local OpenClaw Mission Control dashboard for Phil's workspace.

## Run locally

```bash
./start-mission-control.sh
```

or:

```bash
node serve.js
```

## Version control notes

This repo tracks the dashboard source code and helper scripts. Local runtime data, logs, generated read/audio content, analytics outputs, and secrets are intentionally ignored.

## Refresh Gumtree property leads

Run the public Cardiff whole-property collector from the workspace root:

```bash
python3 scripts/source_gumtree.py --area Cardiff --output property-leads/gumtree-leads.json
```

The refresh preserves existing Gumtree stages, notes and manually entered contact details. It excludes rooms and non-residential adverts, retains studios only as disqualified audit records, and does not contact advertisers.

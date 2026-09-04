#!/bin/zsh
set -euo pipefail

WORKSPACE_DIR="${HOME}/.openclaw/workspace"
SECRETS_FILE="${WORKSPACE_DIR}/secrets/mission-control.env"
if [[ -f "$SECRETS_FILE" ]]; then
  set -a
  source "$SECRETS_FILE"
  set +a
fi

cd "${WORKSPACE_DIR}/mission-control"

# Safety valve: historical launchd log files must never be allowed to eat the disk.
# The LaunchAgent now sends stdout/stderr to /dev/null, but if an old plist is
# restored later this keeps stale logs capped before the service starts.
for log_file in launchagent.err.log launchagent.out.log open-mission-control.err.log open-mission-control.out.log; do
  if [[ -f "$log_file" ]]; then
    size_bytes=$(stat -f%z "$log_file" 2>/dev/null || echo 0)
    if [[ "$size_bytes" -gt 5242880 ]]; then
      : > "$log_file"
    fi
  fi
done

exec /opt/homebrew/bin/node serve.js

#!/bin/bash
# Run once from Terminal to register both services with launchd.
set -e

PROJECT="/Users/skymane/projector-reviews"
AGENTS="$HOME/Library/LaunchAgents"

chmod +x "$PROJECT/scripts/start-claudeclaw.sh"

# ── 1. Astro dev server ────────────────────────────────────────────────────
cat > "$AGENTS/com.skymane.projector-reviews.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.skymane.projector-reviews</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npm</string>
    <string>run</string>
    <string>dev</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/skymane/projector-reviews</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key><string>/Users/skymane</string>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StandardOutPath</key><string>/Users/skymane/projector-reviews/.astro-dev.log</string>
  <key>StandardErrorPath</key><string>/Users/skymane/projector-reviews/.astro-dev.log</string>
</dict>
</plist>
EOF

# ── 2. ClaudeClaw / Telegram daemon ───────────────────────────────────────
cat > "$AGENTS/com.skymane.claudeclaw.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.skymane.claudeclaw</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$PROJECT/scripts/start-claudeclaw.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key><string>/Users/skymane</string>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin</string>
    <key>BUN_INSTALL</key><string>/Users/skymane/.bun</string>
  </dict>
  <key>StandardOutPath</key><string>/tmp/claudeclaw.log</string>
  <key>StandardErrorPath</key><string>/tmp/claudeclaw.log</string>
</dict>
</plist>
EOF

# ── 3. Decap CMS local proxy (admin panel) ────────────────────────────────
cat > "$AGENTS/com.skymane.decap-server.plist" << PEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.skymane.decap-server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npx</string>
    <string>--yes</string>
    <string>decap-server</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/skymane/projector-reviews</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key><string>/Users/skymane</string>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StandardOutPath</key><string>/tmp/decap-server.log</string>
  <key>StandardErrorPath</key><string>/tmp/decap-server.log</string>
</dict>
</plist>
PEOF

# ── Load all now (no reboot needed) ───────────────────────────────────────
launchctl unload "$AGENTS/com.skymane.projector-reviews.plist" 2>/dev/null || true
launchctl load -w "$AGENTS/com.skymane.projector-reviews.plist"

launchctl unload "$AGENTS/com.skymane.claudeclaw.plist" 2>/dev/null || true
launchctl load -w "$AGENTS/com.skymane.claudeclaw.plist"

launchctl unload "$AGENTS/com.skymane.decap-server.plist" 2>/dev/null || true
launchctl load -w "$AGENTS/com.skymane.decap-server.plist"

echo "Done. All 3 services loaded and will restart on reboot."
echo "Astro log:      $PROJECT/.astro-dev.log"
echo "Claudeclaw log: /tmp/claudeclaw.log"
echo "Decap log:      /tmp/decap-server.log"

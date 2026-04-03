# Handoff: Slack notification channel for architect handoff system

## Context

The AWWV repo-local architect→executor handoff system (`tools/architect/`) is working end-to-end:
- `run_handoff.ps1` executes Claude, captures output, writes `handoffs/results/<run>/`
- Stop hook fires via `.claude/settings.json` → `tools/architect/hooks/on_stop.ps1`
- `write_review.ps1` generates `architect_review.json` + copies to `handoffs/inbox/<run_id>.json`
- `notify.ps1` fires a local Windows notification (BurntToast → msg → bell fallback)
- `list_handoffs.ps1` and `show_handoff.ps1` let the architect review pending items

The goal now: extend `notify.ps1` (or add a new `notify_slack.ps1`) to send a compact Slack notification when a handoff completes, is blocked, or needs input.

## Slack webhook API (pre-researched)

Slack Incoming Webhooks use a simple HTTP POST:
```powershell
$body = @{ text = "your message" } | ConvertTo-Json
Invoke-RestMethod -Uri $webhookUrl -Method Post -ContentType "application/json" -Body $body
```

Webhook URL format: `https://hooks.slack.com/services/T.../B.../...`
The URL is the secret — store in `SLACK_WEBHOOK_URL` env var, never in code.

Supports Block Kit for richer formatting, but simple `text` is sufficient for this use case.

Rate limits are generous (not a concern here — one message per handoff run).

## Read first (required)

- `F:\A-War-Without-Victory\tools\architect\hooks\on_stop.ps1`
- `F:\A-War-Without-Victory\tools\architect\hooks\notify.ps1`
- `F:\A-War-Without-Victory\tools\architect\hooks\write_review.ps1`
- `F:\A-War-Without-Victory\tools\architect\hooks\on_notification.ps1`
- `F:\A-War-Without-Victory\tools\architect\run_handoff.ps1`
- `F:\A-War-Without-Victory\tools\architect\README.md`
- `F:\A-War-Without-Victory\.claude\settings.json`
- `F:\A-War-Without-Victory\docs\PROJECT_LEDGER.md` (last 30 lines)

## Mission scope

### Phase A — Slack notification script

Create `tools/architect/hooks/notify_slack.ps1`:

```powershell
param(
    [string]$Title,
    [string]$Message,
    [string]$Status,     # needs_review | blocked | needs_input | completed
    [string]$RunId,
    [string]$SessionId,
    [string]$CommitHash,
    [string]$ResultPath
)
```

Behavior:
1. Read webhook URL from env var `AWWV_SLACK_WEBHOOK_URL` (namespace-prefixed to avoid conflicts)
2. If not set → exit 0 silently (no-op)
3. Build a compact, actionable Slack message. Plain `text` block is fine. Block Kit is optional.
4. POST to webhook via `Invoke-RestMethod`. Wrap in try/catch — never fail.
5. Status emoji mapping: `needs_review` → 🔍, `blocked` → 🚫, `needs_input` → ⏳, `completed` → ✅

**Message format (example):**
```
🔍 *AWWV Handoff needs_review*
Task: command-authority-review
Run: 20260403_194716_command-authority-review
Commit: de42853a
Session: 726dfe16-...
Path: handoffs/results/20260403_194716_command-authority-review/

> First 150 chars of summary if available
```

Keep it under 500 chars total. The architect needs enough to know what to review, not a full transcript.

### Phase B — Wire into run_handoff.ps1

After `write_review.ps1` runs (and has produced `architect_review.json`), call `notify_slack.ps1` with the relevant data:
- Read `architect_review.json` to get summary, status, session_id, commit_hash
- Pass to `notify_slack.ps1`

Add to `run_handoff.ps1` after the `write_review.ps1` call:
```powershell
# Slack notification (no-op if AWWV_SLACK_WEBHOOK_URL not set)
$notifySlack = Join-Path $PSScriptRoot "hooks\notify_slack.ps1"
if (Test-Path $notifySlack) {
    $review = $null
    try { $review = Get-Content $reviewFile -Raw | ConvertFrom-Json } catch { }
    if ($review) {
        & powershell -ExecutionPolicy Bypass -File $notifySlack `
            -Title "AWWV Handoff" `
            -Message ($review.summary ?? '') `
            -Status ($review.status ?? 'needs_review') `
            -RunId $runId `
            -SessionId ($review.session_id ?? '') `
            -CommitHash ($review.commit_hash ?? '') `
            -ResultPath $resultDir
    }
}
```

### Phase C — Wire into on_notification.ps1 hook (needs_input case)

When the Notification hook fires (Claude waiting for input), also send a Slack ping.

In `on_notification.ps1`, after writing `status.txt` for needs_input notifications, call `notify_slack.ps1` with `Status = "needs_input"`.

The hook already has access to `AWWV_HANDOFF_RESULT_DIR` and `AWWV_HANDOFF_RUN_ID`.

### Phase D — README / docs

Update `tools/architect/README.md`:
- Add a "Slack notifications" section under v2 docs
- Explain: set `AWWV_SLACK_WEBHOOK_URL` in your shell profile or `.env.local`
- Document how to create a Slack app and webhook (brief — link to official docs)
- Note: never commit the webhook URL

### Phase E — Recommendation doc

Add a short section to the implementation report:

**Why Slack first:**
- Zero SDK, zero dependency: one `Invoke-RestMethod` call
- Webhook URL is the only secret needed
- Async, non-blocking, no auth flow
- Developer-native (Slack is already in the dev workflow)

**Why WhatsApp later (or not at all):**
- Requires Twilio account + paid API + phone number registration
- WhatsApp Business API adds compliance overhead
- Twilio webhook setup is more complex (auth token, from-number, phone lookup)
- Not worth the dependency for internal dev workflow notifications
- Document as "deferred v4" — only if Slack proves insufficient

## Important constraints

- `notify_slack.ps1` must be a complete no-op when `AWWV_SLACK_WEBHOOK_URL` is not set
- Never log or print the webhook URL
- All Slack calls wrapped in try/catch — never block the handoff run
- Do NOT commit a real webhook URL — use env var only
- Keep the script under 80 lines
- Do not add npm/Node.js dependencies — pure PowerShell only

## Dry-run verification

Since we can't guarantee a real Slack workspace is available, demonstrate dry-run behavior:

1. Show what the script does when `AWWV_SLACK_WEBHOOK_URL` is not set (should exit 0, no output)
2. Show what the Slack payload would look like by running with a mock/fake URL and capturing the would-be POST body
3. Optionally: if a real test webhook URL is available as env var, demonstrate a live send

Add a `-DryRun` switch to `notify_slack.ps1` that prints the payload without sending.

## Verification

- PowerShell syntax check on `notify_slack.ps1`:
  ```powershell
  $null = [System.Management.Automation.Language.Parser]::ParseFile(
    "tools/architect/hooks/notify_slack.ps1", [ref]$null, [ref]$null)
  ```
- `powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1`
- Dry-run demonstration (see above)

## Required outputs

- `tools/architect/hooks/notify_slack.ps1`
- Updated `tools/architect/run_handoff.ps1`
- Updated `tools/architect/hooks/on_notification.ps1`
- Updated `tools/architect/README.md` (Slack section)
- Implementation report: `docs/40_reports/implemented/20260403_slack_notifications.md`
- Ledger update: `docs/PROJECT_LEDGER.md`

## Required completion block

```
Canonical owner:
Demoted path:
Player-visible truth:
Canonical UI surface:
Done means:
```

## Shell notes

- Windows, PowerShell. Use `;` not `&&`.
- All hook scripts are PowerShell (.ps1) — pure PowerShell, no Node/Python.
- Paths use forward slashes in settings.json, backslashes inside PS scripts.

Commit cleanly when done.

# Architect Handoff System

File-backed workflow for architect-to-executor task handoff using Claude Code CLI.

## How it works

```
Architect writes prompt  -->  Runner executes via claude -p  -->  Results saved to disk
     handoffs/*.md              tools/architect/run_handoff.ps1      handoffs/results/<run>/
```

**No clipboard. No manual chat relay. No tmux required.**

## Directory structure

```
handoffs/
  TEMPLATE.md              # Standard handoff template
  sector-cleanup.md        # Example: a real handoff prompt
  results/
    20260403_190000_sector-cleanup/
      meta.json            # Run metadata (timestamps, session ID, status)
      prompt.md            # Copy of the prompt that was executed
      raw_output.json      # Raw claude JSON output
      response.md          # Extracted text response
      session_id.txt       # Session ID for resume
tools/architect/
  run_handoff.ps1          # Main runner
  new_handoff.ps1          # Create handoff from template
  resume_handoff.ps1       # Resume a previous session
  README.md                # This file
```

## Workflow

### 1. Create a handoff

```powershell
.\tools\architect\new_handoff.ps1 -Name sector-cleanup
# Edit handoffs/sector-cleanup.md with your task
```

Or write the markdown file directly. Use `handoffs/TEMPLATE.md` as a starting point.

### 2. Execute the handoff

```powershell
# Standard execution
.\tools\architect\run_handoff.ps1 -PromptFile handoffs\sector-cleanup.md

# With worktree isolation (for implementation tasks)
.\tools\architect\run_handoff.ps1 -PromptFile handoffs\sector-cleanup.md -Worktree

# Custom model/budget
.\tools\architect\run_handoff.ps1 -PromptFile handoffs\sector-cleanup.md -Model sonnet -MaxBudget 2
```

### 3. Review results

```powershell
# Results are in handoffs/results/<timestamp>_<name>/
cat handoffs\results\20260403_190000_sector-cleanup\response.md
cat handoffs\results\20260403_190000_sector-cleanup\meta.json
```

### 4. Resume if needed

```powershell
# Resume interactively
.\tools\architect\resume_handoff.ps1 -ResultDir handoffs\results\20260403_190000_sector-cleanup

# Resume with a follow-up prompt
.\tools\architect\resume_handoff.ps1 -ResultDir handoffs\results\20260403_190000_sector-cleanup -Prompt "Now run the tests"

# Resume by session ID directly
.\tools\architect\resume_handoff.ps1 -SessionId <session-uuid>
```

## Parameters

### run_handoff.ps1

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-PromptFile` | (required) | Path to handoff markdown |
| `-Name` | filename | Human label for the run |
| `-Worktree` | off | Isolated git worktree |
| `-Model` | opus | Claude model |
| `-PermissionMode` | bypassPermissions | Permission level |
| `-MaxBudget` | 5.0 | Max USD spend |

## Writing good handoff prompts

1. **Be specific.** "Fix the sector split meaning" is better than "clean up sectors."
2. **Include read-first.** The executor starts cold every time.
3. **Scope to one slice.** One vertical, not a shopping list.
4. **Name the files.** Don't make the executor search for what to change.
5. **State done-means.** How does the executor know they're finished?

## Auditing

Every run leaves a full audit trail in `handoffs/results/`:
- The exact prompt that was sent
- The raw JSON response from Claude
- The extracted text response
- Metadata (timestamps, duration, session ID, exit code)

Session IDs enable resume if a run is interrupted or needs follow-up.

## v2 ideas (not implemented)

- tmux-based parallel handoff execution
- Automatic ledger/napkin check on handoff completion
- Handoff chaining (output of one becomes input to next)
- Budget tracking across runs

---

## v2 — Hook-driven completion + Architect inbox

v2 adds automatic signaling, inbox artifact generation, Windows notifications, and review helpers. v1 workflow is unchanged; v2 features activate only inside handoff runs.

### What's new

```
tools/architect/
  hooks/
    on_stop.ps1         # Stop hook — fires when Claude finishes
    on_notification.ps1 # Notification hook — fires on Claude notifications
    write_review.ps1    # Generates architect_review.json + inbox copy
    notify.ps1          # Windows notification (BurntToast / msg * / bell)
  list_handoffs.ps1     # List pending inbox items
  show_handoff.ps1      # Show a handoff result + paste-ready summary
handoffs/
  inbox/                # architect_review.json per completed run (gitignored)
    .gitkeep
```

### How v2 works

1. `run_handoff.ps1` sets `AWWV_HANDOFF_RUN_ID` and `AWWV_HANDOFF_RESULT_DIR` before calling claude.
2. When claude exits, the `Stop` hook fires `on_stop.ps1`:
   - Writes `completion_signal.json` to the result dir.
   - Calls `write_review.ps1` → generates `architect_review.json` + copies to `handoffs/inbox/<run_id>.json`.
   - Fires a Windows notification via `notify.ps1`.
3. If the Stop hook didn't fire (edge case), `run_handoff.ps1` calls `write_review.ps1` directly as a fallback.
4. `Notification` hook fires `on_notification.ps1` for mid-run events (appends to `notifications.log`, rings bell, writes `status.txt` if input needed).

All hooks are **silent no-ops** outside of handoff runs (env var absent = exit 0).

### Reviewing results

```powershell
# List all inbox items (needs_review highlighted in yellow)
.\tools\architect\list_handoffs.ps1

# Show most recent item + paste-ready architect summary
.\tools\architect\show_handoff.ps1

# Show a specific run
.\tools\architect\show_handoff.ps1 -RunId 20260403_190000_sector-cleanup
```

### architect_review.json fields

| Field | Description |
|-------|-------------|
| `task_name` | Human label from the run |
| `run_id` | Timestamped run identifier |
| `session_id` | Claude session ID (for resume) |
| `branch` | Git branch at completion |
| `commit_hash` | HEAD commit at completion |
| `summary` | First 500 chars of response.md |
| `files_changed` | From `git diff --name-only HEAD` + `git status` |
| `tests_run` | Always `false` for now (future: parse test output) |
| `completion_block` | Text after `## Done` or `Done means:` in response |
| `status` | `needs_review` on creation |
| `generated_at` | ISO 8601 timestamp |

### Windows notification fallback chain

1. BurntToast module (best UX — install once with `Install-Module BurntToast`)
2. **WScript.Shell Popup** — canonical fallback; modal dialog, always visible, auto-dismisses after 8s. Confirmed working on Windows 11 Pro 10.0.26200. Sets `$notified = $true`.
3. `msg * /TIME:5 "AWWV: ..."` — attempt only; exits 0 but no visible popup on Windows 11 without terminal services. Does NOT set `$notified`.
4. Terminal bell `[console]::beep(800, 300)` — audio-only last resort if all visual methods fail.

Each attempt emits one `[notify] method: delivered/failed` line to stdout. `run_handoff.ps1` captures this and prints `Notify: [notify] ...` in the runner summary alongside the `Slack:` line.

### Slack notifications

Optional Slack notifications fire when a handoff completes, is blocked, or needs input. Zero dependencies — pure PowerShell `Invoke-RestMethod`.

**Setup:**

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps) → Incoming Webhooks → Activate → Add to channel.
2. Copy the webhook URL (`https://hooks.slack.com/services/T.../B.../...`).
3. Set it as a **persistent user-level env var** (survives new shells, no profile editing needed):
   ```powershell
   [System.Environment]::SetEnvironmentVariable('AWWV_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/T.../B.../...', 'User')
   ```
   Or set it in the current process only (lost when shell closes):
   ```powershell
   $env:AWWV_SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T.../B.../..."
   ```
4. **Never commit the webhook URL.** It is the only secret.

**Behavior:**

- `run_handoff.ps1` checks process env first, then user-level env automatically.
- If found in process env → `Slack: SENT (process env)`.
- If found in user env only → `Slack: SENT (user env)`.
- If absent everywhere → `Slack: SKIPPED` (silent no-op).
- Fires after `write_review.ps1` in `run_handoff.ps1` (completion/review).
- Fires from `on_notification.ps1` when Claude needs input mid-run.
- Status emoji: 📋 `needs_review` | 🚨 `blocked` | ✋ `needs_input` | ✅ `completed`.
- All calls wrapped in try/catch — never blocks the handoff pipeline.

**Dry run (test without Slack):**

```powershell
.\tools\architect\hooks\notify_slack.ps1 -Title "Test" -Message "hello" -Status needs_review -RunId "test_run" -DryRun
```

**Script:** `tools/architect/hooks/notify_slack.ps1`

### Constraints

- Hook scripts are idempotent — safe to call multiple times.
- Hook failures are non-fatal — they never break the handoff run itself.
- Inbox JSON files are gitignored; `.gitkeep` tracks the directory.
- Env vars `AWWV_HANDOFF_RUN_ID` / `AWWV_HANDOFF_RESULT_DIR` are cleared after each run.

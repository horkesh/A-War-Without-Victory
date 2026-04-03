# Slack Notifications for Architect Handoff System

**Date:** 2026-04-03
**Status:** Implemented

## Summary

Extended the architect handoff system with optional Slack notifications. When a handoff completes, is blocked, or needs input, a compact message is posted to a configured Slack channel via Incoming Webhook.

## Files changed

| File | Change |
|------|--------|
| `tools/architect/hooks/notify_slack.ps1` | **New** — Slack notification script (75 lines) |
| `tools/architect/run_handoff.ps1` | Wired Slack call after `write_review.ps1` |
| `tools/architect/hooks/on_notification.ps1` | Wired Slack call for `needs_input` status |
| `tools/architect/README.md` | Added Slack notifications section |
| `docs/40_reports/implemented/20260403_slack_notifications.md` | This report |
| `docs/PROJECT_LEDGER.md` | Ledger entry |

## Design decisions

### Why Slack first

- **Zero SDK, zero dependency**: one `Invoke-RestMethod` call in PowerShell.
- **Webhook URL is the only secret**: no OAuth flow, no token rotation, no app review.
- **Async, non-blocking**: POST-and-forget, wrapped in try/catch.
- **Developer-native**: Slack is already in the dev workflow — no context switch.

### Why WhatsApp later (or not at all)

- Requires Twilio account + paid API + phone number registration.
- WhatsApp Business API adds compliance overhead (Meta approval, template messages).
- Twilio webhook setup is more complex (auth token, from-number, phone lookup).
- Not worth the dependency for internal dev workflow notifications.
- **Deferred to v4** — only if Slack proves insufficient for the use case.

## Integration points

1. **`run_handoff.ps1`** — after `write_review.ps1` produces `architect_review.json`, reads it and calls `notify_slack.ps1` with summary, status, run ID, session ID, commit hash, and result path.
2. **`on_notification.ps1`** — when Claude emits a notification matching `needs_input` patterns, fires `notify_slack.ps1` with the notification message.
3. **`on_stop.ps1`** — unchanged; the Stop hook fires the Windows notification only. Slack fires from the runner where review data is complete.

## Message format

```
📋 *AWWV Handoff needs_review*
Task: command-authority-review
Run: 20260403_194716_command-authority-review
Commit: de42853a
Session: 726dfe16-...
Path: handoffs/results/20260403_194716_command-authority-review/

> First 150 chars of summary text...
```

Status emoji: 📋 needs_review | 🚨 blocked | ✋ needs_input | ✅ completed

## Constraints

- Silent no-op when `AWWV_SLACK_WEBHOOK_URL` is not set.
- Webhook URL never logged or printed.
- All HTTP calls wrapped in try/catch — never block the handoff pipeline.
- Pure PowerShell — no npm/Node.js/Python dependencies.
- `-DryRun` switch prints payload without sending.

## Completion block

```
Canonical owner: tools/architect/hooks/notify_slack.ps1
Demoted path: none (new capability)
Player-visible truth: n/a (dev tooling)
Canonical UI surface: Slack channel (configured by webhook URL)
Done means: Slack message arrives when handoff completes or needs input; silent no-op when unconfigured
```

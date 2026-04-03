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

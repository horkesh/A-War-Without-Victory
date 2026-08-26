#!/usr/bin/env bash
# GUARD: reading a file that is MODIFIED in the working tree.
#
# WHY THIS EXISTS (2026-08-26):
# The RE evidence packet cited `pre_planned_operations.ts:1163` and tagged it
# [SOURCE-VERIFIED at HEAD]. That file was +69/-5 in the working tree from another
# agent's in-flight calibration lane, so the true HEAD lines were 1231/1260/1262/1263
# and 1330-1362. Every downstream seat that re-checked at HEAD landed in unrelated
# code. The packet also restated pre-fix prose about a gap that had been closed two
# days earlier — because the fix was committed but the reader was looking at a
# working copy that predated their own mental model.
#
# Line numbers and file contents cited from a dirty tree are NOT HEAD, and in a repo
# where several agents share one checkout that is the normal case, not the exception.
#
# Exit 0 always. Emits PostToolUse additionalContext only when the file is dirty.
set -uo pipefail

payload="$(cat)"

path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)"
[ -z "$path" ] && exit 0

# Only meaningful for source/data/doc files inside a git repo.
case "$path" in
  *node_modules*|*/.git/*) exit 0 ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -z "$repo_root" ] && exit 0

# Normalize to a repo-relative path with forward slashes.
abs="$(printf '%s' "$path" | tr '\\' '/')"
root="$(printf '%s' "$repo_root" | tr '\\' '/')"
rel="${abs#"$root"/}"
[ "$rel" = "$abs" ] && rel="$(printf '%s' "$path" | tr '\\' '/')"

# A directory target (Grep path) has nothing to say about line numbers.
[ -d "$path" ] && exit 0

dirty="$(git -C "$repo_root" diff --name-only -- "$rel" 2>/dev/null; git -C "$repo_root" diff --cached --name-only -- "$rel" 2>/dev/null)"
# UNTRACKED is the worse case: the file does not exist at HEAD AT ALL, so a [SOURCE-VERIFIED at
# HEAD] citation from it is not merely off by some lines, it is fiction. (QA seat, 2026-08-26.)
untracked="$(git -C "$repo_root" ls-files --others --exclude-standard -- "$rel" 2>/dev/null)"
if [ -n "$untracked" ]; then
  esc_u="$(printf '%s' "$rel" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"UNTRACKED-FILE GUARD. `%s` is UNTRACKED — it does not exist at HEAD at all. A [SOURCE-VERIFIED at HEAD] citation from this file is not off by a few lines, it is fiction, and `git show HEAD:%s` will FAIL rather than correct you. It may be another agent'"'"'s in-flight work. Establish whose it is, and whether it is real, before citing it."}}\n' "$esc_u" "$esc_u"
  exit 0
fi
[ -z "$dirty" ] && exit 0

esc_rel="$(printf '%s' "$rel" | sed 's/\\/\\\\/g; s/"/\\"/g')"
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"DIRTY-TREE GUARD. `%s` is MODIFIED in the working tree — what you just read is NOT HEAD. Line numbers, function bodies and comments may belong to another agent'"'"'s uncommitted work. ⇒ If you are about to cite a line number, quote a constant, or record a [SOURCE-VERIFIED] fact from this file, re-read it as `git show HEAD:%s` first, and say WHICH ref you read. ⇒ THIS EXACT ERROR shipped on 2026-08-26: the RE packet cited pre_planned_operations.ts:1163 [SOURCE-VERIFIED at HEAD] from a tree that was +69/-5, so the real HEAD lines were 1231/1260/1262/1263 and every seat that re-checked landed in unrelated code. ⇒ Also prefer a grep ANCHOR over a line number in any document that will outlive today."}}\n' "$esc_rel" "$esc_rel"

exit 0

# Remove heredoc BODIES from a shell command, keeping the command lines themselves.
#
# WHY THIS EXISTS. A blocking guard has to answer "is this text a command, or is it prose
# ABOUT a command?" Quoted text is easy to strip; a heredoc body is not quoted, and it is
# exactly where this repo writes its ledger entries and commit messages. On 2026-09-10 the
# stash guard's first real use blocked the commit that documented it, for that reason.
#
# So: a guard that denies must not read heredoc bodies. Prose describing a rule must stay
# writable, or the rule stops being documentable — and an undocumentable rule is worse than
# an unguarded one.
#
# Handles `<<WORD`, `<<-WORD`, `<<'WORD'` and `<<"WORD"`. Here-STRINGS (`<<<`) are left alone:
# they carry no body, and their content is already quoted.
#
# Usage: printf '%s' "$cmd" | awk -f tools/hooks/lib/strip_heredocs.awk
{
  if (indoc) {
    line = $0
    sub(/[[:space:]]+$/, "", line)
    sub(/^[[:space:]]+/, "", line)   # `<<-` allows an indented terminator
    if (line == delim) indoc = 0
    next
  }

  line = $0

  # A here-string (`<<<`) is not a heredoc — skip it so `<<< "$x"` is not read as `<<` + `<`.
  probe = line
  gsub(/<<</, "__HERESTRING__", probe)

  if (match(probe, /<<-?[[:space:]]*("[^"]+"|'[^']+'|[A-Za-z_][A-Za-z0-9_]*)/)) {
    d = substr(probe, RSTART, RLENGTH)
    sub(/^<<-?[[:space:]]*/, "", d)
    gsub(/["']/, "", d)
    delim = d
    indoc = 1
  }

  print line
}

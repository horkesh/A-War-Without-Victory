# Does this shell command pass a MULTI-LINE script to an interpreter's -e/-c flag?
#
# Prints the offending interpreter name and exits with a match; prints nothing otherwise.
# Reads the whole command as one record, because the thing being detected spans lines.
#
# The scan is deliberately literal: find `node -e` (or --eval, or python -c) followed by an
# opening quote, then walk forward to the matching close quote. If a newline appears before the
# close, the script is multi-line.
#
# Usage: printf '%s' "$cmd" | awk -f tools/hooks/lib/find_multiline_eval.awk

BEGIN { RS = "\001" }   # one record: the command may contain newlines

{
  cmd = $0
  n = length(cmd)

  # Interpreter/flag pairs whose inline form breaks when it spans lines.
  split("node:-e node:--eval python:-c python3:-c", pairs, " ")

  for (p = 1; p in pairs; p++) {
    split(pairs[p], parts, ":")
    interp = parts[1]
    flag = parts[2]
    needle = interp " " flag

    start = 1
    while ((at = index(substr(cmd, start), needle)) > 0) {
      pos = start + at - 1 + length(needle)

      # Skip spaces between the flag and its argument.
      while (pos <= n && substr(cmd, pos, 1) == " ") pos++

      quote = substr(cmd, pos, 1)
      if (quote == "\"" || quote == "'") {
        sawNewline = 0
        for (i = pos + 1; i <= n; i++) {
          ch = substr(cmd, i, 1)
          if (ch == "\n") sawNewline = 1
          if (ch == quote) break
        }
        if (sawNewline) {
          print interp " " flag
          exit 0
        }
      }
      start = start + at
    }
  }
}

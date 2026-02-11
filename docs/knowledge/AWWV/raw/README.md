# Raw conversation ingest (Phase 1)

Per-conversation markdown files from ChatGPT and Claude exports. **Chronological order preserved; no summarization; no merging.**

- **Naming:** `YYYY-MM-DD_<source>_<short_slug>.md` where `<source>` ∈ {chatgpt, claude}.
- **Claude duplicates:** When two conversations share the same title, the second run of the parser uses an 8-char UUID suffix (e.g. `_b1d9d5b3`). Prefer **uid-suffixed** files as the unique conversation; older files without the suffix may be overwritten on re-run.
- **Metadata:** Each file has a YAML header with `title`, `date`, `source`, `confidence`, `primary_topics`. Below: **User** / **Assistant** turns verbatim.
- **Context gaps:** If content was incomplete or truncated, `⚠ CONTEXT GAP` and a short description of what seems missing may appear; no content is invented.

**Sources:** `docs/knowledge/ChatGPT/conversations.json`, `docs/knowledge/Claude/conversations.json`. Regenerate with `npx tsx tools/knowledge_ingest/parse_chatgpt_export.ts` and `npx tsx tools/knowledge_ingest/parse_claude_export.ts`.

# Input files for data extraction

The 1990 municipal election winners source is an **Excel** file in `data/source`:

- **Canonical path:** `data/source/1990 to 1995 municipalities_BiH.xlsx`
- Override: `npm run data:extract1990 -- --input path/to/file.xlsx`

The extractor expects columns: Municipality (post-1995 name), Party that won 1990 elections. See PROJECT_LEDGER Phase 6B.2 and Phase H1.2.2.

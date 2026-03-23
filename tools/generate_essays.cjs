#!/usr/bin/env node
/**
 * Generate historical essays for AWWV Codex via Claude Sonnet API.
 * Reads essay_index.json, generates missing essays, saves to individual JSON files.
 *
 * Usage:
 *   node tools/generate_essays.cjs              # Generate all missing
 *   node tools/generate_essays.cjs --batch 5    # Generate first 5 missing
 *   node tools/generate_essays.cjs --dry-run    # Show what would be generated
 *
 * Requires ANTHROPIC_API_KEY in .env or environment.
 */
const fs = require('fs');
const path = require('path');

// Load .env
try {
    const envPath = path.resolve(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    }
} catch { /* no .env file */ }

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY not found in environment or .env');
    process.exit(1);
}

const ESSAYS_DIR = path.resolve(__dirname, '..', 'data', 'scenarios', 'essays');
const INDEX_PATH = path.join(ESSAYS_DIR, 'essay_index.json');
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const TARGET_WORDS = 500;

const args = process.argv.slice(2);
const batchLimit = args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1]) || 5 : Infinity;
const dryRun = args.includes('--dry-run');

async function callSonnet(prompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
}

function buildPrompt(entry) {
    return `Write a ${TARGET_WORDS}-word historical essay about the following event from the 1992-1995 Bosnian War.

EVENT: ${entry.title}
EVENT ID: ${entry.event_id}
YEAR: ${entry.year}
CATEGORY: ${entry.category}
SOURCES TO REFERENCE: ${entry.sources.join(', ')}

REQUIREMENTS:
- Exactly ~${TARGET_WORDS} words (±50)
- Educational tone, suitable for a strategy game about the Bosnian War
- Respectful and balanced — present perspectives from all relevant sides
- Reference the historical sources provided
- No glorification of violence, no political advocacy
- Focus on the strategic/political significance, not graphic details
- Include context about what led to this event and its consequences
- Mention specific actors, locations, and dates where historically accurate

Write the essay directly, no preamble or meta-text.`;
}

async function main() {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    const essays = index.essays ?? index;

    // Find which essays need generation
    const pending = essays.filter(e => {
        const filePath = path.join(ESSAYS_DIR, `${e.event_id}.json`);
        return !fs.existsSync(filePath);
    });

    console.log(`Total essays: ${essays.length}`);
    console.log(`Already generated: ${essays.length - pending.length}`);
    console.log(`Pending: ${pending.length}`);
    console.log(`Batch limit: ${batchLimit === Infinity ? 'all' : batchLimit}`);
    console.log(`Dry run: ${dryRun}`);
    console.log('');

    const toGenerate = pending.slice(0, batchLimit);
    if (dryRun) {
        for (const e of toGenerate) {
            console.log(`  Would generate: ${e.event_id} — "${e.title}"`);
        }
        return;
    }

    let totalCost = 0;
    let generated = 0;

    for (const entry of toGenerate) {
        console.log(`[${generated + 1}/${toGenerate.length}] Generating: ${entry.event_id} — "${entry.title}"...`);
        try {
            const prompt = buildPrompt(entry);
            const content = await callSonnet(prompt);
            const wordCount = content.split(/\s+/).length;

            const essayFile = {
                id: entry.id,
                event_id: entry.event_id,
                title: entry.title,
                year: entry.year,
                category: entry.category,
                sources: entry.sources,
                word_count: wordCount,
                content,
                generated_at: new Date().toISOString(),
                model: MODEL,
            };

            const outPath = path.join(ESSAYS_DIR, `${entry.event_id}.json`);
            fs.writeFileSync(outPath, JSON.stringify(essayFile, null, 2));

            // Rough cost estimate: ~1500 input tokens + ~700 output tokens per essay
            const estCost = (1500 * 0.003 + 700 * 0.015) / 1000; // Sonnet pricing
            totalCost += estCost;
            generated++;

            console.log(`  ✓ ${wordCount} words, est cost: $${estCost.toFixed(4)}`);

            // Rate limiting — 1 second between calls
            if (generated < toGenerate.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            console.error(`  ✗ Failed: ${err.message}`);
        }
    }

    console.log(`\nDone. Generated: ${generated}/${toGenerate.length}. Estimated total cost: $${totalCost.toFixed(2)}`);

    // Update index with generated status
    for (const entry of essays) {
        const filePath = path.join(ESSAYS_DIR, `${entry.event_id}.json`);
        entry.generated = fs.existsSync(filePath);
    }
    fs.writeFileSync(INDEX_PATH, JSON.stringify({ essays }, null, 2));
    console.log('Updated essay_index.json');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});

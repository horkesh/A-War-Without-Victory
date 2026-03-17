#!/usr/bin/env node
/**
 * Generate CO cross-assessments: each commander assesses the other two armies.
 * Run after a three-commander campaign to produce "The Good, The Bad, The Ugly" from each perspective.
 *
 * Usage: ANTHROPIC_API_KEY=... npx tsx tools/claude_plays_vrs/generate_co_assessments.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Assessment {
    assessor: string;
    assessor_faction: string;
    target_faction: string;
    target_commander: string;
    the_good: string;
    the_bad: string;
    the_ugly: string;
}

async function main(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

    const client = new Anthropic({ apiKey });
    const baseDir = process.cwd();
    const runDir = join(baseDir, 'runs/three_commanders');

    // Load campaign log
    const log = JSON.parse(await readFile(join(runDir, 'campaign_log.json'), 'utf8'));
    const diag = JSON.parse(await readFile(join(runDir, 'diagnostic_report.json'), 'utf8'));

    // Extract final state summary
    const finalTurn = log[log.length - 1];
    const territory = finalTurn.territory;
    const personnel = finalTurn.personnel;

    // Collect all briefings per faction
    const briefingsByFaction: Record<string, string[]> = { RS: [], RBiH: [], HRHB: [] };
    for (const t of log) {
        for (const d of (t.decisions || [])) {
            if (d.briefing && d.faction && briefingsByFaction[d.faction]) {
                briefingsByFaction[d.faction].push(`w${t.turn}: ${d.briefing.slice(0, 200)}`);
            }
        }
    }

    // Collect observations per faction
    const obsByFaction: Record<string, string[]> = { RS: [], RBiH: [], HRHB: [] };
    for (const o of diag) {
        if (obsByFaction[o.faction]) {
            obsByFaction[o.faction].push(`[${o.severity}] ${o.description.slice(0, 150)}`);
        }
    }

    const commanders: Array<{ faction: string; name: string; personality: string }> = [
        { faction: 'RS', name: 'Ratko Mladić', personality: 'Aggressive, contemptuous, professional. JNA tradition. Speaks in military jargon. Judges others harshly.' },
        { faction: 'RBiH', name: 'Rasim Delić', personality: 'Professional, measured. Building an army from nothing. Values international law. Sees the bigger picture.' },
        { faction: 'HRHB', name: 'Milivoj Petković', personality: 'Cautious, politically aware. Constrained by Zagreb. Watches both RS and RBiH carefully.' },
    ];

    const assessments: Assessment[] = [];
    let totalCost = 0;

    for (const assessor of commanders) {
        for (const target of commanders) {
            if (assessor.faction === target.faction) continue;

            const system = `You are ${assessor.name}, ${assessor.personality}
You have just completed a 40-week campaign as commander of the ${assessor.faction} faction.
You are now writing a classified after-action assessment of ${target.name}'s ${target.faction} forces.
Be IN CHARACTER. Be specific. Reference actual events, territory percentages, and force numbers.
Be honest — the good AND the bad AND the ugly.`;

            const user = `CAMPAIGN SUMMARY (40 weeks):

YOUR FACTION (${assessor.faction}):
- Final territory: ${territory[assessor.faction]?.pct ?? '?'}% (${territory[assessor.faction]?.area_km2 ?? '?'} km²)
- Final force: ${personnel[assessor.faction]?.total?.toLocaleString() ?? '?'} personnel, ${personnel[assessor.faction]?.brigades ?? '?'} brigades
- Your briefings: ${briefingsByFaction[assessor.faction]?.slice(-5).join(' | ') ?? 'none'}

${target.name}'s FACTION (${target.faction}):
- Final territory: ${territory[target.faction]?.pct ?? '?'}% (${territory[target.faction]?.area_km2 ?? '?'} km²)
- Final force: ${personnel[target.faction]?.total?.toLocaleString() ?? '?'} personnel, ${personnel[target.faction]?.brigades ?? '?'} brigades
- Their briefings: ${briefingsByFaction[target.faction]?.slice(-5).join(' | ') ?? 'none'}
- Observations about them: ${obsByFaction[target.faction]?.slice(0, 5).join(' | ') ?? 'none'}

Write your assessment as ${assessor.name}. IN CHARACTER. Respond with JSON:
{
    "the_good": "<what they did well, 2-3 sentences>",
    "the_bad": "<what they did poorly, 2-3 sentences>",
    "the_ugly": "<the worst thing about their war effort, 1-2 sentences — be brutally honest>"
}`;

            try {
                const response = await client.messages.create({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 512,
                    temperature: 0.3, // Slight creativity for character voice
                    system,
                    messages: [{ role: 'user', content: user }],
                });

                const text = response.content
                    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                    .map(block => block.text).join('');

                const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
                const cleaned = match ? match[1].trim() : text.trim();
                const parsed = JSON.parse(cleaned);

                assessments.push({
                    assessor: assessor.name,
                    assessor_faction: assessor.faction,
                    target_faction: target.faction,
                    target_commander: target.name,
                    the_good: parsed.the_good ?? '',
                    the_bad: parsed.the_bad ?? '',
                    the_ugly: parsed.the_ugly ?? '',
                });

                totalCost += (response.usage.input_tokens * 0.8 + response.usage.output_tokens * 4) / 1_000_000;
                console.log(`  ${assessor.name} → ${target.name}: done`);
            } catch (err) {
                console.warn(`  ${assessor.name} → ${target.name}: FAILED (${err})`);
            }
        }
    }

    // Save
    await writeFile(join(runDir, 'co_cross_assessments.json'), JSON.stringify(assessments, null, 2), 'utf8');

    // Print
    console.log('\n' + '═'.repeat(72));
    console.log('  CO CROSS-ASSESSMENTS — The Good, The Bad, The Ugly');
    console.log('═'.repeat(72));

    for (const a of assessments) {
        console.log(`\n  ${a.assessor.toUpperCase()} (${a.assessor_faction}) on ${a.target_commander} (${a.target_faction}):`);
        console.log(`    THE GOOD: ${a.the_good}`);
        console.log(`    THE BAD:  ${a.the_bad}`);
        console.log(`    THE UGLY: ${a.the_ugly}`);
    }

    console.log(`\n  Cost: $${totalCost.toFixed(4)}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

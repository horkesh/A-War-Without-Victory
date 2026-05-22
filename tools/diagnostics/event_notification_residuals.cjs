#!/usr/bin/env node
const { readdirSync, readFileSync } = require('fs');
const { join, resolve } = require('path');

const FACTIONS = ['RBiH', 'RS', 'HRHB'];
const EVENTS_DIR = resolve(__dirname, '..', '..', 'data', 'scenarios', 'events');

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function loadWarEventFiles() {
  return readdirSync(EVENTS_DIR)
    .filter((name) => /^war_\d{4}\.json$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((file) => ({
      file,
      events: JSON.parse(readFileSync(join(EVENTS_DIR, file), 'utf8')),
    }));
}

function collectResiduals() {
  const rows = [];

  for (const { file, events } of loadWarEventFiles()) {
    for (const event of events) {
      if (!event || event.requires_player_response !== true || !Array.isArray(event.response_options)) {
        continue;
      }

      const source = event.responding_faction;
      if (!FACTIONS.includes(source)) {
        continue;
      }

      const expectedRecipients = FACTIONS.filter((faction) => faction !== source);
      const missing = [];

      for (const response of event.response_options) {
        if (!response || typeof response.id !== 'string') {
          continue;
        }

        const byRecipient = event.notifications_to_other_factions?.[response.id] ?? {};
        for (const recipient of expectedRecipients) {
          const notification = byRecipient[recipient];
          if (!notification || !isNonEmptyText(notification.headline) || !isNonEmptyText(notification.body)) {
            missing.push({ response: response.id, recipient });
          }
        }
      }

      if (missing.length > 0) {
        rows.push({
          file,
          event: event.id,
          source,
          missing_blocks: missing.length,
          missing,
        });
      }
    }
  }

  return rows;
}

function main() {
  const asJson = process.argv.includes('--json');
  const rows = collectResiduals();
  const payload = {
    rows: rows.length,
    missing_blocks: rows.reduce((sum, row) => sum + row.missing_blocks, 0),
    residuals: rows,
  };

  if (asJson) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  console.log(`Event notification residuals: ${payload.rows} rows / ${payload.missing_blocks} recipient blocks`);
  for (const row of rows) {
    const missing = row.missing.map((entry) => `${entry.response}->${entry.recipient}`).join(', ');
    console.log(`- ${row.file} ${row.event} (${row.source}): ${row.missing_blocks} [${missing}]`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { collectResiduals };

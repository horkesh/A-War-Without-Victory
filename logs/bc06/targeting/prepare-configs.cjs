'use strict';
// Reuse existing synthetic saves; do not advance a campaign or alter fixtures.
const fs = require('node:fs');
const path = require('node:path');
const { eligibleRegularFormations } = require('../../../src/desktop/decorate_unit_contract.cjs');
const root = path.resolve('logs/bc06');
const template = JSON.parse(fs.readFileSync(path.join(root, 'config-gesture-decorate.json'), 'utf8'));
const at = (path, equals) => ({ path, equals });
for (const faction of ['RBiH', 'RS', 'HRHB']) {
  const suffix = faction.toLowerCase();
  const fixture = path.join(root, `fixture-${suffix}-1.json`);
  const state = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const eligible = eligibleRegularFormations(state, faction);
  const target = eligible[0];
  const other = eligible[1];
  const foreign = Object.keys(state.military.formations).sort().find(id => {
    const f = state.military.formations[id];
    return f.faction !== faction && f.status === 'active' && f.morale === 50 && f.cohesion === 50;
  });
  if (!target || !other || !foreign) throw Error(`Missing controls: ${faction}`);
  const eventId = `decorate_a_unit_${suffix}`;
  const fields = [at(['military', 'command_authority', 'current'], 90),
    at(['military', 'event_fire_counts', eventId], 1),
    at(['military', 'event_last_fired_turn', eventId], 90),
    at(['military', 'pending_event_decisions'], []),
    at(['military', 'event_decision_log'], [{event_id:eventId,
      response_id:`decorate_steadfast_${suffix}__${target.id}`,decision_source:'player',faction,turn:90}])];
  // Independent literal expectations: authored selected-unit +5 morale/+2 cohesion.
  for (const [id, morale, cohesion] of [[target.id,55,52],[other.id,50,50],[foreign,50,50]]) {
    fields.push(at(['military','formations',id,'morale'],morale),at(['military','formations',id,'cohesion'],cohesion));
  }
  const config = structuredClone(template);
  config.caseId = `targeting/live-${suffix}-02`;
  config.fixture = fixture;
  config.steps[5].selector = `[data-testid="event-decision-response"][aria-label="Choose response: Decorate ${target.name}"]`;
  // Opponent formations are deliberately absent from the player projection.
  // Verify that control against the authoritative persisted save only.
  config.after = fields.filter(item => item.path[2] !== foreign);
  config.persisted = [...fields, at(['military','pending_event_notifications','length'],2)];
  fs.writeFileSync(path.join(__dirname,`config-${suffix}.json`),JSON.stringify(config,null,2)+'\n');
  console.log(JSON.stringify({faction,target:target.id,other:other.id,foreign}));
}

// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import war1992Events from '../../data/scenarios/events/war_1992.json';

afterEach(() => {
  cleanup();
  setLocale('en');
});

describe('EventDecisionModal presidential dossier', () => {
  const firstHourEventIds = ['rbih_state_identity', 'rs_strategic_goals', 'hrhb_political_goal'] as const;
  const firstHourCatalog = new Map<string, EventDefinition>(
    (war1992Events as EventDefinition[])
      .filter((eventDef) => firstHourEventIds.includes(eventDef.id as typeof firstHourEventIds[number]))
      .map((eventDef) => [eventDef.id, eventDef]),
  );
  const bcsExpectedCopy: Record<typeof firstHourEventIds[number], string[]> = {
    rbih_state_identity: [
      'Sta je Bosna?',
      'Predsjednistvo mora proglasiti viziju drzave.',
      'Gradjanska multietnicka republika',
      'Sarajevsko Predsjednistvo cuva gradjanski zahtjev',
      'Kontekst presude Karadzicu',
      'Majska platforma iz 1992. nalazi se pred Predsjednistvom.',
    ],
    rs_strategic_goals: [
      'Skupstina govori',
      'Narodna skupstina se sastala.',
      'General Ratko Mladic',
      'upozorenje generala Ratka Mladica',
      'Usvojiti svih sest ciljeva',
      'Skupstinski paket zadrzava historijski maksimalisticki kurs',
      'Presude Karadzicu i Mladicu dokumentuju sest strateskih ciljeva',
    ],
    hrhb_political_goal: [
      'Sta je Herceg-Bosna?',
      'Zagreb je na vezi.',
      'Hrvatska republika - slijediti Zagreb',
      'Vodstvo Herceg-Bosne dobija uskladjenost s patronom',
      'Presude Kordicu i Prlicu',
      'Zagrebacka direktiva i institucije Herceg-Bosne vec oblikuju politiku HVO-a.',
    ],
  };

  function buildCatalogBackedDecision(eventId: typeof firstHourEventIds[number]) {
    const eventDef = firstHourCatalog.get(eventId);
    if (!eventDef) throw new Error(`Missing fixture event: ${eventId}`);
    return {
      event_id: eventDef.id,
      event_title: eventDef.title ?? eventDef.id,
      narrative: eventDef.narrative,
      staff_assessment: eventDef.staff_assessment,
      source_note: eventDef.source_note,
      historical_source: eventDef.historical_source,
      category: eventDef.category,
      turn_fired: 0,
      faction: eventDef.responding_faction ?? 'RBiH',
      historical_default_response_id: eventDef.historical_default_response_id,
      response_options: eventDef.response_options ?? [],
    };
  }

  it('renders BCS authored copy for first-hour decision title, situation, options, source note, and staff assessment', () => {
    setLocale('bcs');

    for (const eventId of firstHourEventIds) {
      const { container, unmount } = render(React.createElement(EventDecisionModal, {
        decision: buildCatalogBackedDecision(eventId),
        eventCatalog: firstHourCatalog,
        onRespond: () => undefined,
      }));

      const text = container.textContent ?? '';
      for (const expected of bcsExpectedCopy[eventId]) {
        expect(text).toContain(expected);
      }
      expect(text).not.toMatch(/What Is Bosnia|The Assembly Speaks|What Is Herceg-Bosna/);
      expect(text).not.toMatch(/Your Presidency must declare|The National Assembly has convened|Zagreb is on the line/);
      expect(text).not.toMatch(/Civic multi-ethnic republic|Adopt all six goals|Croat republic\s+[—-]\s+follow Zagreb/);
      expect(text).not.toMatch(/Karadzic judgment context|ICTY Karadzic Trial Judgment|Kordic and Prlic judgments/);
      expect(text).not.toMatch(/The May 1992 platform debate|Zagreb's directive and Herceg-Bosna institutions/);
      if (eventId === 'rbih_state_identity') {
        expect(text).toContain('Republika Bosna i Hercegovina moral +3');
        expect(text).toContain('Zapis kampanje azuriran: Gradjanska multietnicka republika');
        expect(text).not.toContain('Republic of Bosnia and Herzegovina');
        expect(text).not.toContain('morale +3');
        expect(text).not.toContain('international standing');
        expect(text).not.toContain('Civic');
      }
      unmount();
    }
  });

  it('keeps English authored first-hour decision copy as the default locale', () => {
    for (const eventId of firstHourEventIds) {
      const { container, unmount } = render(React.createElement(EventDecisionModal, {
        decision: buildCatalogBackedDecision(eventId),
        eventCatalog: firstHourCatalog,
        onRespond: () => undefined,
      }));

      const text = container.textContent ?? '';
      expect(text).toContain(firstHourCatalog.get(eventId)?.title);
      expect(text).not.toContain(bcsExpectedCopy[eventId][0]);
      unmount();
    }
  });

  it('names General Ratko Mladic in the RS foundational decision without generic commander framing', () => {
    const eventDef = firstHourCatalog.get('rs_strategic_goals');
    expect(eventDef?.narrative).toContain('General Ratko Mladic, commander of the VRS Main Staff');
    expect(eventDef?.narrative).not.toMatch(/Your army commander/i);
    expect(JSON.stringify(eventDef?.response_options ?? [])).not.toMatch(/Your commander's warning|Your commander warned/i);

    const { container, unmount } = render(React.createElement(EventDecisionModal, {
      decision: buildCatalogBackedDecision('rs_strategic_goals'),
      eventCatalog: firstHourCatalog,
      onRespond: () => undefined,
    }));

    const englishText = container.textContent ?? '';
    expect(englishText).toContain('General Ratko Mladic, commander of the VRS Main Staff');
    expect(englishText).toContain("General Mladic's warning");
    expect(englishText).not.toMatch(/Your army commander|Your commander's warning|Your commander warned/i);
    unmount();

    setLocale('bcs');
    const bcsRender = render(React.createElement(EventDecisionModal, {
      decision: buildCatalogBackedDecision('rs_strategic_goals'),
      eventCatalog: firstHourCatalog,
      onRespond: () => undefined,
    }));
    const bcsText = bcsRender.container.textContent ?? '';
    expect(bcsText).toContain('General Ratko Mladic');
    expect(bcsText).toContain('upozorenje generala Ratka Mladica');
    expect(bcsText).toContain('General Mladic je upozorio na genocid');
    expect(bcsText).not.toMatch(/Komandant vojske|Upozorenje komandanta|Komandant je upozorio/i);
    bcsRender.unmount();
  });

  it('renders foundational decision modal chrome through BCS i18n', () => {
    setLocale('bcs');

    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'rbih_state_identity',
        event_title: 'What Is Bosnia?',
        narrative: 'Authored event prose remains data-owned for now.',
        staff_assessment: 'Authored staff assessment remains data-owned for now.',
        trigger_evidence: ['Authored evidence remains data-owned for now.'],
        category: 'political',
        historical_source: 'Authored source packet',
        turn_fired: 0,
        faction: 'RBiH',
        historical_default_response_id: 'civic',
        response_options: [
          {
            id: 'civic',
            label: 'Civic multi-ethnic republic',
            historical_marker: 'historical_default',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    const text = container.textContent ?? '';
    expect(text).toContain('Potrebna odluka');
    expect(text).toContain('Situacija');
    expect(text).toContain('Dosije');
    expect(text).toContain('Predsjednicki odgovor');
    expect(text).toContain('Historijski zadano');
    expect(text).toContain('Trag zapisa');
    expect(text).not.toContain('Decision Required');
    expect(text).not.toContain('Situation');
    expect(text).not.toContain('Dossier');
    expect(text).not.toContain('Presidential Response');
    expect(text).not.toContain('Historical default');
    expect(text).not.toContain('Record trail');
  });

  it('renders historical marker, descriptions, effect preview, no-effect fallback, and record trail', () => {
    render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'strategic_posture_review_hrhb',
        event_title: 'Strategic Posture Review',
        narrative: 'Cabinet ministers ask whether the wartime posture should remain separate or be moderated.',
        staff_assessment: 'Staff assesses that this choice will define the posture for the next campaign phase.',
        trigger_evidence: ['Cabinet split recorded', 'Patron signal received'],
        category: 'political',
        historical_source: 'BB1 source packet',
        turn_fired: 42,
        faction: 'HRHB',
        historical_default_response_id: 'separate_project',
        response_options: [
          {
            id: 'separate_project',
            label: 'Maintain the separate project',
            description: 'Keep the institutions aligned with the existing wartime project.',
            historical_marker: 'historical_default',
            effects: [
              { kind: 'morale_change', faction: 'HRHB', delta: 4 },
              { kind: 'patron_pressure', faction: 'HRHB', delta: -2 },
            ],
            sets_flags: { hrhb_strategy: 'separate' },
            dimension_shifts: [
              { faction: 'HRHB', dimension: 'patron_confidence', delta: 6 },
            ],
          },
          {
            id: 'joint_front',
            label: 'Seek a joint front',
            description: 'Signal a willingness to reduce friction with Bosniak authorities.',
            historical_marker: 'counterfactual',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByRole('dialog', { name: 'Strategic Posture Review' })).toBeTruthy();
    expect(screen.getByText('Cabinet ministers ask whether the wartime posture should remain separate or be moderated.')).toBeTruthy();
    expect(screen.getByText('Staff assesses that this choice will define the posture for the next campaign phase.')).toBeTruthy();
    expect(screen.getByText('Cabinet split recorded')).toBeTruthy();
    expect(screen.getByText('Patron signal received')).toBeTruthy();
    expect(screen.getByText('Political')).toBeTruthy();
    expect(screen.getByText('BB1 source packet')).toBeTruthy();
    expect(screen.getByText('Historical default')).toBeTruthy();
    expect(screen.getByText(/historically attested choice/)).toBeTruthy();
    expect(screen.getByText('Keep the institutions aligned with the existing wartime project.')).toBeTruthy();
    expect(screen.getByText('Herzeg-Bosna morale +4')).toBeTruthy();
    expect(screen.getByText('Herzeg-Bosna patron pressure -2')).toBeTruthy();
    expect(screen.getByText('Herzeg-Bosna Patron Confidence +6')).toBeTruthy();
    expect(screen.getByText('No immediate mechanical effects.')).toBeTruthy();
    expect(screen.getByText(/filed in the Chronicle decision ledger/i)).toBeTruthy();
    expect(screen.getByText(/Army HQ Records keeps consequences, opportunities, operations, and turn aftermath/i)).toBeTruthy();
    expect(screen.queryByText(/source review required/i)).toBeNull();
    expect(screen.queryByText('Rationale')).toBeNull();
  });

  it('hides engine and audit-only effect kinds from player-facing response previews', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'industrial_conscription_review',
        event_title: 'Industrial Conscription Review',
        turn_fired: 18,
        faction: 'RBiH',
        historical_default_response_id: 'approve',
        response_options: [
          {
            id: 'approve',
            label: 'Approve the call-up',
            effects: [
              { kind: 'morale_change', faction: 'RBiH', delta: -1 },
              { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 1.25, duration_turns: 8 },
              { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 0.9, duration_turns: 8 },
              { kind: 'bot_priority_shift', faction: 'RBiH', add_objectives: ['defend_core'], remove_objectives: ['probe'], duration_turns: 8 },
              { kind: 'doctrine_constraint', faction: 'RBiH', constraint: { operation_blocks: [{ faction: 'RBiH', expires_turn: 26, reason: 'test fixture' }] }, duration_turns: 8 },
              { kind: 'alliance_lock', mode: 'floor', value: 0.4, duration_turns: 8 },
              { kind: 'cost_ledger_annotation', tag: 'audit_only', text: 'Internal ledger annotation for audit only.' },
            ],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText('Republic of Bosnia and Herzegovina morale -1')).toBeTruthy();
    expect(container.textContent).not.toContain('recruitment');
    expect(container.textContent).not.toContain('combat effectiveness');
    expect(container.textContent).not.toContain('staff priorities');
    expect(container.textContent).not.toContain('doctrine constraint');
    expect(container.textContent).not.toContain('Alliance floor');
    expect(container.textContent).not.toContain('Internal ledger annotation');
  });

  it('does not imply a recommended choice when no historical default is available', () => {
    render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'source_blocked_review',
        event_title: 'Source Review Pending',
        turn_fired: 7,
        faction: 'RBiH',
        response_options: [
          { id: 'a', label: 'Option A', effects: [] },
          { id: 'b', label: 'Option B', effects: [] },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText(/Historical default source review required/i)).toBeTruthy();
    expect(screen.queryByText('Recommended')).toBeNull();
    expect(screen.queryByText('Correct choice')).toBeNull();
  });

  it('renders decision timing and dossier text without raw engine/debug tokens', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'rbih_state_identity',
        event_title: 'What Is Bosnia?',
        narrative: 'The cabinet asks how the presidency should describe the state.',
        staff_assessment: 'Recording rbih_state_identity as retain_minorities opens csq_rbih_minority_retained.',
        trigger_evidence: [
          'Backtick note `mandatory_purge` from event_audit.json',
          'csq_rbih_minority_retained is eligible',
        ],
        source_note: 'source_note references rbih_state_identity and consequences.json for audit.',
        turn_fired: 0,
        faction: 'RBiH',
        response_options: [
          { id: 'retain_minorities', label: 'Keep the civic state', effects: [] },
        ],
      },
      onRespond: () => undefined,
    }));

    const text = container.textContent ?? '';
    expect(text).toContain('6 Apr 1992');
    expect(text).not.toMatch(/\bTurn 0\b/);
    expect(text).not.toContain('rbih_state_identity');
    expect(text).not.toContain('retain_minorities');
    expect(text).not.toContain('mandatory_purge');
    expect(text).not.toContain('csq_rbih_minority_retained');
    expect(text).not.toContain('event_audit.json');
    expect(text).not.toContain('consequences.json');
    expect(text).not.toContain('`');
  });

  it('renders staff recommendation separately from historical calibration defaults', () => {
    render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'visit_to_front_rbih',
        event_title: 'Visit to the Front',
        narrative: 'Staff asks whether the president should remain in the capital or visit a front.',
        turn_fired: 84,
        faction: 'RBiH',
        staff_recommended_response_id: 'stay_capital_rbih',
        response_options: [
          { id: 'stay_capital_rbih', label: 'Stay in Sarajevo', effects: [] },
          { id: 'visit_front', label: 'Visit the front', effects: [] },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText('Staff recommendation')).toBeTruthy();
    expect(screen.getByText(/not a historical default and does not control bot calibration/i)).toBeTruthy();
    expect(screen.queryByText('Historical default')).toBeNull();
    expect(screen.queryByText(/historically attested choice/)).toBeNull();
  });

  it('does not double-punctuate historical default source notes', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'source_punctuation_review',
        event_title: 'Source Punctuation Review',
        turn_fired: 0,
        faction: 'RBiH',
        source_note: 'ICTY source packet.',
        historical_default_response_id: 'historical',
        response_options: [
          {
            id: 'historical',
            label: 'Historical line',
            historical_marker: 'historical_default',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(container.textContent).toContain('Source: ICTY source packet.');
    expect(container.textContent).not.toContain('source packet..');
  });

    it('does not render future-consequence branch metadata before the player chooses', () => {
        const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'branch_visibility_review',
        event_title: 'Branch Visibility Review',
        turn_fired: 12,
        faction: 'RS',
        historical_default_response_id: 'hold_line',
        response_options: [
          {
            id: 'hold_line',
            label: 'Hold the line',
            description: 'Keep the current posture.',
            historical_marker: 'historical_default',
            effects: [],
            future_consequences: [
              {
                id: 'negotiation_window',
                label: 'Negotiation window preserved',
                timing: 'future',
                certainty: 'conditional',
                explanation: 'Recording rbih_state_identity as civic closes csq_bosniak_unity_1993 if battlefield pressure remains manageable. §3.6 STRICT internal review note.',
                opens_events: ['winter_negotiation_review'],
                closes_events: ['emergency_retrenchment_review'],
                opens_flags: ['diplomatic_channel_open'],
                closes_flags: ['hardline_mandate_locked'],
              },
            ],
          },
          {
            id: 'press_forward',
            label: 'Press forward',
            description: 'Authorize a sharper posture.',
            historical_marker: 'counterfactual',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText('Hold the line')).toBeTruthy();
    expect(screen.getByText('Press forward')).toBeTruthy();
    expect(container.textContent).not.toContain('Downstream impact preview');
    expect(container.textContent).not.toContain('1 long-term branch note is available across 1 response option.');
    expect(container.textContent).not.toContain('1 downstream branch note');
    expect(container.textContent).not.toContain('Future consequences');
    expect(container.textContent).not.toContain('Negotiation window preserved');
    expect(container.textContent).not.toContain('csq_bosniak_unity_1993');
    expect(screen.queryByText(/§3.6 STRICT/)).toBeNull();
    expect(screen.queryByText('Later eligible events: winter negotiation review')).toBeNull();
    expect(screen.queryByText('Later suppressed events: emergency retrenchment review')).toBeNull();
    expect(screen.queryByText('Recorded flag context: diplomatic channel open')).toBeNull();
    expect(screen.queryByText('Suppressed flag context: hardline mandate locked')).toBeNull();

    const pressForward = screen.getByText('Press forward').closest('div');
    expect(pressForward?.textContent).not.toContain('Future consequences');
  });

  it('keeps RS future-consequence branch details hidden before the player chooses', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'rs_strategic_goals',
        event_title: 'The Assembly Speaks',
        turn_fired: 0,
        faction: 'RS',
        historical_default_response_id: 'all_six',
        response_options: [
          {
            id: 'all_six',
            label: 'Adopt all six goals',
            effects: [],
            future_consequences: [
              {
                id: 'foreclose_drina_resistance',
                label: 'The restrained Drina path closes',
                timing: 'future',
                certainty: 'guaranteed',
                explanation: 'Recording rs_strategic_goals as all_six forecloses csq_drina_partisan_resistance_1992. The target is gated on the counterfactual rs_strategic_goals=selective flag, so on the documented historical all_six path it would never have fired regardless.',
              },
            ],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText('Adopt all six goals')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show details' })).toBeNull();
    expect(container.textContent).not.toMatch(/This choice sets the all-six strategic-goals platform/i);
    expect(container.textContent).not.toMatch(/The restrained branch is closed here/i);
    expect(container.textContent).not.toMatch(/rs_strategic_goals/);
    expect(container.textContent).not.toMatch(/rs strategic goals=selective/i);
    expect(container.textContent).not.toMatch(/csq_drina_partisan_resistance_1992/);
  });

  it('does not render raw consequence ids, file names, or recording diagnostics before choice', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'raw_future_copy_review',
        event_title: 'Raw Future Copy Review',
        turn_fired: 21,
        faction: 'RBiH',
        historical_default_response_id: 'approve',
        response_options: [
          {
            id: 'approve',
            label: 'Approve the memorandum',
            effects: [],
            future_consequences: [
              {
                id: 'raw_branch',
                label: 'Civic platform forecloses csq_bosniak_unity_1993 from consequences.json',
                timing: 'future',
                certainty: 'conditional',
                explanation: 'Recording rbih_state_identity as civic opens csq_bosniak_unity_1993 from consequences.json when These consequence rows are active.',
              },
            ],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(container.textContent).not.toContain('1 long-term branch note is available across 1 response option.');
    expect(container.textContent).not.toContain('csq_');
    expect(screen.queryByText(/later Bosniak-national unity consolidation/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show details' })).toBeNull();
    expect(container.textContent).not.toContain('csq_');
    expect(container.textContent).not.toContain('.json');
    expect(container.textContent).not.toMatch(/\bRecording\b/i);
    expect(container.textContent).not.toContain('These consequence rows');
    expect(container.textContent).not.toContain('Civic platform and forecloses');
  });

  it('keeps all response choices visible while detailed future-consequence copy stays hidden', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'choice_hierarchy_review',
        event_title: 'Choice Hierarchy Review',
        turn_fired: 12,
        faction: 'RS',
        historical_default_response_id: 'option_a',
        response_options: [
          {
            id: 'option_a',
            label: 'Adopt the programme',
            effects: [],
            future_consequences: [
              {
                id: 'future_a',
                label: 'Detailed future branch A',
                timing: 'future',
                certainty: 'conditional',
                explanation: 'Long branch consequence for option A.',
              },
            ],
          },
          {
            id: 'option_b',
            label: 'Limit the programme',
            effects: [],
            future_consequences: [
              {
                id: 'future_b',
                label: 'Detailed future branch B',
                timing: 'future',
                certainty: 'risk',
                explanation: 'Long branch consequence for option B.',
              },
            ],
          },
          {
            id: 'option_c',
            label: 'Reject the programme',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    const text = container.textContent ?? '';
    expect(text).toContain('Adopt the programme');
    expect(text).toContain('Limit the programme');
    expect(text).toContain('Reject the programme');
    expect(text).not.toContain('Detailed future branch A');
    expect(text).not.toContain('Detailed future branch B');
    expect(screen.queryByRole('button', { name: 'Show details' })).toBeNull();
  });
});

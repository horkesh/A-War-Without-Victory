import { describe, expect, it } from 'vitest';
import { PLAYER_DECISION_FAMILIES } from '../../src/state/player_decision_manifest.js';
import {
  DECISION_SURFACE_REGISTRY,
  getDecisionSurface,
  getDecisionSurfaceForInboxType,
  listDecisionSurfaces,
  sanitizeDecisionCopy,
} from '../../src/ui/map/data/decisionSurfaceRegistry.js';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import { buildPreAdvanceCommandReviewView } from '../../src/ui/map/data/preAdvanceCommandReview.js';

describe('decision surface registry', () => {
  it('defines one player-facing UI surface for every manifest decision family', () => {
    const registryIds = listDecisionSurfaces()
      .filter((surface) => surface.manifestBacked)
      .map((surface) => surface.familyId)
      .sort();
    const manifestIds = PLAYER_DECISION_FAMILIES.map((family) => family.id).sort();

    expect(registryIds).toEqual(manifestIds);
  });

  it('keeps manifest gate policies aligned with UI gate policies', () => {
    for (const family of PLAYER_DECISION_FAMILIES) {
      expect(getDecisionSurface(family.id)).toMatchObject({
        familyId: family.id,
        gatePolicy: family.gatePolicy,
        manifestStatePath: family.statePath,
      });
    }
  });

  it('assigns direct resolver surfaces and player action labels to hard decision families', () => {
    expect(getDecisionSurface('event_decision')).toMatchObject({
      ownerShell: 'desk',
      resolverSurface: 'event_modal',
      inboxAction: 'event_modal',
      actionLabel: 'Decide now',
      severity: 'hard_block',
    });
    expect(getDecisionSurface('paramilitary_request')).toMatchObject({
      ownerShell: 'desk',
      resolverSurface: 'paramilitary_review_modal',
      inboxAction: 'paramilitary_review',
      actionLabel: 'Review deployment',
      severity: 'hard_block',
    });
    expect(getDecisionSurface('convoy_decision')).toMatchObject({
      ownerShell: 'desk',
      resolverSurface: 'convoy_decision_modal',
      inboxAction: 'convoy_decision_modal',
      actionLabel: 'Review convoy',
      severity: 'modal_required',
    });
  });

  it('resolves existing inbox types through the same registry', () => {
    expect(getDecisionSurfaceForInboxType('reserve_request')).toMatchObject({
      familyId: 'reserve_request',
      resolverSurface: 'reserve_request_modal',
      ownerShell: 'army_hq',
    });
    expect(getDecisionSurfaceForInboxType('intelligence_notification')).toMatchObject({
      familyId: 'intelligence_notification',
      resolverSurface: 'intelligence_brief_modal',
      ownerShell: 'desk',
      gatePolicy: 'info',
    });
  });

  it('routes operation opportunity action to the presidential Decision Room while keeping Army HQ as the source handoff', () => {
    expect(PLAYER_DECISION_FAMILIES.find((family) => family.id === 'operation_opportunity')).toMatchObject({
      ownerSurface: 'decision_room',
    });
    expect(getDecisionSurface('operation_opportunity')).toMatchObject({
      ownerShell: 'desk',
      resolverSurface: 'operation_opportunity_dossier',
      opensAs: 'shell_panel',
      inboxAction: 'decision_room',
      actionLabel: 'Open Decision Room',
      sourceLabel: 'Army HQ',
    });
  });

  it('exposes no raw resolver labels or implementation ids in player copy', () => {
    for (const surface of Object.values(DECISION_SURFACE_REGISTRY)) {
      expect(surface.playerLabel).not.toMatch(/_/);
      expect(surface.actionLabel).not.toMatch(/_/);
      expect(surface.playerLabel).not.toMatch(/pending_required_decisions/);
      expect(surface.actionLabel).not.toMatch(/pending_required_decisions/);
    }

    expect(sanitizeDecisionCopy('paramilitary_request', {
      title: 'pending_required_decisions',
      summary: 'resolve-paramilitary-requests for vrs_drina_corps',
    })).toEqual({
      title: 'Paramilitary authorization',
      summary: 'A deployment request requires a presidential instruction before the turn can advance.',
    });
  });

  it('projects pending paramilitary requests as direct blocking desk decisions even without policy echo', () => {
    const items = deriveInboxItems({
      turn: 1,
      player_faction: 'RS',
      pendingParamilitaryRequests: [
        {
          faction: 'RS',
          target_osid: 'bratunac_1',
          strength: 120,
          estimated_civilian_risk: 14,
        },
      ],
    } as Parameters<typeof deriveInboxItems>[0], { bratunac_1: 'Bratunac' });

    expect(items[0]).toMatchObject({
      type: 'paramilitary_request',
      severity: 'blocking',
      action: 'paramilitary_review',
      title: 'Paramilitary authorization',
    });
  });

  it('projects modal-required advance review families through player-facing card copy', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: {
        label: 'Turn 1',
        turn: 1,
        phase: 'war',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RBiH',
        playerDecisionSummary: {
          totalCount: 2,
          blockingCount: 2,
          families: [
            { id: 'peace_plan', count: 1, blockingCount: 1, gatePolicy: 'modal_required' },
            { id: 'convoy_decision', count: 1, blockingCount: 1, gatePolicy: 'modal_required' },
          ],
        },
      } as Parameters<typeof buildPreAdvanceCommandReviewView>[0]['state'],
    });

    expect(view.items.find((item) => item.id === 'manifest:peace_plan')).toMatchObject({
      actionLabel: 'Open Inbox',
      sourceLabel: 'Peace proposal',
    });
    expect(view.items.find((item) => item.id === 'manifest:convoy_decision')).toMatchObject({
      actionLabel: 'Open Inbox',
      sourceLabel: 'Convoy review',
    });
    expect(getDecisionSurface('peace_plan')).toMatchObject({
      actionLabel: 'Review proposal',
      sourceLabel: 'Diplomatic channel',
    });
    expect(getDecisionSurface('convoy_decision')).toMatchObject({
      actionLabel: 'Review convoy',
      sourceLabel: 'Humanitarian channel',
    });
  });
});

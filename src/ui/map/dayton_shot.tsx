/**
 * Standalone screenshot harness for DaytonNegotiationModal (PR #280).
 *
 * NOT shipped — dev-only entry used by tools/ui/dayton_modal_shots.cjs to mount
 * the modal in isolation with the same PENDING packet the unit test uses, so the
 * owner can review the surface visually. Mirrors tests/ui/dayton_negotiation_modal.test.ts.
 *
 * Query params:
 *   ?mock=1   — install a window.awwv.previewDayton stub so "Probe Positions"
 *               returns a deterministic bot counter-offer (RS counters, HRHB accepts).
 *               Must be set BEFORE React mounts (useIPC reads window.awwv once).
 *   ?locale=bcs — render in BCS locale (optional).
 */
import ReactDOM from 'react-dom/client';
import { createElement } from 'react';
import './styles/globals.css';
import { DaytonNegotiationModal } from './components/DaytonNegotiationModal';
import { useGameStore } from './store/gameStore';
import { setLocale } from './i18n';
import { makeMockLoadedGameState } from './__mocks__/loadedGameState';
import type { LoadedGameState } from './data/types';
import type { DaytonRound, DelegationFolder } from '../../state/negotiation_types.js';
import rbihFolder from './__mocks__/dayton_delegation_folder.rbih.json';

const params = new URLSearchParams(window.location.search);

// ── Deterministic bot counter-offer stub (mirrors the unit test) ───────────────
if (params.get('mock') === '1') {
    // Dev-only screenshot bridge: install a deterministic window.awwv.previewDayton
    // stub before React mounts. The `Window & { awwv?: ... }` intersection cast
    // mirrors the established warroom.ts idiom and stays out of the strict-null
    // type-escape inventory.
    (window as Window & { awwv?: Record<string, unknown> }).awwv = {
        previewDayton: async () => ({
            ok: true,
            playerFaction: 'RBiH',
            botResponses: {
                RS: {
                    decision: 'counter',
                    reason: 'over budget',
                    proposal_cost: 40,
                    available_capital: 60,
                    counter_proposal: {
                        territorial_demands: [],
                        territorial_concessions: [],
                        institutional_choices: { military: 'decentralized', presidency: 'decentralized' },
                    },
                },
                HRHB: {
                    decision: 'accept',
                    reason: 'within range',
                    proposal_cost: 5,
                    available_capital: 40,
                },
            },
        }),
    };
}

if (params.get('locale') === 'bcs') {
    setLocale('bcs');
}

// Same realistic packet the unit test exercises (Brčko tri-state present).
const PENDING: NonNullable<LoadedGameState['pendingDayton']> = {
    territorialPackages: [
        { id: 'gorazde_corridor', name: 'Goražde Corridor', defaultHolder: 'RBiH', demandCost: 0, concedeCost: 10, protectedCore: true },
        { id: 'brcko_district', name: 'Brčko District', defaultHolder: 'RS', demandCost: 60, concedeCost: 18, theirCore: true },
        { id: 'sarajevo_suburbs', name: 'Sarajevo Suburbs', defaultHolder: 'RS', demandCost: 15, concedeCost: 12 },
    ],
    institutionalPackages: [
        { id: 'military', name: 'Military Structure', centralizedCost: 15, decentralizedCost: 10 },
        { id: 'presidency', name: 'Presidency', centralizedCost: 20, decentralizedCost: 5 },
    ],
    factionCapital: { RBiH: 80, RS: 60, HRHB: 40 },
    patronOverride: { RBiH: 5, RS: 10, HRHB: 25 },
};

const loadedGameState: LoadedGameState = { ...makeMockLoadedGameState(), player_faction: 'RBiH' };

useGameStore.setState({
    loadedGameState,
    loadError: null,
});

// ?conference=1 mounts the live Hope Hotel room; the delegation folder is the one
// buildDelegationFolder produced from the retained RBiH pending fixture (real numbers).
const conference = params.get('conference') === '1';
// ?rounds=N seeds N tabled rounds (DC A2): RS counters, HRHB accepts once its patron presses.
const seededRounds: DaytonRound[] = Array.from({ length: Math.min(3, Number(params.get('rounds') ?? 0) || 0) }, (_, i) => ({
    round: i + 1,
    turn: 187,
    pressure: 10 * Math.min(2, i),
    proposal: { territorial_demands: ['gorazde_corridor', 'brcko_district'], territorial_concessions: [], institutional_choices: {} },
    responses: {
        RS: {
            decision: 'counter', reason: '', reason_code: i === 0 ? 'counter_far' : 'counter_close', proposal_cost: 0, available_capital: 0,
            counter_proposal: { territorial_demands: ['gorazde_corridor'], territorial_concessions: [], institutional_choices: {} },
        },
        HRHB: { decision: 'accept', reason: '', reason_code: i === 0 ? 'accept' : 'accept_patron', proposal_cost: 0, available_capital: 0 },
    },
}));
const dayton = conference ? { ...PENDING, delegationFolder: rbihFolder as DelegationFolder, rounds: seededRounds } : PENDING;

ReactDOM.createRoot(document.getElementById('root')!).render(
    createElement(DaytonNegotiationModal, { dayton, conference }),
);

/**
 * DirectiveCard — surface-agnostic confirm/act card for the War-Direction levers
 * (Presidential Command Surface design §2 / LOCKED decision #1: the Decision Room
 * ISSUES directives, not just navigates).
 *
 * Lifted from the proven OperationsSection.tsx act-flow:
 *   - request_op / force_launch: confirm → queryDirectiveObjection → render the
 *     disposition-tinted commander objection (buildDirectiveObjection) → "Force
 *     anyway" → stageOpDirectiveOrder({ forced_over_objection: true }). Honors the
 *     IMPOSSIBLE / rejectionReason "cannot issue" path (never stages / debits CA).
 *   - stop_op / authorize_op: no objection — confirm calls stageOpHaltOrder /
 *     acceptProposal directly.
 *
 * CA cost is shown inline; when commandAuthority.current < cost the ISSUE button
 * is DISABLED but the card still renders/reads (scan-without-spend). Authorize-op
 * is cost 0 (agreeing with the officer is free) and so never disables on CA.
 *
 * In browser/headless mode (!ipc.isAvailable) the card renders inert (mirrors
 * FrontVisitSection). Pure presentation; calls only EXISTING byte-identical lever
 * IPCs — no determinism touch.
 */

import { useMemo, useState } from 'react';
import type { LoadedGameState } from '../../data/types';
import type { PresidentialDecisionRoomDirective } from '../../data/presidentialDecisionRoom';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import {
  buildDirectiveObjection,
  plainReason,
  type DirectiveObjectionView,
} from '../../data/opDirectiveObjection';

interface DirectiveCardProps {
  directive: PresidentialDecisionRoomDirective;
  gameState: LoadedGameState;
}

/** Player-facing lever label. */
function leverLabel(lever: PresidentialDecisionRoomDirective['lever']): string {
  switch (lever) {
    case 'request_op': return 'Direct corps to objective';
    case 'force_launch': return 'Force operation launch';
    case 'stop_op': return 'Halt operation';
    case 'authorize_op': return 'Authorize operation';
    default: return 'Issue directive';
  }
}

/** Target descriptor from the directive payload (best-effort, presentational). */
function targetLabel(directive: PresidentialDecisionRoomDirective): string | null {
  const p = directive.payload;
  if (typeof p.opName === 'string' && p.opName) return p.opName;
  if (typeof p.targetOsid === 'string' && p.targetOsid) return p.targetOsid;
  if (typeof p.proposalId === 'string' && p.proposalId) return p.proposalId;
  return null;
}

export function DirectiveCard({ directive, gameState }: DirectiveCardProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);

  // Force-op PUSHBACK state (request_op / force_launch only). Mirrors
  // OperationsSection: hold the commander's disposition-tinted objection until the
  // president forces anyway or stands down.
  const [pendingObjection, setPendingObjection] = useState<DirectiveObjectionView | null>(null);
  // IMPOSSIBLE directive: the candidate op cannot be built / no free slot — not
  // forceable; we surface "cannot issue" and never stage / debit CA.
  const [impossibleReason, setImpossibleReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cost = directive.cost;
  const authCurrent = gameState.commandAuthority?.current ?? 100;
  const canAfford = authCurrent >= cost;
  const needsObjection = directive.lever === 'request_op' || directive.lever === 'force_launch';

  // Commander disposition for the request/force objection (same lookup as
  // OperationsSection): the active CO of the target corps.
  const corpsCommander = useMemo(() => {
    if (!directive.corpsId) return undefined;
    return (gameState.namedOfficerData ?? []).find(
      (o) => o.assigned_corps_id === directive.corpsId && o.status === 'active',
    );
  }, [gameState.namedOfficerData, directive.corpsId]);

  // Browser/headless: render inert (mirror FrontVisitSection).
  if (!ipc.isAvailable) return null;

  const resetTransient = () => {
    setPendingObjection(null);
    setImpossibleReason(null);
  };

  /** Stage a request-op directive (optionally forced past a shown objection). */
  const stageRequestDirective = async (forced: boolean) => {
    const targetOsid = typeof directive.payload.targetOsid === 'string' ? directive.payload.targetOsid : '';
    if (!directive.corpsId || !targetOsid) {
      setLoadError('Directive is missing its corps/target context.');
      return;
    }
    const result = await ipc.stageOpDirectiveOrder({
      corpsId: directive.corpsId,
      targetOsid,
      ...(forced ? { forced_over_objection: true } : {}),
    });
    if (!result.ok) setLoadError(result.error ?? 'Failed to issue directive.');
    else resetTransient();
  };

  /** Force-launch an existing held/ready op (no objection query — the officer
   *  never surfaced a no-go; the president overrides silence). */
  const stageForceLaunch = async () => {
    const opName = typeof directive.payload.opName === 'string' ? directive.payload.opName : '';
    if (!directive.corpsId || !opName) {
      setLoadError('Directive is missing its corps/operation context.');
      return;
    }
    const result = await ipc.stageOperationForceLaunch({ corpsId: directive.corpsId, operationName: opName });
    if (!result.ok) setLoadError(result.error ?? 'Failed to force-launch operation.');
    else resetTransient();
  };

  const handleConfirm = async () => {
    if (busy) return;
    if (!canAfford) {
      setLoadError(`Insufficient command authority (need ${cost}, have ${authCurrent}).`);
      return;
    }
    setBusy(true);
    setImpossibleReason(null);
    try {
      if (directive.lever === 'authorize_op') {
        const proposalId = typeof directive.payload.proposalId === 'string' ? directive.payload.proposalId : '';
        if (!proposalId) { setLoadError('Directive is missing its proposal context.'); return; }
        const result = await ipc.acceptProposal(proposalId);
        if (!result.ok) setLoadError(result.error ?? 'Failed to authorize operation.');
        else resetTransient();
        return;
      }

      if (directive.lever === 'stop_op') {
        const opName = typeof directive.payload.opName === 'string' ? directive.payload.opName : '';
        if (!directive.corpsId || !opName) { setLoadError('Directive is missing its corps/operation context.'); return; }
        const result = await ipc.stageOpHaltOrder({ corpsId: directive.corpsId, opName });
        if (!result.ok) setLoadError(result.error ?? 'Failed to halt operation.');
        else resetTransient();
        return;
      }

      if (directive.lever === 'force_launch') {
        await stageForceLaunch();
        return;
      }

      // request_op: ask the commander first; surface his objection before committing.
      const targetOsid = typeof directive.payload.targetOsid === 'string' ? directive.payload.targetOsid : '';
      if (!directive.corpsId || !targetOsid) { setLoadError('Directive is missing its corps/target context.'); return; }
      const objection = await ipc.queryDirectiveObjection({ corpsId: directive.corpsId, targetOsid });
      if (objection.ok && objection.data) {
        // IMPOSSIBLE (checked FIRST): the candidate op could not be built or there
        // is no free slot. Not forceable — surface "cannot issue", do not stage.
        if (objection.data.rejectionReason) {
          setImpossibleReason(objection.data.rejectionReason);
          return;
        }
        if (objection.data.recommendedAction !== 'launch' && corpsCommander) {
          const view = buildDirectiveObjection(
            {
              name: corpsCommander.name,
              rank: corpsCommander.rank,
              competence: corpsCommander.competence,
              political_reliability: corpsCommander.political_reliability,
              is_cowed: corpsCommander.is_cowed,
            },
            objection.data,
          );
          if (view.shows_objection && view.issuable) {
            setPendingObjection(view);
            return;
          }
        }
      }
      // No objection (agrees / cowed / no CO / query unavailable) → stage directly.
      await stageRequestDirective(false);
    } finally {
      setBusy(false);
    }
  };

  const handleForceAnyway = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (directive.lever === 'force_launch') await stageForceLaunch();
      else await stageRequestDirective(true);
    } finally {
      setBusy(false);
    }
  };

  const tgt = targetLabel(directive);

  return (
    <section
      className="mt-2 rounded border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2"
      aria-label="Issue War-Direction directive"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-300">
            Issue directive
          </div>
          <div className="mt-0.5 truncate text-[11px] font-bold text-text-primary">
            {leverLabel(directive.lever)}{tgt ? ` · ${tgt}` : ''}
          </div>
        </div>
        <span className="shrink-0 rounded border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-amber-300">
          {cost === 0 ? 'Free' : `${cost} authority`}
        </span>
      </div>

      {/* CANNOT ISSUE banner — the directive is IMPOSSIBLE (unbuildable / no slot).
          Nothing committed; no CA spent. */}
      {impossibleReason && (
        <div role="alert" aria-label="Directive cannot be issued" className="mt-2 rounded border border-panel-border/60 bg-panel-bg/60 p-2">
          <p className="text-[8px] font-bold uppercase tracking-wider text-text-secondary">Cannot issue</p>
          <p className="mt-0.5 text-[10px] text-text-primary">
            This corps cannot mount that operation — {plainReason(impossibleReason)}. No command authority was spent.
          </p>
        </div>
      )}

      {/* Force-op PUSHBACK — the commander objected. Show his disposition-tinted
          judgment and let the president Force anyway / Stand down. */}
      {pendingObjection && (
        <div
          role="alertdialog"
          aria-label="Commander objection"
          className={`mt-2 rounded border p-2 ${
            pendingObjection.severity === 'abort'
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-amber-500/50 bg-amber-500/5'
          }`}
        >
          <p className="text-[8px] font-bold uppercase tracking-wider text-amber-400">
            {pendingObjection.severity === 'abort' ? 'Commander recommends against' : 'Commander urges delay'}
          </p>
          <p className="mt-1 text-[10px] italic text-text-primary">{pendingObjection.prose}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceAnyway}
              disabled={busy || pendingObjection.rejection_reason !== undefined}
              title={pendingObjection.rejection_reason !== undefined
                ? 'The operation cannot be formed as ordered — there is nothing to force.'
                : "Override the commander's judgment and order the operation anyway. He will be cowed by repeated overrides."}
              className="text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-red-500/50 text-red-400 disabled:opacity-40 hover:bg-red-500/10"
            >
              Force anyway
            </button>
            <button
              type="button"
              onClick={() => setPendingObjection(null)}
              disabled={busy}
              className="text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-panel-border/50 text-text-primary disabled:opacity-40 hover:bg-panel-bg"
            >
              Stand down
            </button>
          </div>
        </div>
      )}

      {/* Confirm / ISSUE — disabled when CA short (still renders for scan-without-spend). */}
      {!pendingObjection && !impossibleReason && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canAfford || busy}
          title={canAfford
            ? (cost === 0
              ? 'Issue this directive (no command authority cost).'
              : `Issue this directive (cost ${cost} command authority; current ${authCurrent}).`)
            : `Insufficient command authority (need ${cost}, have ${authCurrent}).`}
          className="mt-2 h-7 w-full truncate rounded border border-amber-400/35 bg-amber-400/12 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
        >
          {busy
            ? (needsObjection ? 'Consulting…' : 'Issuing…')
            : (cost === 0 ? 'Authorize' : `Issue (${cost})`)}
        </button>
      )}
    </section>
  );
}

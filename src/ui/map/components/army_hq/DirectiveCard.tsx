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

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LoadedGameState } from '../../data/types';
import type { PresidentialDecisionRoomDirective } from '../../data/presidentialDecisionRoom';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import {
  buildDirectiveObjection,
  plainReason,
  type DirectiveObjectionView,
} from '../../data/opDirectiveObjection';
import { resolveDirectiveActArt } from '../../data/directiveActArt';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { t } from '../../i18n';

interface DirectiveCardProps {
  directive: PresidentialDecisionRoomDirective;
  gameState: LoadedGameState;
}

/** Player-facing lever label. */
function leverLabel(lever: PresidentialDecisionRoomDirective['lever']): string {
  switch (lever) {
    case 'request_op': return t('directive.lever.request_op');
    case 'force_launch': return t('directive.lever.force_launch');
    case 'stop_op': return t('directive.lever.stop_op');
    case 'authorize_op': return t('directive.lever.authorize_op');
    case 'replace_co': return t('directive.lever.replace_co');
    case 'elite_deploy': return t('directive.lever.elite_deploy');
    case 'front_visit': return t('directive.lever.front_visit');
    default: return t('directive.lever.default');
  }
}

/** Target descriptor from the directive payload (best-effort, presentational).
 *  Resolves player-safe display names — never leaks a raw corps/proposal/brigade
 *  id into the caption. `opName` and `targetOsid` are already display-facing
 *  values; the `corpsId` fallback is resolved to the formation's display name;
 *  raw proposal / brigade ids are suppressed (caption degrades to the lever
 *  label alone). */
function targetLabel(
  directive: PresidentialDecisionRoomDirective,
  gameState: LoadedGameState,
): string | null {
  const p = directive.payload;
  if (typeof p.opName === 'string' && p.opName) return p.opName;
  if (typeof p.targetOsid === 'string' && p.targetOsid) return p.targetOsid;
  // proposalId (authorize_op) / brigadeId (elite_deploy) are raw internal ids —
  // suppress rather than leak; the lever label alone is sufficient.
  if (directive.corpsId) {
    return getPlayerSafeCorpsName(
      gameState.formations.find((f) => f.id === directive.corpsId)?.name,
      directive.corpsId,
    );
  }
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
  const [receipt, setReceipt] = useState<{ kind: 'success' | 'error' | 'cancelled'; message: string } | null>(null);

  // REQUEST-OP in-card target OSID (Decision-Room request-op cards carry an EMPTY
  // payload — the president names the objective settlement here). Mirrors the proven
  // free-text OSID surface in OperationsSection; the objection → force-anyway flow
  // below handles invalid / unreachable targets. Only used when the directive is a
  // request_op whose payload carries no fixed targetOsid.
  const [targetOsidInput, setTargetOsidInput] = useState('');

  // FRONT-VISIT reachability (async server-side — the president cannot reach a
  // cut-off enclave). Fetched once on mount / on state change, mirroring
  // FrontVisitSection. Only used for the front_visit lever.
  const [frontVisitUnavailableReason, setFrontVisitUnavailableReason] = useState<string | null>(null);
  const [frontVisitReady, setFrontVisitReady] = useState(false);

  const cost = directive.cost;
  const authCurrent = gameState.commandAuthority?.current ?? 100;
  const canAfford = authCurrent >= cost;
  const needsObjection = directive.lever === 'request_op' || directive.lever === 'force_launch';
  const isFrontVisit = directive.lever === 'front_visit';

  // request_op target OSID: a fixed payload target wins; otherwise the president
  // types one into the in-card input. The input is shown ONLY when this is a
  // request_op directive whose payload carries no fixed target.
  const payloadTargetOsid = typeof directive.payload.targetOsid === 'string' ? directive.payload.targetOsid : '';
  const showTargetInput = directive.lever === 'request_op' && !payloadTargetOsid;
  const effectiveTargetOsid = payloadTargetOsid || targetOsidInput.trim();

  // Commander disposition for the request/force objection (same lookup as
  // OperationsSection): the active CO of the target corps.
  const corpsCommander = useMemo(() => {
    if (!directive.corpsId) return undefined;
    return (gameState.namedOfficerData ?? []).find(
      (o) => o.assigned_corps_id === directive.corpsId && o.status === 'active',
    );
  }, [gameState.namedOfficerData, directive.corpsId]);

  const refreshFrontVisit = useCallback(async () => {
    if (!ipc.isAvailable || !isFrontVisit) return;
    const r = await ipc.getFrontVisitAvailability();
    setFrontVisitReady(true);
    if (!r.ok) { setFrontVisitUnavailableReason('Front-visit availability is unknown.'); return; }
    const reachable = (r.reachableBranchIds ?? []).length > 0;
    if (r.available && reachable) {
      setFrontVisitUnavailableReason(null);
    } else {
      // Cut-off / exhausted / on-cooldown — surface a concise reason.
      setFrontVisitUnavailableReason(
        r.reason
          ?? (r.onCooldown ? 'The front visit is on cooldown.'
            : !reachable ? 'No front is reachable — every offered front is cut off.'
            : 'A front visit cannot be made right now.'),
      );
    }
  }, [ipc, isFrontVisit]);

  useEffect(() => {
    void refreshFrontVisit();
  }, [refreshFrontVisit, gameState]);

  useEffect(() => {
    setReceipt(null);
  }, [directive]);

  // Browser/headless: render inert (mirror FrontVisitSection).
  if (!ipc.isAvailable) return null;

  const resetTransient = () => {
    setPendingObjection(null);
    setImpossibleReason(null);
  };

  const handleCancel = () => {
    resetTransient();
    setTargetOsidInput('');
    setReceipt({ kind: 'cancelled', message: t('directive.receipt.cancelled') });
  };

  /** Stage a request-op directive (optionally forced past a shown objection). */
  const stageRequestDirective = async (forced: boolean) => {
    const targetOsid = effectiveTargetOsid;
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
    else { resetTransient(); setTargetOsidInput(''); }
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
        if (!result.ok) {
          const reason = result.error ?? 'Failed to halt operation.';
          setLoadError(reason);
          setReceipt({ kind: 'error', message: t('directive.receipt.failed', { reason }) });
        } else {
          resetTransient();
          setReceipt({ kind: 'success', message: t('directive.receipt.stagedNextTurn') });
        }
        return;
      }

      // REPLACE-CO (single CA-cost confirm — the spend IS the friction). The engine
      // auto-picks the best reserve replacement (same path as the dismiss button);
      // the heavy candidate picker stays in CommanderSection.
      if (directive.lever === 'replace_co') {
        if (!directive.corpsId) { setLoadError('Directive is missing its corps context.'); return; }
        const result = await ipc.stageCoReplacementOrder({ corpsId: directive.corpsId });
        if (!result.ok) setLoadError(result.error ?? 'Failed to replace commander.');
        else resetTransient();
        return;
      }

      // ELITE-DEPLOY (single CA-cost confirm): release the suggested reserve brigade
      // to the requesting corps.
      if (directive.lever === 'elite_deploy') {
        const requestId = typeof directive.payload.requestId === 'string' ? directive.payload.requestId : '';
        const brigadeId = typeof directive.payload.brigadeId === 'string' ? directive.payload.brigadeId : '';
        if (!requestId || !brigadeId) { setLoadError('Directive is missing its reserve-request context.'); return; }
        const result = await ipc.approveReserveRequest(requestId, brigadeId);
        if (!result.ok) setLoadError(result.error ?? 'Failed to release reserve brigade.');
        else resetTransient();
        return;
      }

      // FRONT-VISIT (single CA-cost confirm): respect server-side reachability — the
      // president cannot reach a cut-off enclave.
      if (directive.lever === 'front_visit') {
        if (frontVisitUnavailableReason) { setLoadError(frontVisitUnavailableReason); return; }
        const result = await ipc.initiateFrontVisit();
        if (!result.ok) setLoadError(result.error ?? 'Failed to initiate front visit.');
        else { resetTransient(); await refreshFrontVisit(); }
        return;
      }

      if (directive.lever === 'force_launch') {
        await stageForceLaunch();
        return;
      }

      // request_op: ask the commander first; surface his objection before committing.
      const targetOsid = effectiveTargetOsid;
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

  const tgt = targetLabel(directive, gameState);

  // §9 act-layer dossier header: a 16:9 period still chosen by the directive's
  // lever (reusing the existing consequence_stills art via the shared resolver).
  // When nothing resolves the card renders its text-only header below — the act
  // surface always works with zero art.
  const headerArt = resolveDirectiveActArt(directive.lever);

  return (
    <section
      className="mt-2 overflow-hidden rounded border border-amber-400/30 bg-amber-400/[0.06]"
      aria-label={t('directive.sectionAria')}
    >
      {/* 16:9 dossier-header band — period still + bottom-gradient title-safe area
          (mirrors the DecisionCard/CommandCard object-cover + gradient idiom so the
          lever/target caption stays legible over any photo). Omitted entirely when
          no art resolves; the text header below carries the same information. */}
      {headerArt && (
        <div
          data-testid="directive-card-header-art"
          className="relative aspect-video w-full overflow-hidden border-b border-amber-400/25 bg-black/40"
        >
          <img
            src={headerArt}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background:
                'linear-gradient(to top, rgba(8,7,5,0.92), rgba(8,7,5,0.5) 45%, rgba(8,7,5,0))',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              {t('directive.issueDirective')}
            </div>
            <div className="mt-0.5 truncate text-[11px] font-bold text-text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              {leverLabel(directive.lever)}{tgt ? ` · ${tgt}` : ''}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 py-2">
      {/* Header row. When the dossier image renders above, its overlay already
          carries the "Issue directive" / lever title, so here we keep only the
          cost badge (right-aligned). With no art the original text header carries
          the full title — graceful fallback, identical information. */}
      <div className={`flex items-start gap-2 ${headerArt ? 'justify-end' : 'justify-between'}`}>
        {!headerArt && (
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-300">
              {t('directive.issueDirective')}
            </div>
            <div className="mt-0.5 truncate text-[11px] font-bold text-text-primary">
              {leverLabel(directive.lever)}{tgt ? ` · ${tgt}` : ''}
            </div>
          </div>
        )}
        <span className="shrink-0 rounded border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-amber-300">
          {cost === 0 ? t('directive.costFree') : t('directive.costAuthority', { cost })}
        </span>
      </div>

      {/* CANNOT ISSUE banner — the directive is IMPOSSIBLE (unbuildable / no slot).
          Nothing committed; no CA spent. */}
      {impossibleReason && (
        <div role="alert" aria-label={t('directive.cannotIssue.aria')} className="mt-2 rounded border border-panel-border/60 bg-panel-bg/60 p-2">
          <p className="text-[8px] font-bold uppercase tracking-wider text-text-secondary">{t('directive.cannotIssue.heading')}</p>
          <p className="mt-0.5 text-[10px] text-text-primary">
            {t('directive.cannotIssue.body', { reason: plainReason(impossibleReason) })}
          </p>
        </div>
      )}

      {/* Force-op PUSHBACK — the commander objected. Show his disposition-tinted
          judgment and let the president Force anyway / Stand down. */}
      {pendingObjection && (
        <div
          role="alertdialog"
          aria-label={t('directive.objection.aria')}
          className={`mt-2 rounded border p-2 ${
            pendingObjection.severity === 'abort'
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-amber-500/50 bg-amber-500/5'
          }`}
        >
          <p className="text-[8px] font-bold uppercase tracking-wider text-amber-400">
            {pendingObjection.severity === 'abort' ? t('directive.objection.recommendsAgainst') : t('directive.objection.urgesDelay')}
          </p>
          <p className="mt-1 text-[10px] italic text-text-primary">{pendingObjection.prose}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceAnyway}
              disabled={busy || pendingObjection.rejection_reason !== undefined}
              title={pendingObjection.rejection_reason !== undefined
                ? t('directive.objection.forceAnywayDisabledTitle')
                : t('directive.objection.forceAnywayTitle')}
              className="text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-red-500/50 text-red-400 disabled:opacity-40 hover:bg-red-500/10"
            >
              {t('directive.objection.forceAnyway')}
            </button>
            <button
              type="button"
              onClick={() => setPendingObjection(null)}
              disabled={busy}
              className="text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-panel-border/50 text-text-primary disabled:opacity-40 hover:bg-panel-bg"
            >
              {t('directive.objection.standDown')}
            </button>
          </div>
        </div>
      )}

      {/* FRONT-VISIT reachability notice — the president cannot reach a cut-off
          enclave. Surface the server-side reason; the ISSUE button is disabled. */}
      {isFrontVisit && frontVisitReady && frontVisitUnavailableReason && (
        <div role="status" aria-label={t('directive.frontVisit.unavailableAria')} className="mt-2 rounded border border-panel-border/60 bg-panel-bg/60 p-2">
          <p className="text-[8px] font-bold uppercase tracking-wider text-text-secondary">{t('directive.frontVisit.cannotVisit')}</p>
          <p className="mt-0.5 text-[10px] text-text-primary">{frontVisitUnavailableReason}</p>
        </div>
      )}

      {/* REQUEST-OP target input — the president names the objective settlement
          (OSID). Mirrors the proven OperationsSection free-text surface; the
          objection / "cannot issue" flow above handles invalid / unreachable
          targets. Shown only when the directive carries no fixed target. */}
      {!pendingObjection && !impossibleReason && showTargetInput && (
        <input
          type="text"
          value={targetOsidInput}
          onChange={(e) => { setTargetOsidInput(e.target.value); if (impossibleReason) setImpossibleReason(null); }}
          placeholder={t('directive.targetInput.placeholder')}
          aria-label={t('directive.targetInput.aria')}
          className="mt-2 w-full rounded border border-panel-border/50 bg-panel-bg px-2 py-1 text-[11px] font-mono text-text-primary"
        />
      )}

      {/* Confirm / ISSUE — disabled when CA short (still renders for scan-without-spend),
          for front-visit when no front is reachable, or for a request-op with no
          target named yet. */}
      {!pendingObjection && !impossibleReason && (() => {
        const blockedFrontVisit = isFrontVisit && frontVisitReady && frontVisitUnavailableReason !== null;
        const blockedNoTarget = showTargetInput && targetOsidInput.trim().length === 0;
        const issueDisabled = !canAfford || busy || blockedFrontVisit || blockedNoTarget;
        const issueTitle = blockedFrontVisit
          ? (frontVisitUnavailableReason ?? t('directive.issue.blockedFrontVisitTitle'))
          : blockedNoTarget
          ? t('directive.issue.blockedNoTargetTitle')
          : canAfford
            ? (cost === 0
              ? t('directive.issue.freeTitle')
              : t('directive.issue.costTitle', { cost, current: authCurrent }))
            : t('directive.issue.insufficientTitle', { cost, current: authCurrent });
        return (
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={issueDisabled}
              title={issueTitle}
              className="h-7 min-w-0 truncate rounded border border-amber-400/35 bg-amber-400/12 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
            >
              {busy
                ? (needsObjection ? t('directive.button.consulting') : t('directive.button.issuing'))
                : (cost === 0 ? t('directive.button.authorize') : t('directive.button.issue', { cost }))}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="h-7 rounded border border-panel-border/60 bg-panel-bg/50 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-text-secondary transition hover:border-text-secondary/70 hover:text-text-primary disabled:opacity-40"
            >
              {t('directive.button.cancel')}
            </button>
          </div>
        );
      })()}
      {receipt && (
        <div
          role="status"
          aria-label={t('directive.receipt.aria')}
          className={`mt-2 rounded border p-2 text-[10px] ${
            receipt.kind === 'error'
              ? 'border-red-500/45 bg-red-500/5 text-red-200'
              : receipt.kind === 'cancelled'
                ? 'border-panel-border/60 bg-panel-bg/60 text-text-secondary'
                : 'border-emerald-400/35 bg-emerald-400/8 text-emerald-100'
          }`}
        >
          {receipt.message}
        </div>
      )}
      </div>
    </section>
  );
}

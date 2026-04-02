import { useEffect, useMemo, useState } from 'react';
import type { EnclaveResilienceView, LoadedGameState } from '../data/types';
import { AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE, AIRDROP_MAX_SUPPLY_PER_TURN } from '../../../state/supply_reserve_constants';
import { useIPC } from '../desktop/useIPC';
import { getPlayerSafeEnclaveName } from '../utils/playerSafeText';

interface EnclaveDashboardProps {
  state: LoadedGameState;
  open: boolean;
  onClose: () => void;
}

const SUPPLY_CLASSES: Record<'adequate' | 'strained' | 'critical', string> = {
  adequate: 'text-green-400',
  strained: 'text-amber-300',
  critical: 'text-red-400',
};

const AIRDROP_LABELS: Record<'receiving' | 'not_eligible' | 'not_isolated_long_enough', string> = {
  receiving: 'Receiving',
  not_eligible: 'Not eligible',
  not_isolated_long_enough: 'Not isolated long enough',
};

function getEnclaveRisk(enclave: EnclaveResilienceView) {
  if (enclave.supply_state === 'critical' || enclave.resilience <= 8) {
    return {
      label: 'Critical risk',
      detail: `Resilience ${enclave.resilience.toFixed(1)} with ${enclave.isolation_turns} isolated turn(s).`,
      className: 'text-red-400',
    };
  }
  if (enclave.supply_state === 'strained' || enclave.isolation_turns >= 4) {
    return {
      label: 'Heightened risk',
      detail: `Supply is strained after ${enclave.isolation_turns} isolated turn(s).`,
      className: 'text-amber-300',
    };
  }
  return {
    label: 'Holding',
    detail: 'Current resilience and supply posture remain manageable.',
    className: 'text-green-400',
  };
}

export function EnclaveDashboard({ state, open, onClose }: EnclaveDashboardProps) {
  const ipc = useIPC();
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const enclaves = useMemo(
    () => Object.entries(state.enclaveResilience ?? {})
      .sort((a, b) => (a[1].display_name ?? a[0]).localeCompare(b[1].display_name ?? b[0])),
    [state.enclaveResilience]
  );
  const eligibleEnclaveIds = useMemo(
    () => enclaves
      .filter(([, enclave]) => enclave.faction === 'RBiH' && enclave.isolation_turns >= 4)
      .map(([enclaveId]) => enclaveId),
    [enclaves]
  );
  const eligibleEnclaveIdSet = useMemo(() => new Set(eligibleEnclaveIds), [eligibleEnclaveIds]);
  const airdropBudget = Math.min(eligibleEnclaveIds.length * AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE, AIRDROP_MAX_SUPPLY_PER_TURN);
  const allocated = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  const remaining = Math.max(0, airdropBudget - allocated);
  const allocatedPct = airdropBudget > 0 ? Math.min(100, (allocated / airdropBudget) * 100) : 0;

  useEffect(() => {
    setAllocations(Object.fromEntries(
      enclaves
        .filter(([, enclave]) => (enclave.airdrop_allocation ?? 0) > 0)
        .map(([enclaveId, enclave]) => [enclaveId, enclave.airdrop_allocation ?? 0])
    ));
    setActionMessage(null);
  }, [open, enclaves]);

  const stageAllocations = async () => {
    const result = await ipc.stageAirdropAllocation(allocations);
    setActionMessage(result.ok ? 'Airdrop allocation staged.' : (result.error ?? 'Failed to stage airdrop allocation.'));
  };

  if (!open) return null;

  return (
    <div
      className="absolute right-4 top-16 z-30 w-[24rem] rounded-lg border border-panel-border bg-panel-bg/95 backdrop-blur-sm shadow-xl overflow-hidden"
      style={{ direction: 'ltr' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border">
        <div className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Enclave Dashboard
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          x
        </button>
      </div>
      <div className="max-h-[32rem] overflow-auto p-3 space-y-3">
        {eligibleEnclaveIds.length > 0 && (
          <div className="rounded border border-panel-border bg-panel-card/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">Airdrop budget</span>
              <span className="text-text-primary font-mono">{allocated.toFixed(1)} / {airdropBudget.toFixed(1)}</span>
            </div>
            <div className="h-2 rounded bg-black/30 overflow-hidden">
              <div className="h-full bg-sky-400/80" style={{ width: `${allocatedPct}%` }} />
            </div>
            <div className="text-[10px] text-text-secondary">Remaining: {remaining.toFixed(1)}</div>
            <button
              type="button"
              onClick={() => void stageAllocations()}
              className="w-full rounded border border-panel-border px-2 py-1 text-[11px] text-text-primary hover:bg-panel-hover"
            >
              Stage Airdrop Allocation
            </button>
            {actionMessage && <div className="text-[10px] text-accent-gold">{actionMessage}</div>}
          </div>
        )}
        {enclaves.length === 0 ? (
          <div className="text-xs text-text-secondary italic">No enclave data.</div>
        ) : (
          enclaves.map(([enclaveId, enclave]) => {
            const resiliencePct = Math.max(0, Math.min(100, (enclave.resilience / 30) * 100));
            const hardeningMarkerPct = (8 / 30) * 100;
            const supplyState = enclave.supply_state ?? 'adequate';
            const airdropStatus = enclave.airdrop_status ?? 'not_eligible';
            const risk = getEnclaveRisk(enclave);
            return (
              <div key={enclaveId} className="rounded border border-panel-border bg-panel-card/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-sans text-sm text-text-primary font-semibold">
                      {getPlayerSafeEnclaveName(enclave.display_name ?? enclaveId)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-text-secondary">
                      {enclave.faction ?? 'Unknown'}
                    </div>
                  </div>
                  <div className={`text-[11px] font-mono ${enclave.hardening_active ? 'text-accent-gold' : 'text-text-secondary'}`}>
                    {enclave.hardening_active ? 'Hardening active' : 'Hardening inactive'}
                  </div>
                </div>

                <div className={`text-[11px] font-semibold uppercase tracking-wide ${risk.className}`}>
                  {risk.label}
                </div>
                <div className="text-[11px] text-text-secondary">
                  {risk.detail}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">Resilience</span>
                    <span className="text-text-primary font-mono">{enclave.resilience.toFixed(1)} / 30</span>
                  </div>
                  <div className="relative h-2 rounded bg-black/30 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-accent-gold" style={{ width: `${resiliencePct}%` }} />
                    <div className="absolute inset-y-0 border-l border-white/60" style={{ left: `${hardeningMarkerPct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-text-secondary">Isolation turns</div>
                    <div className="text-text-primary font-mono">{enclave.isolation_turns}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Supply state</div>
                    <div className={`font-mono uppercase ${SUPPLY_CLASSES[supplyState]}`}>{supplyState}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-text-secondary">Airdrop</div>
                    <div className="text-text-primary font-mono">{AIRDROP_LABELS[airdropStatus]}</div>
                  </div>
                  {eligibleEnclaveIdSet.has(enclaveId) && (
                    <div className="col-span-2">
                      <div className="text-text-secondary mb-1">Allocated supply</div>
                      <input
                        type="number"
                        min={0}
                        max={airdropBudget}
                        step={0.1}
                        value={(allocations[enclaveId] ?? 0).toFixed(1)}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setAllocations((prev) => ({
                            ...prev,
                            [enclaveId]: Number.isFinite(value) && value > 0 ? value : 0,
                          }));
                        }}
                        className="w-full rounded border border-panel-border bg-panel-bg px-2 py-1 text-text-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import type { RecruitmentCatalogBrigade, RecruitmentEligibilityReason } from '../desktop/types';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafeDisplayLabel, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';

interface RecruitmentModalProps {
  isOpen: boolean;
  loading: boolean;
  applying: boolean;
  playerFaction?: string | null;
  brigades: RecruitmentCatalogBrigade[];
  /** Brigade to open on (the Desk's recruitment matter); falls back to the first raisable one. */
  initialBrigadeId?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onApply: (brigadeId: string, equipmentClass: string) => void;
}

const EQUIPMENT_CLASS_LABEL_KEYS: Record<string, MessageKey> = {
  garrison: 'recruitment.equipment.garrison',
  light: 'recruitment.equipment.light',
  light_infantry: 'recruitment.equipment.lightInfantry',
  mechanized: 'recruitment.equipment.mechanized',
  motorized: 'recruitment.equipment.motorized',
  mountain: 'recruitment.equipment.mountain',
  police: 'recruitment.equipment.police',
  special: 'recruitment.equipment.special',
};

function getEquipmentClassLabel(equipmentClass: string): string {
  const labelKey = EQUIPMENT_CLASS_LABEL_KEYS[equipmentClass.trim()];
  return labelKey ? t(labelKey) : getPlayerSafeDisplayLabel(equipmentClass, t('recruitment.equipment.unknown'));
}

const REASON_LABEL_KEYS: Record<RecruitmentEligibilityReason, MessageKey> = {
  wrong_faction: 'recruitment.reason.wrongFaction',
  not_yet_available: 'recruitment.reason.notYetAvailable',
  already_recruited: 'recruitment.reason.alreadyRecruited',
  no_control: 'recruitment.reason.noControl',
  no_manpower: 'recruitment.reason.noManpower',
  no_capital: 'recruitment.reason.noCapital',
  no_equipment: 'recruitment.reason.noEquipment',
};

function getReasonLabel(brigade: RecruitmentCatalogBrigade, reason: RecruitmentEligibilityReason): string {
  return reason === 'not_yet_available'
    ? t(REASON_LABEL_KEYS[reason], { week: brigade.available_from })
    : t(REASON_LABEL_KEYS[reason]);
}

/** The requested brigade when it can still be raised, else the first raisable one. */
export function selectInitialRecruitmentBrigade(
  eligible: readonly RecruitmentCatalogBrigade[],
  requestedBrigadeId: string | null | undefined,
): RecruitmentCatalogBrigade | undefined {
  return (requestedBrigadeId ? eligible.find((b) => b.id === requestedBrigadeId) : undefined) ?? eligible[0];
}

function isAlreadyRaised(brigade: RecruitmentCatalogBrigade): boolean {
  return (brigade.reason_codes ?? []).includes('already_recruited');
}

export function RecruitmentModal({
  isOpen,
  loading,
  applying,
  playerFaction,
  brigades,
  initialBrigadeId = null,
  onClose,
  onRefresh,
  onApply,
}: RecruitmentModalProps) {
  const playerBrigades = useMemo(
    () => brigades.filter((b) => !playerFaction || b.faction === playerFaction),
    [brigades, playerFaction]
  );
  const eligible = useMemo(() => playerBrigades.filter((b) => b.eligible !== false), [playerBrigades]);
  // Wargame convention (HOI4 deployment, AGEOD reinforcements, WitE build queues): a unit that is
  // already in the field leaves the raise list. Raised brigades are kept only as a closed,
  // read-only tally at the bottom so the player can still check what exists.
  const raised = useMemo(
    () => playerBrigades.filter((b) => b.eligible === false && isAlreadyRaised(b)),
    [playerBrigades]
  );
  const unavailable = useMemo(
    () => playerBrigades.filter((b) => b.eligible === false && !isAlreadyRaised(b)),
    [playerBrigades]
  );

  const [selectedBrigadeId, setSelectedBrigadeId] = useState('');
  const [equipmentClass, setEquipmentClass] = useState('');
  const equipmentClassLabel = getEquipmentClassLabel(equipmentClass);

  useEffect(() => {
    if (!isOpen) return;
    const first = selectInitialRecruitmentBrigade(eligible, initialBrigadeId);
    setSelectedBrigadeId(first?.id ?? '');
    setEquipmentClass(first?.default_equipment_class ?? 'light');
  }, [isOpen, eligible, initialBrigadeId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.OVERLAY_LIGHT}
      ariaLabelledBy="recruitment-title"
      backdropClassName="bg-black/60"
      panelClassName="w-full max-w-2xl max-h-[min(760px,calc(var(--interface-viewport-height,100vh)-2rem))] mx-4 bg-panel-card border border-panel-border rounded-lg shadow-xl overflow-hidden flex flex-col"
    >
      <>
        <div className="px-4 py-3 border-b border-panel-border bg-panel-bg flex items-center justify-between">
          <h2 id="recruitment-title" className="font-sans text-sm text-accent-gold uppercase tracking-wide font-semibold">
            {t('recruitment.title')}
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || applying}
            className="px-2 py-1 text-xs font-mono uppercase tracking-wide bg-panel-bg hover:bg-panel-hover text-text-primary border border-panel-border rounded disabled:opacity-50"
          >
            {t('recruitment.refresh')}
          </button>
        </div>
        <div className="p-4 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 w-full bg-panel-card border border-panel-border rounded panel-shimmer" />
              <div className="h-10 w-full bg-panel-card border border-panel-border rounded panel-shimmer" />
            </div>
          ) : playerBrigades.length === 0 ? (
            <p className="text-xs text-text-secondary">{t('recruitment.noBrigades')}</p>
          ) : (
            <>
              <section aria-labelledby="recruitment-eligible-title" className="space-y-3">
              <h3 id="recruitment-eligible-title" className="text-xs font-semibold uppercase text-text-primary">{t('recruitment.eligibleNow')}</h3>
              {eligible.length === 0 ? <p className="text-sm text-text-secondary">{t('recruitment.noneEligible')}</p> : <>
              <label className="block text-sm text-text-secondary">
                {t('recruitment.brigade')}
                <select
                  aria-label={t('recruitment.brigadeAria')}
                  value={selectedBrigadeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedBrigadeId(id);
                    const selected = eligible.find((b) => b.id === id);
                    setEquipmentClass(selected?.default_equipment_class ?? 'light');
                  }}
                  className="mt-1 w-full min-h-10 px-3 py-2 bg-panel-bg border border-panel-border rounded text-sm text-text-primary"
                >
                  {eligible.map((b) => (
                    <option key={b.id} value={b.id}>
                      {t('recruitment.optionLabel', {
                        name: b.name,
                        faction: getPlayerSafePoliticalFactionName(b.faction),
                        capital: b.capital_cost,
                        manpower: b.manpower_cost,
                        equipment: getEquipmentClassLabel(b.default_equipment_class),
                      })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-text-secondary">
                {t('recruitment.equipmentClass')}
                <input
                  aria-label={t('recruitment.equipmentClassAria')}
                  value={equipmentClassLabel}
                  readOnly
                  className="mt-1 w-full min-h-10 px-3 py-2 bg-panel-bg border border-panel-border rounded text-sm text-text-primary"
                />
              </label>
              </>}
              </section>
              {unavailable.length > 0 && (
                <section aria-labelledby="recruitment-unavailable-title" className="space-y-2 border-t border-panel-border pt-4">
                  <h3 id="recruitment-unavailable-title" className="text-xs font-semibold uppercase text-text-primary">{t('recruitment.unavailable')}</h3>
                  <ul className="space-y-2">
                    {unavailable.map((brigade) => (
                      <li key={brigade.id} className="border border-panel-border rounded p-3 bg-panel-bg">
                        <div className="text-sm font-medium text-text-primary">{brigade.name}</div>
                        <div className="mt-1 text-xs leading-relaxed text-text-secondary">
                          {(brigade.reason_codes ?? []).map((reason) => getReasonLabel(brigade, reason)).join(' | ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {raised.length > 0 && (
                <details data-testid="recruitment-raised" className="group border-t border-panel-border pt-4">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase text-text-secondary hover:text-text-primary [&::-webkit-details-marker]:hidden">
                    <span aria-hidden="true" className="inline-block text-sm transition-transform group-open:rotate-90">▸</span>
                    {t('recruitment.alreadyRaised', { count: raised.length })}
                  </summary>
                  <p className="mt-1 text-xs text-text-secondary">{t('recruitment.alreadyRaisedNote')}</p>
                  <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    {raised.map((brigade) => (
                      <li key={brigade.id} className="truncate text-sm text-text-secondary" title={brigade.name}>
                        {brigade.name}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-panel-border bg-panel-bg flex justify-end gap-2">
          <button
            type="button"
            data-testid="recruitment-close"
            onClick={onClose}
            className="min-h-10 px-3 py-2 text-sm font-sans text-text-secondary hover:text-interactive hover:bg-panel-hover rounded border border-panel-border"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            data-testid="recruitment-apply"
            disabled={loading || applying || !selectedBrigadeId || !equipmentClass.trim()}
            onClick={() => onApply(selectedBrigadeId, equipmentClass.trim())}
            className="min-h-10 px-4 py-2 text-sm font-sans bg-interactive text-neutral-950 hover:bg-panel-hover rounded border border-panel-border disabled:opacity-50"
          >
            {applying ? t('recruitment.recruiting') : t('recruitment.recruit')}
          </button>
        </div>
      </>
    </Modal>
  );
}

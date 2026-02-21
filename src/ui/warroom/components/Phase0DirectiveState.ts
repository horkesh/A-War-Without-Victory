/**
 * Phase 0 Directive Staging System — manages staged investments before turn advance.
 *
 * Pattern: mirrors Phase II order staging. Player stages investments, previews
 * costs, can undo individual investments or clear all, then confirms when
 * advancing the turn via the calendar.
 *
 * No Math.random(), no Date.now(). Deterministic iteration via strictCompare.
 */

import { initializePhase0Relationships, updateAllianceAfterInvestment } from '../../../phase0/alliance.js';
import { getPrewarCapital } from '../../../phase0/capital.js';
import type { InvestmentScope, InvestmentType } from '../../../phase0/investment.js';
import { applyInvestment, getInvestmentCostWithCoordination, isCoordinationEligibleFaction, isToAllowedForFaction } from '../../../phase0/investment.js';
import type { FactionId, GameState, MunicipalityId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/** A single staged investment directive. */
export interface StagedInvestment {
    /** Unique ID for this staged investment (deterministic). */
    id: string;
    /** Faction making the investment. */
    factionId: FactionId;
    /** Type of investment. */
    investmentType: InvestmentType;
    /** Scope: municipality or region. */
    scope: InvestmentScope;
    /** Cost of this investment (municipality-level or region-level). */
    cost: number;
    /** Target municipality IDs. */
    targetMunIds: MunicipalityId[];
    /** Whether this investment was coordinated with ally (RBiH/HRHB only). */
    coordinated?: boolean;
}

/** Validation result for a proposed staged investment. */
export interface StagedInvestmentValidation {
    valid: boolean;
    reason?: string;
}

/**
 * Phase 0 Directive State — tracks staged investments for the current turn.
 */
export class Phase0DirectiveState {
    private staged: StagedInvestment[] = [];
    private nextId = 0;

    /** Get all currently staged investments (defensive copy). */
    getStagedInvestments(): readonly StagedInvestment[] {
        return [...this.staged];
    }

    /** Get total cost of all staged investments. */
    getTotalStagedCost(): number {
        let total = 0;
        for (const inv of this.staged) {
            total += inv.cost;
        }
        return total;
    }

    /** Get staged investment count. */
    getStagedCount(): number {
        return this.staged.length;
    }

    /**
     * Validate a proposed investment before staging.
     * Checks: sufficient capital, TO-only-RBiH, no hostile majority (future).
     */
    validate(
        state: GameState,
        factionId: FactionId,
        investmentType: InvestmentType,
        targetMunIds: MunicipalityId[],
        options?: { coordinated?: boolean }
    ): StagedInvestmentValidation {
        // Check TO restriction
        if (investmentType === 'to' && !isToAllowedForFaction(factionId)) {
            return { valid: false, reason: 'TO investment is only available to RBiH' };
        }

        const coordinated = options?.coordinated === true && isCoordinationEligibleFaction(factionId);

        // Check cost vs available capital
        const scope: InvestmentScope = targetMunIds.length <= 1
            ? { kind: 'municipality', mun_ids: targetMunIds }
            : { kind: 'region', mun_ids: targetMunIds };
        const cost = getInvestmentCostWithCoordination(investmentType, scope, coordinated);

        const available = getPrewarCapital(state, factionId);
        const alreadyStaged = this.getTotalStagedCost();

        if (cost > available - alreadyStaged) {
            return { valid: false, reason: `Insufficient capital: need ${cost}, have ${available - alreadyStaged} remaining` };
        }

        return { valid: true };
    }

    /**
     * Stage a new investment. Returns the staged investment or null if validation fails.
     */
    stage(
        state: GameState,
        factionId: FactionId,
        investmentType: InvestmentType,
        targetMunIds: MunicipalityId[],
        options?: { coordinated?: boolean }
    ): StagedInvestment | null {
        const coordinated = options?.coordinated === true && isCoordinationEligibleFaction(factionId);
        const validation = this.validate(state, factionId, investmentType, targetMunIds, { coordinated });
        if (!validation.valid) {
            return null;
        }

        const scope: InvestmentScope = targetMunIds.length <= 1
            ? { kind: 'municipality', mun_ids: targetMunIds }
            : { kind: 'region', mun_ids: targetMunIds };
        const cost = getInvestmentCostWithCoordination(investmentType, scope, coordinated);

        const investment: StagedInvestment = {
            id: `staged_${this.nextId++}`,
            factionId,
            investmentType,
            scope,
            cost,
            targetMunIds: [...targetMunIds].sort(strictCompare),
            coordinated,
        };

        this.staged.push(investment);
        return investment;
    }

    /**
     * Unstage (remove) a specific investment by ID.
     */
    unstage(id: string): boolean {
        const idx = this.staged.findIndex(inv => inv.id === id);
        if (idx === -1) return false;
        this.staged.splice(idx, 1);
        return true;
    }

    /**
     * Clear all staged investments.
     */
    clear(): void {
        this.staged = [];
    }

    /**
     * Apply all staged investments to the game state.
     * Called during turn advance. Mutates state in place.
     * Returns the number of investments successfully applied.
     */
    applyAll(state: GameState): number {
        let applied = 0;

        // Sort staged investments deterministically for application order
        const sorted = [...this.staged].sort((a, b) => strictCompare(a.id, b.id));

        for (const inv of sorted) {
            const capital = getPrewarCapital(state, inv.factionId);
            if (capital < inv.cost) {
                continue; // Skip if insufficient capital (shouldn't happen with validation)
            }

            const result = applyInvestment(state, inv.factionId, inv.investmentType, inv.scope, {
                coordinated: inv.coordinated === true
            });
            if (!result.ok) continue;
            if (!state.phase0_relationships) {
                state.phase0_relationships = initializePhase0Relationships();
            }
            updateAllianceAfterInvestment(state.phase0_relationships, inv.factionId, inv.coordinated === true);
            applied++;
        }

        // Clear staged after application
        this.staged = [];
        return applied;
    }
}

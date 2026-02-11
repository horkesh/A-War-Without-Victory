*** Begin Patch
*** Update File: militia-system.js
@@
 // ==================== MILITIA SYSTEM ====================
 // Bottom-up military organization: Settlement militias â†’ Municipal TO â†’ Brigades
 // Based on historical research and census demographics
 
 const MilitiaSystem = {
     municipalTOs: {},          // Municipal Territorial Defense units (109 total)
     settlementMilitias: {},    // Individual settlement militias (2200+)
+
+    // Authority states (pulled from Master logic / game state)
+    // Expected: 'consolidated' | 'contested' | 'fragmented'
+    authorityStates: {
+        consolidated: 'consolidated',
+        contested: 'contested',
+        fragmented: 'fragmented'
+    },
@@
     // Initialize militia system
     initialize() {
         console.log("=== INITIALIZING MILITIA SYSTEM ===");
         
         // 1. Calculate settlement militias
         this.calculateSettlementMilitias();
         
         // 2. Aggregate into municipal TOs
         this.createMunicipalTOs();
         
         // 3. Set initial equipment levels (April 1992)
         this.setInitialEquipment();
+
+        // 4. Apply authority-state modifiers (coordination / usability penalties)
+        // This couples the militia layer to the contested-authority framework in the Master document.
+        this.applyAuthorityStateModifiers();
         
         console.log(`Settlement militias: ${Object.keys(this.settlementMilitias).length}`);
         console.log(`Municipal TOs: ${Object.keys(this.municipalTOs).length}`);
         
         // Log some examples
         this.logExampleMilitias();
     },
+
+    // ---------- Authority State Integration ----------
+
+    // Get municipality authority state from game state (preferred), fall back to consolidated.
+    // The demo HTML uses a gameState stub; the real game should populate this.
+    getMunicipalAuthorityState(municipalityId) {
+        try {
+            if (typeof gameState !== 'undefined' &&
+                gameState &&
+                gameState.municipalities &&
+                gameState.municipalities[municipalityId] &&
+                gameState.municipalities[municipalityId].authorityState) {
+                return String(gameState.municipalities[municipalityId].authorityState).toLowerCase();
+            }
+        } catch (e) {
+            // Ignore and fall back
+        }
+        return this.authorityStates.consolidated;
+    },
+
+    // Apply authority-state modifiers to all militias and TOs.
+    // Contested: coordination penalty (usable force lower)
+    // Fragmented: cannot form brigades, morale decay exposure handled per-turn
+    applyAuthorityStateModifiers() {
+        // Apply to settlement militias (baseStrength / derived strengths)
+        for (let militia of Object.values(this.settlementMilitias)) {
+            const aState = this.getMunicipalAuthorityState(militia.municipalityId);
+            militia.authorityState = aState;
+
+            // Contested municipalities field fighters, but usability/coordination is worse.
+            if (aState === this.authorityStates.contested) {
+                militia.baseStrength = Math.round(militia.baseStrength * 0.85);
+            } else if (aState === this.authorityStates.fragmented) {
+                militia.baseStrength = Math.round(militia.baseStrength * 0.70);
+            }
+        }
+
+        // Recalculate equipment-derived strengths after baseStrength changes
+        for (let militia of Object.values(this.settlementMilitias)) {
+            this.setMilitiaEquipment(militia, militia.equipment || 'poorly_armed');
+        }
+
+        // Apply to municipal TOs (offensive penalty; brigade formation constraint)
+        for (let to of Object.values(this.municipalTOs)) {
+            const aState = this.getMunicipalAuthorityState(to.municipalityId);
+            to.authorityState = aState;
+
+            // Force recalculation from constituent militias
+            to.defensiveStrength = to.militias.reduce((sum, m) => sum + (m.defensiveStrength || 0), 0);
+            to.offensiveStrength = to.militias.reduce((sum, m) => sum + (m.offensiveStrength || 0), 0);
+
+            if (aState === this.authorityStates.contested) {
+                to.offensiveStrength = Math.round(to.offensiveStrength * 0.75);
+            } else if (aState === this.authorityStates.fragmented) {
+                to.offensiveStrength = Math.round(to.offensiveStrength * 0.60);
+            }
+
+            // Fragmented municipalities cannot form brigades (institutional collapse)
+            if (aState === this.authorityStates.fragmented) {
+                to.canFormBrigade = false;
+            }
+        }
+    },
@@
     // Calculate militia for each settlement based on demographics
     calculateSettlementMilitias() {
         for (let settlement of Object.values(SettlementSystem.settlements)) {
             // Create militias for EACH ethnic group present
             const militias = this.calculateSettlementMilitiasAllFactions(settlement);
@@
     calculateSettlementMilitiaForFaction(settlement, controller, ethnicity, population, pct) {
         // Military-age males â‰ˆ 20% of this ethnic group's population
         const militaryAgeMales = Math.round(population * 0.20);
@@
-        // CALCULATE ORGANIZATION QUALITY
+        // CALCULATE ORGANIZATION QUALITY
         const quality = orgQuality.level;
         const qualityData = this.organizationLevels[quality];
@@
-        // CALCULATE DEFENSIVE STRENGTH
+        // CALCULATE DEFENSIVE STRENGTH
         // Base strength = size Ã— organization multiplier
         const baseStrength = militiaSize * qualityData.multiplier;
         
         return {
             // Size
             size: militiaSize,
             maxPotential: Math.round(militaryAgeMales * 0.25), // Max possible (25%)
             militaryAgeMales: militaryAgeMales,
             mobilizationRate: mobilizationRate,
             
             // Faction
             controller: controller,
             ethnicity: ethnicity,
             ethnicPopulation: population,
             ethnicPct: pct,
             
             // Quality
             quality: quality,
             qualityMultiplier: qualityData.multiplier,
             training: qualityData.training,
             cohesion: qualityData.cohesion,
-            morale: this.calculateMoraleForFaction(settlement, pct),
-            
-            // Quality
-            quality: quality,
-            qualityMultiplier: qualityData.multiplier,
-            training: qualityData.training,
-            cohesion: qualityData.cohesion,
-            morale: this.calculateMorale(settlement),
+            morale: this.calculateMoraleForFaction(settlement, pct),
             
             // Equipment (set later)
             equipment: 'poorly_armed', // Default April 1992
             armedPct: 0.50,
             effectiveness: 0.40,
             
             // Combat strength
             baseStrength: Math.round(baseStrength),
             defensiveStrength: 0,  // Calculated after equipment
             offensiveStrength: 0,
@@
             // Settlement reference
             settlementId: settlement.id,
             settlementName: settlement.name,
             municipalityId: settlement.municipalityId
         };
     },
@@
     // Calculate morale based on situation (legacy - uses majority)
     calculateMorale(settlement) {
         let morale = 70; // Base
@@
         return Math.max(40, Math.min(100, morale));
     },
+
+    // ---------- Early-war minority militia decay / suppression ----------
+    // Call this once per turn from your main turn loop (NOT from initialize).
+    // This prevents ahistorical long-lived minority militias in non-urban settlements
+    // under opposing consolidated/coercively seized authority.
+    //
+    // Intended usage:
+    //   MilitiaSystem.applyTurnEffects(gameState.turn)
+    applyTurnEffects(turnNumber) {
+        // Only apply in early war window (turns 1–3 by default)
+        const t = Number(turnNumber || 1);
+        if (t < 1 || t > 3) return;
+
+        for (let militia of Object.values(this.settlementMilitias)) {
+            const settlement = SettlementSystem.settlements[militia.settlementId];
+            if (!settlement) continue;
+
+            // Only minorities
+            if (militia.ethnicPct >= 0.25) continue;
+
+            // Only non-urban (urban areas can sustain minority organization longer)
+            if (settlement.urban || settlement.isCapital) continue;
+
+            // If municipality authority is consolidated/coercively seized by an opponent, minorities decay.
+            const munState = this.getMunicipalAuthorityState(militia.municipalityId);
+            if (munState !== this.authorityStates.consolidated) continue;
+
+            // If this militia is NOT the settlement controller's faction, apply suppression
+            const settlementController = this.determineController(settlement);
+            if (militia.controller === settlementController) continue;
+
+            // Decay 20–40% per turn (deterministic-ish via pct; avoids RNG reliance)
+            const decay = Math.min(0.40, Math.max(0.20, 0.20 + (0.25 - militia.ethnicPct))); // 0.20..0.40
+            const newSize = Math.max(0, Math.round(militia.size * (1 - decay)));
+
+            // Apply size shrink; reflect displacement/underground
+            militia.size = newSize;
+            militia.active = newSize > 0;
+
+            // Reduce morale as intimidation/flight accelerates
+            militia.morale = Math.max(30, Math.round(militia.morale - 10));
+
+            // Recompute baseStrength after size change (keep quality multiplier)
+            militia.baseStrength = Math.round(militia.size * militia.qualityMultiplier);
+            this.setMilitiaEquipment(militia, militia.equipment || 'poorly_armed');
+        }
+
+        // After militia changes, refresh TO aggregates (strengths and brigade eligibility)
+        for (let to of Object.values(this.municipalTOs)) {
+            // Recompute totalStrength from constituent militias (post-decay)
+            to.totalStrength = to.militias.reduce((sum, m) => sum + (m.size || 0), 0);
+            to.baseStrength = Math.round(to.militias.reduce((sum, m) => sum + (m.baseStrength || 0), 0));
+            to.defensiveStrength = to.militias.reduce((sum, m) => sum + (m.defensiveStrength || 0), 0);
+            to.offensiveStrength = to.militias.reduce((sum, m) => sum + (m.offensiveStrength || 0), 0);
+
+            // Re-apply authority modifiers (contested / fragmented penalties)
+            const aState = this.getMunicipalAuthorityState(to.municipalityId);
+            to.authorityState = aState;
+            if (aState === this.authorityStates.contested) {
+                to.offensiveStrength = Math.round(to.offensiveStrength * 0.75);
+            } else if (aState === this.authorityStates.fragmented) {
+                to.offensiveStrength = Math.round(to.offensiveStrength * 0.60);
+                to.canFormBrigade = false;
+            } else {
+                // Consolidated: brigade eligibility based on updated totals
+                to.canFormBrigade = to.totalStrength >= 800;
+            }
+        }
+    },
@@
     // Aggregate settlement militias into municipal TO
     aggregateMunicipalTO(munId, munName, faction, militias) {
         // Sum total strength
         const totalSize = militias.reduce((sum, m) => sum + m.size, 0);
         const totalBaseStrength = militias.reduce((sum, m) => sum + m.baseStrength, 0);
@@
         // Determine quality level
         let quality;
         if (avgQualityScore >= 1.0) quality = 'exceptional';
         else if (avgQualityScore >= 0.7) quality = 'organized';
         else if (avgQualityScore >= 0.45) quality = 'poor';
         else quality = 'chaotic';
@@
         const avgMorale = Math.round(
             militias.reduce((sum, m) => sum + m.morale, 0) / militias.length
         );
+
+        // Authority-state coupling: contested/fragmented municipalities reduce coordination and usability.
+        const authorityState = this.getMunicipalAuthorityState(munId);
+        let authorityQualityPenalty = 0.0;
+        if (authorityState === this.authorityStates.contested) authorityQualityPenalty = 0.10;
+        if (authorityState === this.authorityStates.fragmented) authorityQualityPenalty = 0.20;
+
+        const adjustedQualityScore = Math.max(0.30, avgQualityScore - authorityQualityPenalty);
+        let adjustedQuality = quality;
+        if (adjustedQualityScore >= 1.0) adjustedQuality = 'exceptional';
+        else if (adjustedQualityScore >= 0.7) adjustedQuality = 'organized';
+        else if (adjustedQualityScore >= 0.45) adjustedQuality = 'poor';
+        else adjustedQuality = 'chaotic';
         
         return {
             // Identity
             id: `${munId}_${faction}`,
             municipalityId: munId,
             municipalityName: munName,
             faction: faction,
             name: `${munName} TO (${faction.toUpperCase()})`,
+            authorityState: authorityState,
@@
             // Quality
-            overallQuality: quality,
-            qualityScore: avgQualityScore,
+            overallQuality: adjustedQuality,
+            qualityScore: adjustedQualityScore,
             qualityBreakdown: qualityBreakdown,
@@
             // Formation
             formed: 1,  // Turn 1 (April 1992)
             
             // Brigade formation potential
-            canFormBrigade: totalSize >= 800,  // Historical threshold
+            canFormBrigade: (authorityState !== this.authorityStates.fragmented) && (totalSize >= 800),  // Historical threshold + institutional collapse guard
             brigadeFormed: false,
             brigadeId: null
         };
     },
@@
     // Set militia equipment and recalculate strength
     setMilitiaEquipment(militia, equipmentLevel) {
         const equipment = this.equipmentLevels[equipmentLevel];
         
         militia.equipment = equipmentLevel;
         militia.armedPct = equipment.armedPct;
         militia.effectiveness = equipment.effectiveness;
         
         // Recalculate combat strength
         // Defensive = base Ã— armed % Ã— effectiveness Ã— (1 + morale bonus)
         const moraleBonus = (militia.morale - 70) / 100; // -0.3 to +0.3
         militia.defensiveStrength = Math.round(
             militia.baseStrength * equipment.armedPct * equipment.effectiveness * 
             (1 + moraleBonus)
         );
         
         // Offensive = defensive Ã— 0.6 (militia poor on offense)
         militia.offensiveStrength = Math.round(militia.defensiveStrength * 0.6);
     },
@@
     // Set municipal TO equipment
     setTOEquipment(to, equipmentLevel) {
         to.equipment = equipmentLevel;
@@
         // Recalculate TO strength
         to.defensiveStrength = to.militias.reduce((sum, m) => 
             sum + m.defensiveStrength, 0
         );
         to.offensiveStrength = to.militias.reduce((sum, m) => 
             sum + m.offensiveStrength, 0
         );
     },
+
+    // NOTE (intentional constraint):
+    // Settlement militias are NOT maneuver units and should NOT anchor corridors/frontlines directly.
+    // Only Municipal TOs / Brigades should contribute to corridor integrity and frontline anchoring.
+    // This is enforced at higher-level systems (corridors/frontline), not here.
*** End Patch

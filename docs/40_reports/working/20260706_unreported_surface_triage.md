# 2026-07-06 Unreported Surface Triage (WP-3)

Scope: inventory source render sites for English i18n keys whose copy contains `Unreported`/`unreported`, excluding i18n definition files and tests. WP-3 changes only the player-owned force presentation surfaces named in the packet. Enemy intelligence fog and data/read-model absence semantics remain unchanged.

## Disposition Table

| Render site | Key | Ownership | Disposition |
| --- | --- | --- | --- |
| `src/ui/map/components/AARPanel.tsx:258` | `aar.casualtiesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:105` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:109` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:124` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:199` | `armyHqCorps.cohesionUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:278` | `armyHqCorps.commanderUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:375` | `armyHqCorps.commandStrainUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx:377` | `armyHqCorps.commandStrainUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ArmyHQModal.tsx:210` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/CombatRecordSection.tsx:21` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/CommanderSection.tsx:76` | `commanderSection.sourceUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/CommandRelationshipSection.tsx:176` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/CommandRelationshipSection.tsx:182` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/CorpsSituationSection.tsx:54` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/ForceReadiness.tsx:245` | `forceReadiness.fatigueUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx:111` | `opportunity.optionalAxesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx:111` | `opportunity.requiredAxesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx:50` | `opportunity.axis.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:191` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:217` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:269` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:277` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:292` | `operationsSection.commanderUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:510` | `operationsSection.assessmentUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:543` | `operationsSection.objectiveProgressUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:573` | `operationsSection.axisUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:575` | `operationsSection.statusUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:581` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:584` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:644` | `operationsSection.recoveryUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OperationsSection.tsx:659` | `operationHistory.gradeUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx:58` | `opportunityLedger.requiredAxesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx:63` | `opportunityLedger.optionalAxesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:66` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:87` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:99` | `orbat.campaignLossesEstimatedHelp` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:105` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:187` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:201` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:391` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:398` | `orbat.cohesionUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:399` | `orbat.cohesionUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:402` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:423` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/OrbatSection.tsx:428` | `orbat.postureUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:20` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:37` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:43` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:62` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:123` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:125` | `personnel.officerRosterSourceUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:133` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:135` | `personnel.officerRosterSourceUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:143` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:145` | `personnel.officerRosterSourceUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:152` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:169` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:210` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:248` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:264` | `personnel.officerRosterUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/PersonnelContent.tsx:268` | `personnel.officerRosterSourceUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:71` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:79` | `aar.casualtiesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:86` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:159` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:167` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:413` | `sectorsSection.frontageUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/SectorsSection.tsx:444` | `sectorsSection.frontageUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/StrategicPosition.tsx:97` | `strategicPosition.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/StrategicPosition.tsx:107` | `strategicPosition.compositeUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/StrategicPosition.tsx:145` | `strategicPosition.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/StrategicPosition.tsx:160` | `strategicPosition.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/StrategicPosition.tsx:161` | `strategicPosition.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/StrategicPosition.tsx:162` | `strategicPosition.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/army_hq/WarSummaryContent.tsx:40` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/ArmyReservePanel.tsx:122` | `armyReserve.assignedCommandUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/ArmyReservePanel.tsx:262` | `armyReserve.personnelUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/ArmyReservePanel.tsx:521` | `armyReserve.commandAuthorityUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/BrigadeRow.tsx:62` | `brigadeRow.supply.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/BrigadeRow.tsx:84` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/BrigadeRow.tsx:85` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/BrigadeRow.tsx:101` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/BrigadeRow.tsx:159` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/chronicle/generateChronicleEntries.ts:95` | `chronicle.generated.outcome.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/chronicle/generateChronicleEntries.ts:601` | `chronicle.generated.casualties.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/chronicle/generateWrappedSlides.ts:175` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/chronicle/generateWrappedSlides.ts:262` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CombatSummaryPanel.tsx:38` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:35` | `corpsCard.stance.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:81` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:161` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:194` | `corpsCard.stance.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:262` | `corpsCard.commanderUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:306` | `corpsCard.stance.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:367` | `corpsCard.commanderUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsCard.tsx:411` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/CorpsDetail.tsx:49` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsDetail.tsx:153` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsDetail.tsx:274` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsDetail.tsx:314` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsDetail.tsx:449` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsDetail.tsx:483` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsDetail.tsx:551` | `operationsSection.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:46` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:76` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:136` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:143` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:148` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:152` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:156` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:177` | `corpsFront.prep.timingUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:311` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:324` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:369` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:390` | `corpsFront.standardBrigadeEquivalencyUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:393` | `corpsFront.standardBrigadeEquivalencyUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:498` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:502` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:656` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:660` | `corpsFront.logisticsPriorityUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:921` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:928` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/CorpsFrontPanel.tsx:1008` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/EconomyPanel.tsx:72` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/EnclaveDashboard.tsx:232` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/FormationDetail.tsx:124` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:139` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:143` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:147` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:153` | `formationDetail.assignedCommandUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:176` | `formationDetail.conditionUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:245` | `formationDetail.corpsStanceUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:247` | `formationDetail.commandPostureUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:248` | `formationDetail.commandPostureUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:252` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:257` | `formationDetail.campaignLossesDerived` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:609` | `formationDetail.conditionUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:631` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:669` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:676` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:682` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/FormationDetail.tsx:690` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/OOBSidebar.tsx:49` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/OOBSidebar.tsx:55` | `orbat.metricUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/OOBSidebar.tsx:431` | `oob.armyCommanderUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/OOBSidebar.tsx:684` | `operationsSection.objectiveProgressUnreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/OOBSidebar.tsx:694` | `corpsFront.unreported` | OWN-FORCE | OMIT+NOTICE this packet |
| `src/ui/map/components/OperationBriefingModal.tsx:37` | `operationsSection.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationBriefingModal.tsx:81` | `operationBriefing.commanderUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:117` | `operationHistory.gradeFactorUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:272` | `operationHistory.outcomeUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:324` | `operationHistory.gradeUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:420` | `operationHistory.gradeUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:423` | `operationHistory.outcomeUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:565` | `operationHistory.axisObjectiveChainUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationHistoryPanel.tsx:680` | `operationHistory.activeProgressNoObjectives` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationsPanel.tsx:86` | `operationsPanel.tempo.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/OperationsPanel.tsx:97` | `operationsPanel.commanderUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/ops_modal/BrigadeCard.tsx:28` | `operationsSection.metricUnreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/BrigadeCard.tsx:36` | `operationsSection.metricUnreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/BrigadeCard.tsx:60` | `operationsSection.metricUnreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/BrigadeCard.tsx:66` | `operationsSection.metricUnreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/G2Phase.tsx:101` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/NarrativeTab.tsx:47` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/NarrativeTab.tsx:76` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/NarrativeTab.tsx:78` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/NarrativeTab.tsx:107` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/NarrativeTab.tsx:108` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/NarrativeTab.tsx:118` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:59` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:69` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:74` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:94` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:134` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:138` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/ops_modal/RawIntelTab.tsx:139` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/OrbatPanel.tsx:93` | `orbat.metricUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/SettlementTimeline.tsx:31` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/SituationTab.tsx:482` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/SupplyPanel.tsx:36` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/TacticalCard.tsx:20` | `tacticalCard.cohesionUnreportedTitle` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/TacticalCard.tsx:21` | `tacticalCard.fatigueUnreportedTitle` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/TacticalCard.tsx:76` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/components/Tooltip.tsx:65` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/Tooltip.tsx:210` | `corpsFront.unreported` | ENEMY-INTEL | KEEP label |
| `src/ui/map/components/tooltipPlayerSafe.ts:204` | `tooltip.pressure.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/data/playerSupplyVisibility.ts:117` | `corpsFront.unreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/data/presidentialDecisionRoom.ts:677` | `decisionRoom.card.opportunity.evidence.requiredAxesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |
| `src/ui/map/data/presidentialDecisionRoom.ts:682` | `decisionRoom.card.opportunity.evidence.optionalAxesUnreported` | NEUTRAL-SYSTEM | FOLLOW-UP packet |

## Turn-Zero Own-Force Absence Trace

- Corps stance: `CorpsFrontPanel.tsx` reads `sector.sector_stance` and corps stance helpers as nullable presentation inputs. When absent at turn zero, current UI emits a per-field `Unreported` label; WP-3 will omit the label on player-owned force surfaces and register a single report-gap notice.
- Operational security: `CorpsFrontPanel.tsx` treats `sector.opsec_active` as reported only when it is a boolean. Missing turn-zero OPSEC stays missing; WP-3 changes only the visible copy from a field label to the section notice.
- Confidence: `CorpsFrontPanel.tsx` treats `sector.intel_confidence` as reported only when it is a finite number. The own-force sector header currently displays `Confidence: Unreported`; WP-3 keeps the absence but moves it into the shared notice.
- Supply priority: `CorpsFrontPanel.tsx` reads the current logistics priority separately from staged player orders. Missing current priority remains missing; WP-3 omits the row/value label and records `Supply priority` in the notice.

No `src/ui/map/data/*` behavior is in scope for this packet.

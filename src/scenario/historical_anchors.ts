export interface HistoricalSettlementAnchor {
    settlement_id: string;
    expected_controller: string;
}

export interface HistoricalOsidAnchor {
    osid: string;
    expected_controller: string;
}

export const HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992: HistoricalSettlementAnchor[] = [
];

// OSID-level anchors: each entry checks a specific painted OSID against simulated control.
// No municipality plurality; pluralities are unstable when a single settlement flips.
// Use the city-core or enclave-core OSID for each historically unambiguous location.
export const HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992: HistoricalOsidAnchor[] = [
    { osid: 'op:bijeljina:bijeljina_2', expected_controller: 'RS' },
    { osid: 'op:banja_luka:banja_luka_2', expected_controller: 'RS' },
    { osid: 'op:tuzla:tuzla_2', expected_controller: 'RBiH' },
    { osid: 'op:bihac:bihac_2', expected_controller: 'RBiH' },
    { osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', expected_controller: 'RBiH' },
    { osid: 'op:zvornik:zvornik', expected_controller: 'RS' },
    { osid: 'op:zvornik:sapna', expected_controller: 'RBiH' },
    { osid: 'op:ugljevik:teocak_krstac_2', expected_controller: 'RBiH' },
    { osid: 'op:orasje:orasje', expected_controller: 'HRHB' },
    { osid: 'op:brcko:brcko', expected_controller: 'RS' },
    { osid: 'op:brcko:brka_2', expected_controller: 'RBiH' },
    { osid: 'op:gorazde:gorazde_2', expected_controller: 'RBiH' },
    { osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH' },
    { osid: 'op:zavidovici:vozuca_2', expected_controller: 'RS' },
    { osid: 'op:gradacac:gradacac_2', expected_controller: 'RBiH' },
    { osid: 'op:rogatica:zepa_2', expected_controller: 'RBiH' },
    { osid: 'op:derventa:derventa_2', expected_controller: 'RS' },
    { osid: 'op:prijedor:prijedor_2', expected_controller: 'RS' },
    { osid: 'op:foca:foca_3', expected_controller: 'RS' },
    { osid: 'op:visegrad:visegrad_2', expected_controller: 'RS' },
    { osid: 'op:zenica:zenica_2', expected_controller: 'RBiH' },
    { osid: 'op:travnik:travnik_2', expected_controller: 'RBiH' },
    { osid: 'op:mostar:mostar_zapad_2', expected_controller: 'HRHB' },
    { osid: 'op:doboj:boljanic_2', expected_controller: 'RS' },
    { osid: 'op:bugojno:kopcic_2', expected_controller: 'RBiH' },
    { osid: 'op:gracanica:petrovo_2', expected_controller: 'RS' },
    { osid: 'op:lukavac:brijesnica_donja_2', expected_controller: 'RS' },
];

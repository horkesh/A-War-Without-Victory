/** Renderer-only presentation order. Never persisted or used by simulation. */
export function createMusicShuffleBag(ids: readonly string[], random: () => number = Math.random): () => string {
    let remaining: string[] = [];
    let previous: string | null = null;
    return () => {
        if (remaining.length === 0) {
            remaining = [...ids];
            for (let i = remaining.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [remaining[i], remaining[j]] = [remaining[j]!, remaining[i]!];
            }
            if (remaining.length > 1 && remaining[0] === previous) {
                [remaining[0], remaining[1]] = [remaining[1]!, remaining[0]!];
            }
        }
        const next = remaining.shift();
        if (next === undefined) throw new Error('Music bag requires at least one track');
        previous = next;
        return next;
    };
}

export const CAMPAIGN_MUSIC_IDS = Object.freeze([
    'campaign_a_country_before_dawn',
    'campaign_what_remains_of_home',
    'campaign_the_long_winter',
    'campaign_no_answer_on_the_radio',
    'campaign_the_life_we_remember',
    'campaign_a_table_for_strangers',
    'campaign_what_the_maps_cannot_show',
    'campaign_after_the_guns'
]);

/**
 * Static Vite asset imports for Warroom scene plates.
 * Vite resolves these at build time and returns content-hashed URLs.
 * All 15 combinations: 3 factions × 5 years (1991–1995).
 */

import hqRbih1991 from '../../../warroom/assets/hq_rbih_1991.webp';
import hqRbih1992 from '../../../warroom/assets/hq_rbih_1992.webp';
import hqRbih1993 from '../../../warroom/assets/hq_rbih_1993.webp';
import hqRbih1994 from '../../../warroom/assets/hq_rbih_1994.webp';
import hqRbih1995 from '../../../warroom/assets/hq_rbih_1995.webp';

import hqRs1991 from '../../../warroom/assets/hq_rs_1991.webp';
import hqRs1992 from '../../../warroom/assets/hq_rs_1992.webp';
import hqRs1993 from '../../../warroom/assets/hq_rs_1993.webp';
import hqRs1994 from '../../../warroom/assets/hq_rs_1994.webp';
import hqRs1995 from '../../../warroom/assets/hq_rs_1995.webp';

import hqHrhb1991 from '../../../warroom/assets/hq_hrhb_1991.webp';
import hqHrhb1992 from '../../../warroom/assets/hq_hrhb_1992.webp';
import hqHrhb1993 from '../../../warroom/assets/hq_hrhb_1993.webp';
import hqHrhb1994 from '../../../warroom/assets/hq_hrhb_1994.webp';
import hqHrhb1995 from '../../../warroom/assets/hq_hrhb_1995.webp';

/** faction slug → year → bundled asset URL */
export const WARROOM_SCENE_URLS: Record<string, Record<number, string>> = {
  RBiH: {
    1991: hqRbih1991,
    1992: hqRbih1992,
    1993: hqRbih1993,
    1994: hqRbih1994,
    1995: hqRbih1995,
  },
  RS: {
    1991: hqRs1991,
    1992: hqRs1992,
    1993: hqRs1993,
    1994: hqRs1994,
    1995: hqRs1995,
  },
  HRHB: {
    1991: hqHrhb1991,
    1992: hqHrhb1992,
    1993: hqHrhb1993,
    1994: hqHrhb1994,
    1995: hqHrhb1995,
  },
};

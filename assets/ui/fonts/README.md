# Canonical interface fonts

The interface uses two bundled IBM Plex families plus one marker hand, and does not fetch fonts at
runtime:

- **Command:** IBM Plex Sans Condensed (regular, semibold, bold).
- **Data:** IBM Plex Mono Latin-1 and Latin-2 subsets (regular, semibold).
- **Marker:** Caveat Bold (700), Latin and Latin-Ext subsets — the whiteboard date only.

IBM Plex is distributed under the SIL Open Font License 1.1. The bundled license text is
`OFL-1.1.txt`. Caveat is also OFL 1.1 but under a different copyright holder, so it carries its own
license text: `OFL-1.1-Caveat.txt`.

## Source provenance

The Mono assets and license are pinned to IBM/plex tag `v6.4.2`, peeled commit
`242c4cccd37e87985a5337815c99b960ef13c65c`:

- `IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-Regular-Latin1.woff2`
- `IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-Regular-Latin2.woff2`
- `IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-SemiBold-Latin1.woff2`
- `IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-SemiBold-Latin2.woff2`
- `IBM-Plex-Mono/fonts/split/woff2/license.txt` (stored as `OFL-1.1.txt`)

The `unicode-range` declarations are copied byte-for-byte from the range values in the pinned
`IBMPlexMono-Regular.css` and `IBMPlexMono-SemiBold.css` files in the same upstream directory.

The Sans Condensed TTFs were existing repository assets when this contract was introduced.

### Caveat (marker hand)

Pinned to the Google Fonts CSS API's Caveat **v23**, weight 700, fetched 2026-09-11:

- `Caveat-Bold-Latin.woff2` — `https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6eIWpYQ.woff2`
- `Caveat-Bold-LatinExt.woff2` — `https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6eIupYSxP.woff2`
- `OFL-1.1-Caveat.txt` — `https://raw.githubusercontent.com/googlefonts/caveat/main/OFL.txt`

As with IBM Plex Mono, the `unicode-range` declarations in `globals.css` are copied byte-for-byte
from the pinned upstream CSS (`https://fonts.googleapis.com/css2?family=Caveat:wght@700`).

**Both subsets are required.** `getWarroomBoardDateLabel` can return `'Datum čeka'`, and č (U+010D)
lives in the Latin-Ext range `U+0100-02BA`. A digits-and-months subset would drop it.

**Size, against the plan's estimate.** The owning plan budgeted "roughly 20–30 KB" for a subset
handwriting face. Measured: **70,592 bytes** — 51,020 for Latin and 19,572 for Latin-Ext. The
Latin subset is the surprise; a hand at weight 700 carries heavier outlines than the estimate
assumed. Recorded here rather than quietly accepted, because the plan's figure is now known wrong
and the next person should not re-derive it. 70 KB in a packaged desktop app is affordable; the
estimate was not.

**Glyph coverage is asserted from the upstream `unicode-range`, not verified locally.** `fonttools`
is not installed here, so no independent check of the cmap was made. This is the same basis the
IBM Plex Mono subsets rest on.

## SHA-256

```text
IBMPlexSans_Condensed-Regular.ttf: 964e32e6ed80b2b4f439156970ac66343ebb817a9178faa211c3eaaac523bc40
IBMPlexSans_Condensed-SemiBold.ttf: f633eb42e8c22da21dbf2a494c1073100b5a4fdc24463d62862fedab705cf617
IBMPlexSans_Condensed-Bold.ttf: 750124fb67e5cdd48192d7ad0d232fdca795acccc65ccacb5a1e8010ddbe39e9
IBMPlexMono-Regular-Latin1.woff2: 10d3c7fa7eaf48e78db24f317b64f008a75e00f63a68bb3c2afc6ef51e58674f
IBMPlexMono-Regular-Latin2.woff2: 151a2b0dfb8271b5273f71da83e9e68c85e1939e4f016f6ab2dfac98ea9f117e
IBMPlexMono-SemiBold-Latin1.woff2: 1ce95cff1c5056cb0fed049c2912823293b158b816e193a6f937f2d92b1e0f39
IBMPlexMono-SemiBold-Latin2.woff2: c27c77e14d3da7aafa7ff9c6356c9a10d8724ade09c81f5873a3832796a64b1f
Caveat-Bold-Latin.woff2: 15f9638095ad5ec9816f93d66805ca1a87e71dc5a76b596bfce1c78d4704c405
Caveat-Bold-LatinExt.woff2: f97b55783e417e37fce40600ad946b11eb63741a1cfdb2cd3907febc3cd8927f
```

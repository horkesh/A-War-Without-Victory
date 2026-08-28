# Canonical interface fonts

The interface uses two bundled IBM Plex families and does not fetch fonts at runtime:

- **Command:** IBM Plex Sans Condensed (regular, semibold, bold).
- **Data:** IBM Plex Mono Latin-1 and Latin-2 subsets (regular, semibold).

IBM Plex is distributed under the SIL Open Font License 1.1. The bundled license text is `OFL-1.1.txt`.

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

## SHA-256

```text
IBMPlexSans_Condensed-Regular.ttf: 964e32e6ed80b2b4f439156970ac66343ebb817a9178faa211c3eaaac523bc40
IBMPlexSans_Condensed-SemiBold.ttf: f633eb42e8c22da21dbf2a494c1073100b5a4fdc24463d62862fedab705cf617
IBMPlexSans_Condensed-Bold.ttf: 750124fb67e5cdd48192d7ad0d232fdca795acccc65ccacb5a1e8010ddbe39e9
IBMPlexMono-Regular-Latin1.woff2: 10d3c7fa7eaf48e78db24f317b64f008a75e00f63a68bb3c2afc6ef51e58674f
IBMPlexMono-Regular-Latin2.woff2: 151a2b0dfb8271b5273f71da83e9e68c85e1939e4f016f6ab2dfac98ea9f117e
IBMPlexMono-SemiBold-Latin1.woff2: 1ce95cff1c5056cb0fed049c2912823293b158b816e193a6f937f2d92b1e0f39
IBMPlexMono-SemiBold-Latin2.woff2: c27c77e14d3da7aafa7ff9c6356c9a10d8724ade09c81f5873a3832796a64b1f
```

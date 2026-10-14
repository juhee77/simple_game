# Third-Party Notices

This project avoids bundling third-party image assets with unclear provenance.
Nothing below is vendored into the repository: every library, font and map tile is
loaded at runtime from the public CDN or service listed.

## Libraries

| Library | Version | Used by | License | Source |
|---|---|---|---|---|
| three.js | 0.160.0 | `solar.html`, `particle-sim.html` | MIT | https://github.com/mrdoob/three.js |
| Leaflet | 1.9.4 | `photo-travel-map.html`, `photo-inspector.html` | BSD-2-Clause | https://github.com/Leaflet/Leaflet |
| Exif.js | 2.3.0 | `photo-travel-map.html`, `photo-inspector.html` | MIT | https://github.com/exif-js/exif-js |
| gifshot | 0.3.2 | `photo-slideshow.html` | MIT | https://github.com/yahoo/gifshot |
| gifenc | 1.0.3 | `photo-travel-map.html` (loaded on demand when making a GIF) | MIT | https://github.com/mattdesl/gifenc |
| jsPDF | 2.5.1 | `photo-book.html` | MIT | https://github.com/parallax/jsPDF |
| QRCode.js | 1.0.0 | `qr-wifi.html` | MIT | https://github.com/davidshimjs/qrcodejs |
| marked | 11.1.1 | Rules/guide text in 16 games (e.g. `bomb-defusal.html`, `project-lethe.html`) | MIT | https://github.com/markedjs/marked |
| Remix Icon | 3.5.0 | Icons in 24 games (e.g. `two-truths.html`, `yacht-dice.html`) | Apache-2.0 | https://github.com/Remix-Design/RemixIcon |

Loaded from `cdnjs.cloudflare.com`, `cdn.jsdelivr.net` and `unpkg.com`.

## Fonts

All fonts are licensed under the **SIL Open Font License 1.1**.

- **Pretendard** (v1.3.9, via jsDelivr) — https://github.com/orioncactus/pretendard
- **Google Fonts** (via `fonts.googleapis.com`) — https://fonts.google.com
  - Outfit, Plus Jakarta Sans, Share Tech Mono, JetBrains Mono, Playfair Display,
    Noto Sans KR, Noto Serif KR, Nanum Myeongjo, Jua, Bebas Neue, Cinzel, Marcellus,
    Orbitron, Quicksand, Fredoka

## Map tiles and data

Used by `photo-travel-map.html` (all three styles) and `photo-inspector.html` (satellite only).
Attribution is shown in the map's bottom-right corner, and a short credit is drawn onto
exported map images (PNG) and timelapse GIFs.

- **Esri World Imagery** (satellite) — Tiles © Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community.
  Terms: https://www.esri.com/en-us/legal/terms/full-master-agreement
- **Esri World Topo Map** (terrain) — Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community.
- **OpenStreetMap standard tiles** (`tile.openstreetmap.org`) — © OpenStreetMap contributors.
  Map data is available under the Open Database License (ODbL): https://www.openstreetmap.org/copyright.
  Tiles are used under the OSM Foundation Tile Usage Policy (https://operations.osmfoundation.org/policies/tiles/),
  which permits light use only; switch to a commercial or self-hosted tile provider if traffic grows.

`menu.html` links out to Kakao Map search (an external link only; no map is embedded).

## Project-specific notes

- The memory game uses emoji/text rendering instead of bundled sprite images.
- The solar-system game uses procedural colors and generated stars instead of remote planet texture images.
- Subway station coordinates in `midpoint-finder.html` are drawn on a plain canvas; no third-party map is used there.

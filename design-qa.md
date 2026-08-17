# Vector field design QA

## Evidence

- Source visual truth: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/design-reference-vector-field.png`
- Browser-rendered implementation: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/vector-implementation-final.jpg`
- Normalized implementation crop: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/vector-implementation-crop.jpg`
- Side-by-side comparison: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/vector-design-comparison.jpg`
- Route: `http://localhost:3000/vector`
- Viewport: 1080 × 1140 CSS px at device scale factor 1. The persistent 60 px navigation was removed from the implementation evidence for a 1080 × 1080 content comparison.
- Source pixels: 1080 × 1080. Normalized implementation pixels: 1080 × 1080. No density scaling was required.
- State: default 22-density field, direction arrows and moving points enabled, axes and critical-point markers hidden, global brand FX active.

## Full-view comparison evidence

The source and final implementation were opened together in one 2184 × 1140 comparison image. Both resolve as square white scientific fields with a thin calibrated perimeter, five labeled coordinate values, one converging left node, one diverging right node, broad curved left trajectories, a tight central bridge, and a radial right fan. The implementation intentionally translates the source's violet ink into the established navy/powder/signal palette and preserves the shared global dither treatment.

## Focused-region comparison evidence

A separate focused crop was unnecessary because the source and implementation are both 1080 px square and the complete path geometry, arrowheads, ticks, scale labels, and node whitespace remain individually legible in the native-size side-by-side comparison. The controls are outside the source visual target and were verified independently through their rendered semantics and state changes.

## Required fidelity surfaces

- Fonts and typography: scale labels use a compact system monospace at the same low hierarchy as the reference. Shared navigation retains the established Geist interface style; the field itself contains no title or explanatory copy.
- Spacing and layout rhythm: the plot remains square, centered, and generously inset below navigation. The border, tick rhythm, coordinate range, and perimeter whitespace closely match the source.
- Colors and visual tokens: source violet is intentionally normalized to navy, powder, white, ink, and one small signal-yellow moving point. No gradients or new accent colors were introduced.
- Image quality and asset fidelity: the field is native Canvas2D geometry sampled from a continuous two-node differential system, not a raster recreation. Curves, arrowheads, ticks, and particles remain resolution-independent and responsive.
- Copy and content: the graph uses only coordinate values. Controls use concise functional labels for the layers and parameters they change.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: the active global dither makes navy lines slightly more granular and lighter than the solid violet reference. This is an intentional system-level treatment and can be bypassed with the existing FX control.
- P3: moving navy/powder points and one signal-yellow point are intentional brand additions; they can be hidden independently without changing streamline geometry.

## Interaction and runtime checks

- The Controls trigger opens and closes the Vector Controls panel.
- Streamlines, direction arrows, axis lines, frame and ticks, scale labels, critical points, moving points, and motion are independently toggleable.
- Hide all disabled every visual layer while leaving motion state intact; Show all restored every visual layer.
- An individual Axis Lines toggle changed state correctly, and Reset restored axes off, critical points off, and density 22.
- Density, stroke, and speed ranges expose live values; Speed disables when Motion is off.
- Escape closes the panel, settings persist locally, and reduced-motion mode freezes the animated markers.
- Navigation remains usable at the 1080 px verification width because the page list now scrolls within its own track while Controls and FX stay visible.
- Browser console verification after the final production build returned no errors.

## Comparison history

- Iteration 1 — P1 route usability: the additional navigation item pushed Controls and FX out of the 1080 px viewport. Fix: changed the navigation grid to a bounded middle track with horizontal page scrolling. Post-fix evidence: both actions remain fully visible in `vector-implementation-final.jpg`.
- Iteration 1 — P2 streamline distribution: critical-point ring seeding over-concentrated lines between the nodes and left large areas empty. Fix: replaced it with deterministic occupancy-grid seeding and bidirectional integration. Post-fix evidence: the field now has even plot-wide coverage.
- Iteration 2 — P2 field silhouette: the symmetric polynomial field produced large vertical ovals unlike the reference's asymmetrical left lobe and right fan. Fix: retained the two nodes while weighting outer-left horizontal velocity and right-side divergence. Post-fix evidence: `vector-design-comparison.jpg` shows the broad curved left trajectories, central bridge, and radial right trajectories together.
- Iteration 3 — P2 reference hierarchy: visible axis lines and critical-point circles added structure absent from the source. Fix: kept both as user-toggleable layers but changed their defaults to hidden, then enlarged the functional arrowheads and primary streamline stroke.
- Final comparison: no actionable P0/P1/P2 issues remain at the normalized 1080 × 1080 comparison state.

## Implementation checklist

- [x] Add a responsive Vector route and navigation destination.
- [x] Render a continuous two-node flow field with streamline arrows and animated particles.
- [x] Add independent visibility toggles, show/hide-all actions, reset, density, stroke, and speed controls.
- [x] Preserve the shared palette, FX processor, cursor trail, reduced-motion behavior, and static GitHub Pages routing.
- [x] Verify build output, interaction states, visual fidelity, accessible control names, and clean browser logs.

final result: passed

---

# Global shader-layer design QA

## Evidence

- Primary source visual truth: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-b447647d-0baf-4c6f-908c-e0729a3a318a.png`
- Secondary source visual truth: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-65e47f99-6e7e-432d-a5b7-bf9cfcb13e35.png`
- Browser-rendered implementation: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/shader-implementation-517x768.jpg`
- Editable-controls state: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/shader-controls-844x900.jpg`
- Side-by-side comparison: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/shader-design-comparison.jpg`
- Route: `http://localhost:3000/drum` with shared checks on `/`, `/archive`, `/compass`, `/terrain`, `/map`, and `/radar`.
- Primary comparison viewport: 517 × 828 CSS px with the persistent 60 px navigation cropped from the implementation capture for a 517 × 768 content comparison.
- Primary source pixels: 517 × 768. Implementation pixels: 517 × 768. Device scale factor: 1. Density normalization: none required.
- Secondary source pixels: 844 × 1501. It was used as detail-level art direction for grain, ordered dither, cell breakup, and high-strength states rather than as a same-state layout target.
- State: default global navy halftone, overlay blend, 10 px cell, 72% strength, 94% edge, 0% grain, 67° angle, and 7% motion.

## Full-view comparison evidence

The primary source and implementation were opened together in one 1046 × 768 comparison image. The implementation retains the intended signal-processing character: repeated pixel cells, dense technical geometry, radial marks remaining legible through the texture, slight cell irregularity, and a full-viewport treatment rather than an effect isolated to one canvas. The source's black/green CRT polarity was intentionally translated to the project's established off-white/navy/signal palette so it can be used across the existing light visualization system.

## Focused-region comparison evidence

A separate crop was not needed for the primary comparison because the halftone cells and ring-edge interaction are individually visible at 1:1 size. The secondary reference was inspected at original resolution to confirm the need for adjustable grain, cell size, hardness, and dither modes; these parameters are exposed directly in the captured Signal Processor panel.

## Required fidelity surfaces

- Fonts and typography: the FX panel uses the existing Geist/Geist Mono hierarchy with compact uppercase technical labels and tabular parameter values. The shader canvas contains no baked text.
- Spacing and layout rhythm: the overlay begins exactly below the 60 px navigation, covers the visible visualization viewport, and does not change document dimensions. The 352 px desktop panel becomes a 288 px mobile panel with no horizontal overflow at 320 × 700.
- Colors and visual tokens: ink, navy, powder, off-white, white, and signal yellow are the only visible tokens. The dark neon reference was intentionally normalized to the existing brand palette; ink, navy, and signal shader colors remain user-selectable.
- Image quality and asset fidelity: the requested texture is a real GPU fragment shader, not a repeated raster or CSS approximation. It remains resolution-independent across p5.js, Three.js, and DOM-backed pages.
- Copy and content: all labels are functional parameter names. Modes, values, status, reset, and bypass states use concise instrument language.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: the default halftone is deliberately lighter than the references so trajectory geometry remains readable; users can reach the aggressive reference character by increasing Strength and Grain or switching to Scanline/Dither with signal ink.

## Interaction and runtime checks

- Shader enable/bypass immediately hid and restored the overlay and updated the FX status indicator.
- Halftone, Pixel, Scanline, and Dither pattern buttons changed the GPU program state.
- Cell size, Strength, Edge, Grain, Angle, and Motion ranges updated their outputs and rendered treatment.
- Ink, navy, and signal colors plus Multiply, Overlay, Screen, and Normal blend modes are selectable.
- Reset restored all default values; Shift + F opened the panel.
- Pixel mode with 14 px cells and 60% strength persisted after navigating from Drum to Map, then reset correctly.
- Opening FX closes Graph Controls and opening Graph Controls closes FX, preventing compact-screen panel collisions.
- The shared FX button and one overlay canvas were verified on all seven routes.
- Responsive checks passed at 320 × 700, 517 × 828, and 844 × 900 without horizontal overflow.
- Fresh browser logs after a clean reload contained no warnings or errors.

## Comparison history

- Iteration 1 — P1 parameter input: automated range interaction changed the native slider position without updating React state under `onChange`. Fix: ranges now listen to `onInput`, expose explicit accessible names, and update live. Post-fix evidence: Cell size changed 7 → 11, Strength 22 → 48, and Grain 10 → 24 with matching output and visible shader changes.
- Iteration 1 — P2 compact control collision: FX and Graph Controls could both be opened on the 320 px layout. Fix: the shared navigation now closes one panel before opening the other. Post-fix evidence: `fxAfterGraph: 0`, `graphOpen: 1` at 320 × 700.
- Final comparison: no actionable P0/P1/P2 issues remained in the 517 × 768 native-size comparison or the 320 px responsive check.

## Implementation checklist

- [x] Add one global WebGL layer below navigation and above all visualization types.
- [x] Add persistent enable, pattern, cell, strength, edge, grain, angle, motion, ink, and blend controls.
- [x] Preserve pointer interaction by keeping the shader canvas non-interactive.
- [x] Add FX access to every page and resolve compact control collisions.
- [x] Verify route persistence, accessibility names, responsive layouts, clean logs, and reference fidelity.

final result: passed

---

# Orbital Atlas design QA

## Evidence

- Source visual truth: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-20ef7dc4-db5c-4c17-b285-3256efc35419.png`
- Browser-rendered implementation: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/atlas-implementation-756x756.jpg`
- Side-by-side comparison: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/atlas-design-comparison.jpg`
- Route: `http://localhost:3000/atlas`
- Comparison size: source and implementation both 756 × 756 px at device scale factor 1; the persistent 60 px navigation was cropped from the implementation capture before comparison.
- State: global shader bypassed, idle rotation running, pointer at rest.

## Full-view comparison evidence

The source and implementation were combined into one 1512 × 756 comparison image. The implementation matches the source's primary spatial hierarchy: a centered outer sphere boundary, nested coordinate volumes, one strong crossing orbital band, dashed paths, vertical beacons, a small inner sphere, and a dense central plane. The source's black/white astronomy-chart polarity is intentionally translated to the established off-white, white, powder, navy, ink, and signal-yellow system.

## Focused-region comparison evidence

A separate focused crop was not required because the 756 px comparison keeps the inner sphere, beacons, cylinder lines, dashed paths, contour island, and outer boundary readable at native size. The central region was also inspected in browser captures before and after the increased camera elevation to verify that the island reads as raised contour terrain rather than a flat plane.

## Required fidelity surfaces

- Fonts and typography: the visualization itself contains no text, following the site's graph-only rule. Source star labels were treated as astronomical data decoration rather than required UI copy; shared navigation continues to use the existing Geist hierarchy.
- Spacing and layout rhythm: the sphere is centered with a quiet perimeter margin and no card, heading, legend, or explanatory copy. The 756 px reference composition and the 320 px compact layout both preserve the complete outer boundary.
- Colors and visual tokens: the dark source is normalized to the light brand system. Navy carries primary structures, powder carries secondary grids, white defines terrain, ink appears on the dotted orbit, and signal yellow marks only the active core and one beacon.
- Image quality and asset fidelity: the result is native Three.js geometry rather than a raster approximation. Lines, contour relief, beacons, sphere grids, and cylindrical coordinate cages remain resolution-independent.
- Copy and content: no visualization copy was added. The shared navigation adds the concise `Atlas` destination only.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: the source contains many astronomical labels, while Atlas intentionally omits them to preserve the project's text-free visualization rule and keep the rotating volume readable.

## Interaction and runtime checks

- Timed browser captures produced different image hashes after 1.2 seconds, confirming independent idle rotation.
- Pointer movement is wired to a smoothed, bounded instrument tilt; pointer exit returns the target to center.
- `prefers-reduced-motion` freezes all coordinate-frame motion at a representative state.
- The global FX layer remains available and was bypassed for the clean source comparison.
- Responsive checks passed at 756 × 816 and 320 × 700 without horizontal overflow.

## Comparison history

- Iteration 1 — P2 outer-volume density and clipping: the first pass used a dense sphere wire mesh and clipped the boundary at the default wide viewport. Fix: replaced the dense shell with a sparse latitude/longitude grid and fit the camera from both vertical and horizontal field dimensions.
- Iteration 2 — P2 island legibility: the low camera made the terrain core read as a nearly flat arrow-like plane. Fix: increased camera elevation, enlarged the island, added a restrained rim, and preserved navy contour bands over the white relief surface.
- Iteration 3 — P2 matched framing: at the native 756 px comparison the sphere margin was smaller than the source. Fix: increased the camera-fit multiplier and re-captured at exactly 756 × 756. The post-fix outer boundary, central hierarchy, and white-space ratio now align closely with the source.

## Implementation checklist

- [x] Add the Atlas route and shared navigation destination.
- [x] Build one outer sphere, three cylindrical grids, one inner sphere, dashed orbital paths, beacons, and a contour island in native Three.js.
- [x] Add independent idle rotation, inertial pointer tilt, responsive camera fitting, and reduced-motion behavior.
- [x] Preserve the shared brand tokens and global FX layer.
- [x] Verify source comparison, responsive layout, animation, accessible canvas labeling, and local build behavior.

final result: passed

---

# Pulse design QA

## Evidence

- Source visual truth: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-ee38d65e-50cf-4acf-ad43-79ee3f39eb77.png`
- Browser-rendered implementation: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/pulse-implementation-1080x1080.jpg`
- Side-by-side comparison: `/Users/haggylap/Library/CloudStorage/Dropbox/!Projects/Aircover/trajectory-lab/pulse-design-comparison.jpg`
- Route: `http://localhost:3000/pulse`
- Comparison size: source and implementation both 1080 × 1080 px at device scale factor 1.
- State: monthly period selected, shader bypassed, idle animation running.

## Fidelity review

- Layout: the 820 × 500 px instrument card, 170 px metric header, divider, rounded frame, and centered page placement closely match the source proportions.
- Data field: 52 responsive columns reproduce the source's split historical/current dot matrix without a raster dependency. Desktop baseline, peak height, and label offsets were tuned against the 1:1 comparison.
- Brand translation: source neutrals map to off-white, paper, powder, gray, and navy; a single signal-yellow point adds the project's active-state accent without changing the chart hierarchy.
- Type: compact Geist and Geist Mono labels preserve the reference's quiet technical rhythm. The added `Revenue Pulse` wording is an intentional route-specific name.
- Motion: values drift subtly, columns breathe at low amplitude, and the signal point scans in idle state. Pointer movement temporarily becomes the signal focus. Reduced-motion mode freezes the idle drift.

## Interaction and runtime checks

- Daily, Weekly, and Monthly tabs update values, labels, and dot profiles.
- Monthly remains the default state and exposes the correct selected semantics.
- The idle value and canvas pixels changed across timed captures, confirming the animation loop.
- The chart canvas exposes a descriptive accessible label.
- The global FX layer remains available on Pulse and can be bypassed for the clean reference state.
- Responsive checks passed at 1080 × 1140 and 320 × 700 without horizontal overflow.

## Comparison history

- Iteration 1 — P2 card geometry: the chart region was 22 px too short and the period selection used an underline absent from the source. Fix: expanded the chart to 328 px and changed selected state to text color only.
- Iteration 2 — P2 plot placement: the dot baseline sat roughly 40 px below the source at the reference size. Fix: increased desktop plot bottom padding to 88 px, increased the desktop row interval to 19 px, and lifted the labels independently.
- Final comparison: no actionable P0, P1, or P2 issues remain. The signal-yellow point and `Revenue Pulse` label are intentional brand adaptations.

## Implementation checklist

- [x] Add Pulse to shared navigation.
- [x] Build a responsive, native-canvas dot matrix with no raster assets.
- [x] Add idle animation, pointer response, period controls, and reduced-motion handling.
- [x] Preserve the shared shader layer and existing brand tokens.
- [x] Verify responsive layout, semantic controls, local route behavior, and visual fidelity.

final result: passed

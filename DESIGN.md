# Trajectory Field design language

Trajectory Field treats scientific graphics as the primary interface. Navigation and controls stay quiet so trajectories, ticks, vectors, and instrument motion carry the visual identity.

## Principles

1. **The plot is the product.** Give every visualization a large, isolated field. Avoid descriptive copy inside a plot unless the information is itself instrument data.
2. **Functional marks only.** Every line must be a trajectory, axis, grid, scale, vector, reticle, tick, or boundary. Decorative marks should still read as measurement.
3. **Calm surface, active signal.** White and light-gray grounds hold most of the visual area. Motion and the signal color are used sparingly.
4. **Physical motion.** Animation should suggest gravity, momentum, drag, aircraft vibration, or sensor smoothing. Avoid arbitrary easing and ornamental loops.
5. **No false precision.** Values may drift organically, but their formatting, units, tick spacing, and relationships must remain internally consistent.

## Palette

The palette was sampled from the supplied reference. Its original proportional weighting remains the guide for overall compositions.

| Token | Value | Reference weight | Use |
| --- | --- | ---: | --- |
| Ink | `#000000` | 9.03% | Primary trajectories, high-contrast marks |
| Navy | `#305579` | 4.85% | Axes, telemetry, structural lines |
| Powder | `#bcd4e4` | 19.53% | Secondary guides, quiet rings, minor vectors |
| Gray | `#e4e4e4` | 9.71% | Alternate plot surface, grids on white |
| Off-white | `#f5f5f5` | 9.71% | Page ground and space between instruments |
| White | `#ffffff` | 41.65% | Primary plot surface and grid lines on gray |
| Signal | `#e1fe0e` | 4.74% | Active point, heading bug, selected state |

Signal yellow is the only accent. Do not expand it into large backgrounds, gradients, glows, or body text. Navy is the default UI color outside the plots.

## Surfaces and spacing

- Page ground: off-white.
- Visualization grounds: alternate white and gray by default; users may normalize all plots to either surface.
- Full-width visualization inset: 28 px desktop, 16 px mobile.
- Vertical separation: 48 px desktop, 28 px mobile.
- Plot radius: 18 px maximum. Use a 1 px navy border at low opacity.
- Controls may float because they change the entire system. Graphs themselves should not use elevation or card shadows.

## Plot construction

### Grid

- Minor grid: 1 px gray on white, 1 px white on gray.
- Default horizontal/vertical density: 6 divisions.
- Grid density is adjustable from 3–12 divisions.
- Grids may be hidden without changing trajectory geometry.

### Axes and scales

- Axis stroke: 1.25 px navy.
- Arrowheads are small filled triangles and may be toggled independently from axis lines.
- Circular instruments use 2° minor ticks, 10° medium ticks, and 30° major ticks.
- Cardinal directions take priority over numeric headings.

### Data marks

- Default trajectory stroke: 1.35–2.5 px before the global stroke multiplier.
- Dotted paths use short, evenly spaced dashes; never simulate dots with text glyphs.
- Moving points combine a solid core with a low-opacity outer disk. Do not use blur or outer glow.
- Use ink and navy for most series. Signal yellow identifies the current, selected, or commanded state.

## Typography

- Interface: Geist.
- Measurements and instrument telemetry: Geist Mono or a system monospace fallback.
- Navigation: 9–11 px, uppercase, semibold, expanded tracking.
- Instrument labels: 9–11 px uppercase.
- Instrument values: 24–38 px depending on viewport.
- Keep graph canvases free of headings and explanatory prose.

## Motion

- Trajectories follow their underlying equations; markers move along sampled paths.
- Default motion speed is 1× and user-adjustable from 0.25× to 2.5×.
- Aircraft heading changes slowly with layered periodic drift and low-frequency noise.
- Bank should remain within roughly ±8° and pitch within roughly ±5° for normal flight.
- Airframe vibration is sub-pixel and applies to the instrument, not the surrounding navigation.
- Terrain instruments use a deliberate scan cadence: rotate for 2.6 seconds, hold for 0.5 seconds, reverse for 2.3 seconds, then hold for 1 second before repeating.
- A terrain sphere may change yaw, pitch, and bank together, but it must never resemble a continuously spinning globe.
- Respect `prefers-reduced-motion` by freezing at a representative state.

### Pointer trail

- Every route shares one short pointer trail: a true 1 px neutral medium-gray line rendered above visualization and shader canvases but below navigation and controls.
- Raw mouse movement passes through three stages of inertial smoothing, then through a spline, so hand jitter disappears and direction changes remain curved.
- The supplied aircraft silhouette replaces the native fine-pointer cursor. It sits at the smoothed trail head and turns toward filtered directional velocity using shortest-path rotation, avoiding snaps at heading wraparound.
- Interactive controls swap the pointer to the supplied simplified aircraft hover silhouette without changing its heading or anchor point.
- The tail fades quickly and never intercepts input. It is disabled for coarse pointers and reduced-motion preferences.

## Three-dimensional instruments

- Use Three.js only when spatial depth communicates data that a flat canvas cannot.
- Terrain is a white displaced surface with navy contour bands, powder construction lines, and low-gloss lighting.
- The reticle is a fixed interface layer. Its circles, axes, ticks, and signal-yellow center do not rotate with the terrain.
- Keep the camera orthogonal in spirit: centered, stable, and free of cinematic orbiting or perspective tricks.
- Lighting may reveal relief, but shadows, gradients, atmospheric effects, bloom, and outer glow are excluded.
- Corners may carry compact instrument telemetry. It must remain secondary to the central graphic.

## Route-map instruments

- Treat the map as a circular terrain slice, not a flat geographic tile or a globe.
- Elevation uses the same white surface and navy contour system as the terrain instrument.
- Routes follow the relief and use short mechanical dashes, with signal yellow reserved for active stations and bearings.
- POI beacons use thin vertical stems and small geometric markers in white, powder, navy, or signal yellow.
- Compass ticks remain fixed around the terrain while the map may drift a few degrees beneath them.
- Pointer response is subtle and inertial. It reveals depth without turning the instrument into an orbit control.
- Wheel and trackpad scrolling zoom the route map camera smoothly from 0.78× to 2.8×. Zoom must preserve the fixed compass relationship and must not scale or distort terrain geometry.

## Mechanical radar instruments

- Use a sparse orthographic layout: one dominant bearing arc, one central rotor, a fixed sightline, and distributed track boxes.
- The radial dial may spin continuously when continuous motion represents active acquisition; keep the fixed sightline independent from the rotor.
- Target boxes flash asynchronously in short mechanical bursts. Avoid synchronized blinking and long illuminated states.
- Micro-animation may include a traveling scan point, stepped meter bars, sub-pixel chassis vibration, and slowly changing telemetry.
- Signal yellow is limited to the current sweep, active rotor tip, and momentarily acquired tracks.
- Lines use square caps and hard joints to preserve a machined rather than illustrative character.

## Air traffic control fields

- Traffic is a full-width, high-density airspace rather than a card or conventional map. Sector polygons, coastline abstractions, range rings, route corridors, named fixes, and live tracks form one continuous instrument.
- Chaos comes from genuine information overlap: crossing flight plans, asynchronous handoffs, leader lines, compact altitude/speed tags, and many small navigation fixes. Preserve hierarchy so the underlying sectors remain quiet and aircraft remain readable.
- Aircraft move continuously along cubic flight paths at display-synchronized 60 fps. Never quantize positions to route samples or discrete map cells.
- Most tracks use navy or ink. Powder and gray describe controlled volumes and published corridors. Signal yellow identifies exactly one current acquisition or terminal origin.
- Pointer proximity temporarily acquires the nearest aircraft without stopping or redirecting its flight path. Reduced-motion mode freezes the complete airspace at a representative operational state.

## Terminal airspace charts

- Airspace uses the system's white instrument surface. Ink and navy carry aircraft, fixes, runways, and primary compass geometry while powder and gray define quiet sectors and flight corridors.
- The visualization occupies the entire field beneath navigation. Search, settings, information cards, map buttons, legends, and callouts do not sit over the chart.
- Direct manipulation replaces map chrome. Wheel or trackpad movement zooms around the pointer, dragging pans the chart, and plus/minus keys provide an accessible zoom equivalent.
- Aircraft remain live at display-synchronized frame rates. One signal-yellow acquisition may identify the active track; every other route and navaid stays within the neutral brand palette.

## Plotting-board modules

- Plotter modules translate the physical navigation plotting board into code: four-sided heading rulers, dense perimeter ticks, an orthogonal lattice, central registration axes, range rings, and calibrated bearing marks.
- The master board occupies one complete viewport beneath navigation. Supporting range, bearing, intercept, and sector modules use an asymmetric multi-column field with generous separation and no explanatory card copy.
- White and off-white carry the modules. Ink defines primary calibration; navy sets structural lines; powder and gray provide secondary measurement; one signal-yellow index identifies the live bearing.
- Perimeter scales remain fixed while a bearing line and index advance smoothly. Reduced-motion mode freezes every module at a representative calibrated state.

## Radial drum instruments

- Build the drum as a shallow physical cylinder with its measurement face angled toward the camera. The edge thickness must stay visible so the dial reads as an object, not a flat chart.
- Use concentric navy and ink bands, 2° minor ticks, 10° medium ticks, and 30° major ticks. Numeric scales follow the circumference in tabular monospace.
- Give the outer scale and inner index band slightly different rotational rates. Independent mechanical motion is preferred over decorative parallax.
- Pointer position may shift pitch and yaw within a restrained range. Dragging adds rotational momentum that decays naturally; keyboard arrows provide an equivalent nudge.
- Wheel and trackpad scrolling zoom the drum camera smoothly from 0.72× to 2.45×. Plus and minus keys provide an accessible equivalent without changing the instrument rotation.
- White and off-white carry almost the entire field. Powder may describe depth and signal yellow marks one active index only.

## Global signal-processing layer

- A single viewport-level WebGL post-processing pass samples the active visualization canvas and renders its transformed pixels in place. It starts below the 60 px navigation, never intercepts pointer input, and must not alter graph geometry or layout.
- The shader must derive every mark from the source canvas. It may not draw a disconnected decorative pattern over the page. Halftone density follows source luminance, pixel mode resamples source cells, scanlines modulate source pixels, and ordered dither thresholds the source image.
- Supported treatments are halftone, pixel matrix, scanline, and ordered dither. Each is a GLSL ES 3.00 / WebGL2 fragment-shader transformation using integer texel fetches, derivative-aware edges, color quantization, and an 8 × 8 Bayer threshold matrix, so the treatment responds to live p5.js, Three.js, and canvas-backed instrument frames.
- Default treatment is a high-definition navy halftone in overlay mode: 10 px cells, 72% strength, 94% edge hardness, 0% grain, 67° angle, and 7% motion. Ink is the neutral option; signal yellow is available for deliberate CRT/radar states but should not be the default.
- Editable parameters: enable/bypass, pattern, cell size, strength, edge hardness, grain, angle, motion, ink color, and blend mode. Preferences persist locally across routes.
- The overlay respects reduced-motion preferences by freezing time-based jitter while preserving the selected static texture.
- Shader controls live in the shared navigation under `FX`. The panel is compact, technical, and keyboard accessible. Opening `FX` closes graph-specific controls and vice versa so the two dense menus never obscure one another on compact screens.

## Pulse dot-matrix instruments

- Pulse presents discrete activity as columns of evenly spaced circular cells. The inactive history uses muted gray, current activity uses navy, and one signal-yellow cell marks the live reading.
- Dot columns breathe and morph slowly in idle state. Motion should feel like incoming samples smoothing toward a new measurement rather than an equalizer reacting to music.
- Daily, Weekly, and Monthly states are real controls. Switching periods changes the value, comparison labels, and the underlying dot distribution without changing the card frame.
- Keep the card isolated on the off-white field with a white surface, a quiet 1 px border, one horizontal divider, and no shadow. The visualization stays the dominant region.
- Numeric values use large, light-weight Geist with compact percentage units. Period controls use small uppercase labels with no pills or filled backgrounds.

## Orbital atlas instruments

- Atlas uses nested coordinate volumes: one quiet outer sphere, multiple cylindrical grid cages, a smaller inner sphere, and a central terrain island. Each layer must remain individually legible through opacity and scale rather than glow or color proliferation.
- Cylindrical cages rotate on independent axes at restrained mechanical rates. Motion communicates changing coordinate frames; the outer shell and camera remain stable enough to preserve orientation.
- The terrain island uses the shared white surface, navy contour, and powder construction-line system. It occupies the core without hiding the smaller sphere or the major orbital bands.
- Dashed great-circle paths and vertical beacons echo the supplied astronomical reference. One signal-yellow core or beacon marks the active origin; all other structures remain navy, powder, white, or ink.
- Pointer input adds a shallow inertial tilt to the full instrument. It must never become unrestricted orbit control or move the sphere outside the viewport.

## Navigation and controls

- Sticky 60 px navigation ordered as Trajectory, Compass, Terrain, Map, Traffic, Airspace, Plotter, Radar, Drum, Pulse, Atlas, Blank, and Archive. Archive always remains the final destination.
- Blank is a true empty white canvas that retains only the shared navigation, cursor, and FX system.
- Active destination uses a thin navy underline.
- Graph controls live in one compact floating panel and persist between graph pages.
- Supported controls: background grid, axis lines, axis arrows, moving points, motion, speed, stroke, grid density, and plot background.
- Buttons use short labels, clear focus states, and a 1 px downward active response.

## Responsive behavior

- Desktop graph pages: one full-width visualization per row.
- Mobile graph pages: the same single-column order with tighter outer spacing.
- Compass: center the rose, reduce telemetry size, and preserve all four edge readouts.
- Terrain: keep the sphere and fixed reticle centered, with telemetry anchored to the viewport corners.
- Map: preserve the full compass ring and every POI beacon at all supported widths.
- Radar: preserve the bearing arc, rotor, track boxes, and bottom telemetry as one square instrument field.
- Drum: preserve the full vertical scale, shallow cylinder edge, and at least one active pointer; controlled horizontal cropping is acceptable when it strengthens the close mechanical view.
- Atlas: preserve the outer sphere boundary, all three cylinder cages, the inner sphere, and the island as one centered coordinate volume.
- Never horizontally scroll the instrument or clip the heading bug.

## Do / do not

### Do

- Preserve measured spacing and mathematical relationships.
- Use white space as a functional separator.
- Keep UI chrome visually quieter than plotted data.
- Let one signal-yellow mark carry the active state.

### Do not

- Add gradients, neon glows, glass effects, textures, or illustrative backgrounds.
- Introduce colors outside the palette.
- Put legends or palette strips beneath every visualization.
- Animate layout dimensions or use motion unrelated to the represented system.
- Label a plot when its construction is already self-explanatory.

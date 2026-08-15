"use client";

import { useEffect, useRef, useState } from "react";
import type P5 from "p5";
import { SiteNavigation } from "./site-navigation";

type Collection = "featured" | "archive";
type PanelTone = "gray" | "white";
type Rect = { x: number; y: number; w: number; h: number; tone?: PanelTone };
type Point = { x: number; y: number; vx?: number; vy?: number };
type Settings = {
  grid: boolean;
  axisLines: boolean;
  axisArrows: boolean;
  particles: boolean;
  motion: boolean;
  speed: number;
  stroke: number;
  gridDensity: number;
  background: "alternating" | "white" | "gray";
};

const TAU = Math.PI * 2;
const DEFAULT_SETTINGS: Settings = {
  grid: true,
  axisLines: true,
  axisArrows: true,
  particles: true,
  motion: true,
  speed: 1,
  stroke: 1,
  gridDensity: 6,
  background: "alternating",
};

export function TrajectoryField({ collection }: { collection: Collection }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("trajectory-field-controls");
    if (!saved) return;
    try {
      const restored = { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<Settings>) };
      queueMicrotask(() => setSettings(restored));
    } catch {
      window.localStorage.removeItem("trajectory-field-controls");
    }
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    window.localStorage.setItem("trajectory-field-controls", JSON.stringify(settings));
  }, [settings]);

  const setSetting = <Key extends keyof Settings>(key: Key, value: Settings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let instance: P5 | undefined;
    let active = true;

    void import("p5").then(({ default: P5Constructor }) => {
      if (!active || !hostRef.current) return;

      instance = new P5Constructor((p: P5) => {
        const black = "#000000";
        const navy = "#305579";
        const powder = "#bcd4e4";
        const gray = "#e4e4e4";
        const offWhite = "#f5f5f5";
        const white = "#ffffff";
        const signal = "#e1fe0e";
        const colors = [navy, black, navy, black, navy, signal];

        let phase = 0;
        let impact = { x: -100, y: -100, born: -10 };
        let reducedMotion = false;

        const targetHeight = () => {
          const width = window.innerWidth;
          const mobile = width < 760;
          const edge = mobile ? 16 : 28;
          const gap = mobile ? 28 : 48;
          const panelWidth = width - edge * 2;
          const panelHeight = Math.max(
            mobile ? 390 : 500,
            Math.min(mobile ? 620 : 760, panelWidth * (mobile ? 1.05 : 0.54)),
          );
          return Math.ceil(edge * 2 + panelHeight * 3 + gap * 2);
        };

        const panels = (): Rect[] => {
          const mobile = p.width < 760;
          const edge = mobile ? 16 : 28;
          const gap = mobile ? 28 : 48;
          const w = p.width - edge * 2;
          const h = (p.height - edge * 2 - gap * 2) / 3;
          const requestedBackground = settingsRef.current.background;

          return Array.from({ length: 3 }, (_, i) => ({
            x: edge,
            y: edge + i * (h + gap),
            w,
            h,
            tone: requestedBackground === "alternating"
              ? (i % 2 === 0 ? "white" : "gray")
              : requestedBackground,
          }));
        };

        const roundedClip = (rect: Rect, callback: () => void) => {
          const ctx = p.drawingContext as CanvasRenderingContext2D;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.min(18, rect.w * 0.05));
          ctx.clip();
          callback();
          ctx.restore();
        };

        const panelBase = (rect: Rect) => {
          const toneColors: Record<PanelTone, string> = {
            gray,
            white,
          };
          p.stroke(navy + "1f");
          p.strokeWeight(1);
          p.fill(toneColors[rect.tone ?? "white"]);
          p.rect(rect.x, rect.y, rect.w, rect.h, Math.min(18, rect.w * 0.05));
          p.noStroke();
        };

        const chart = (rect: Rect, xInset = 0.085, topInset = 0.12) => ({
          x: rect.x + rect.w * xInset,
          y: rect.y + rect.h * topInset,
          w: rect.w * (1 - xInset - 0.055),
          h: rect.h * (1 - topInset - 0.14),
        });

        const graphFrame = (rect: Rect) => {
          const c = chart(rect);
          const current = settingsRef.current;
          p.push();
          if (current.grid) {
            const gridCount = Math.max(2, Math.round(current.gridDensity));
            p.stroke(rect.tone === "gray" ? white : gray);
            p.strokeWeight(1);
            for (let i = 1; i <= gridCount; i += 1) {
              const x = c.x + (c.w * i) / gridCount;
              p.line(x, c.y, x, c.y + c.h);
            }
            for (let i = 1; i <= Math.max(3, Math.round(gridCount * 0.6)); i += 1) {
              const y = c.y + (c.h * i) / Math.max(3, Math.round(gridCount * 0.6));
              p.line(c.x, y, c.x + c.w, y);
            }
          }

          if (current.axisLines) {
            p.stroke(navy);
            p.strokeWeight(1.25);
            p.line(c.x, c.y, c.x, c.y + c.h);
            p.line(c.x, c.y + c.h, c.x + c.w, c.y + c.h);
          }

          if (current.axisArrows) {
            p.noStroke();
            p.fill(navy);
            p.triangle(c.x + c.w, c.y + c.h, c.x + c.w - 7, c.y + c.h - 3.5, c.x + c.w - 7, c.y + c.h + 3.5);
            p.triangle(c.x, c.y, c.x - 3.5, c.y + 7, c.x + 3.5, c.y + 7);
          }
          p.pop();
          return c;
        };

        const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, weight = 1.5) => {
          const a = Math.atan2(y2 - y1, x2 - x1);
          const size = 5 + weight;
          p.push();
          p.stroke(color);
          p.fill(color);
          p.strokeWeight(weight);
          p.line(x1, y1, x2, y2);
          p.noStroke();
          p.triangle(
            x2,
            y2,
            x2 - Math.cos(a - 0.45) * size,
            y2 - Math.sin(a - 0.45) * size,
            x2 - Math.cos(a + 0.45) * size,
            y2 - Math.sin(a + 0.45) * size,
          );
          p.pop();
        };

        const projectile = (angleDeg: number, speed = 18, gravity = 9.8, samples = 100): Point[] => {
          const angle = (angleDeg * Math.PI) / 180;
          const total = (2 * speed * Math.sin(angle)) / gravity;
          return Array.from({ length: samples + 1 }, (_, i) => {
            const t = (total * i) / samples;
            return {
              x: speed * Math.cos(angle) * t,
              y: speed * Math.sin(angle) * t - 0.5 * gravity * t * t,
              vx: speed * Math.cos(angle),
              vy: speed * Math.sin(angle) - gravity * t,
            };
          });
        };

        const draggedProjectile = (drag: number, quadratic = false): Point[] => {
          const dt = 0.018;
          const gravity = 9.8;
          const angle = Math.PI * 0.38;
          let x = 0;
          let y = 0;
          let vx = 18 * Math.cos(angle);
          let vy = 18 * Math.sin(angle);
          const points: Point[] = [{ x, y }];
          for (let i = 0; i < 430; i += 1) {
            const speed = Math.hypot(vx, vy);
            const factor = quadratic ? drag * speed : drag;
            vx += -factor * vx * dt;
            vy += (-gravity - factor * vy) * dt;
            x += vx * dt;
            y += vy * dt;
            if (y < 0 && i > 4) break;
            points.push({ x, y, vx, vy });
          }
          return points;
        };

        const mapped = (points: Point[], c: Rect, maxX?: number, maxY?: number) => {
          const xMax = maxX ?? Math.max(...points.map((point) => point.x));
          const yMax = maxY ?? Math.max(...points.map((point) => point.y));
          return points.map((point) => ({
            ...point,
            x: c.x + (point.x / Math.max(0.001, xMax)) * c.w,
            y: c.y + c.h - (point.y / Math.max(0.001, yMax)) * c.h * 0.88,
          }));
        };

        const samplePoint = (points: Point[], progress: number) => {
          const bounded = p.constrain(progress, 0, 1);
          const exactIndex = bounded * (points.length - 1);
          const lowerIndex = Math.floor(exactIndex);
          const upperIndex = Math.min(points.length - 1, lowerIndex + 1);
          const mix = exactIndex - lowerIndex;
          const lower = points[lowerIndex];
          const upper = points[upperIndex];

          return {
            x: p.lerp(lower.x, upper.x, mix),
            y: p.lerp(lower.y, upper.y, mix),
          };
        };

        const linePath = (points: Point[], color: string, weight = 2, dotted = false, maxProgress = 1) => {
          p.push();
          p.noFill();
          p.stroke(color);
          p.strokeWeight(weight * settingsRef.current.stroke);
          const ctx = p.drawingContext as CanvasRenderingContext2D;
          if (dotted) ctx.setLineDash([4, 7]);
          p.beginShape();
          const exactEnd = p.constrain(maxProgress, 0, 1) * (points.length - 1);
          const wholeEnd = Math.floor(exactEnd);
          for (let i = 0; i <= wholeEnd; i += 1) p.vertex(points[i].x, points[i].y);
          if (wholeEnd < points.length - 1) {
            const endpoint = samplePoint(points, maxProgress);
            p.vertex(endpoint.x, endpoint.y);
          }
          p.endShape();
          ctx.setLineDash([]);
          p.pop();
        };

        const movingNode = (points: Point[], progress: number, color: string, radius = 7) => {
          if (!settingsRef.current.particles) return;
          const point = samplePoint(points, progress);
          p.push();
          p.noStroke();
          p.fill(p.color(color + "2f"));
          p.circle(point.x, point.y, radius * 2.7);
          p.fill(color);
          p.circle(point.x, point.y, radius);
          p.pop();
        };

        const drawFan = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect);
            const pointer = p.constrain((p.mouseX - rect.x) / rect.w, 0, 1);
            const angles = [12, 23, 34, 45, 56, 67, 78];
            const paths = angles.map((angle) => projectile(angle + (pointer - 0.5) * 4, 18, 9.8));
            const maxX = Math.max(...paths.flat().map((point) => point.x));
            const maxY = Math.max(...paths.flat().map((point) => point.y));
            paths.forEach((path, i) => {
              const pts = mapped(path, c, maxX, maxY);
              linePath(pts, colors[i % colors.length], i === 3 ? 2.5 : 1.35, i % 2 === 0);
              movingNode(pts, (t * 0.12 + i * 0.125) % 1, colors[i % colors.length], i === 3 ? 8 : 5);
            });
          });
        };

        const drawDrag = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect);
            const paths = [draggedProjectile(0), draggedProjectile(0.045), draggedProjectile(0.012, true)];
            const maxX = Math.max(...paths[0].map((point) => point.x));
            const maxY = Math.max(...paths[0].map((point) => point.y));
            const palette = [black, navy, signal];
            paths.forEach((path, i) => {
              const pts = mapped(path, c, maxX, maxY);
              linePath(pts, palette[i], 2.2 - i * 0.2);
              movingNode(pts, (t * (0.12 + i * 0.015) + i * 0.13) % 1, palette[i], 6);
            });
          });
        };

        const drawEqualRange = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect);
            const paths = [projectile(28), projectile(62)];
            const maxX = Math.max(...paths.flat().map((point) => point.x));
            const maxY = Math.max(...paths.flat().map((point) => point.y));
            paths.forEach((path, i) => {
              const pts = mapped(path, c, maxX, maxY);
              linePath(pts, i === 0 ? black : navy, 2.2, false);
              const apex = pts.reduce((best, point) => (point.y < best.y ? point : best), pts[0]);
              p.push();
              p.stroke(i === 0 ? offWhite : powder);
              p.strokeWeight(1);
              (p.drawingContext as CanvasRenderingContext2D).setLineDash([3, 5]);
              p.line(apex.x, apex.y, apex.x, c.y + c.h);
              (p.drawingContext as CanvasRenderingContext2D).setLineDash([]);
              p.pop();
              movingNode(pts, (t * 0.16 + i * 0.28) % 1, i === 0 ? black : navy, 6);
            });
          });
        };

        const drawTimeBeads = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect);
            const pts = mapped(projectile(52, 18), c);
            linePath(pts, navy, 1, true);

            const progress = (t * 0.17) % 1;
            if (settingsRef.current.particles) {
              for (let i = 0; i < 12; i += 1) {
                const beadProgress = i / 11;
                const point = pts[Math.floor(beadProgress * (pts.length - 1))];
                const pulse = 0.5 + 0.5 * Math.sin(t * 4.2 - beadProgress * TAU * 1.6);
                p.noStroke();
                p.fill(p.color(powder + Math.round(30 + pulse * 80).toString(16).padStart(2, "0")));
                p.circle(point.x, point.y, 4 + pulse * 7);
                p.fill(navy);
                p.circle(point.x, point.y, 3.2);
              }

              const exactIndex = progress * (pts.length - 1);
              const head = samplePoint(pts, progress);
              p.push();
              p.stroke(navy);
              p.strokeWeight(2.5 * settingsRef.current.stroke);
              for (let j = 1; j < 8; j += 1) {
                const previous = samplePoint(
                  pts,
                  Math.max(0, exactIndex - j) / (pts.length - 1),
                );
                p.strokeWeight((3 - j * 0.3) * settingsRef.current.stroke);
                p.line(previous.x, previous.y, head.x, head.y);
              }
              p.pop();
            }
            movingNode(pts, progress, signal, 8);
          });
        };

        const drawVectors = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect);
            const source = projectile(49, 18);
            const pts = mapped(source, c);
            linePath(pts, navy, 1.25, true);
            const wobble = 0.86 + 0.14 * Math.sin(t * 1.8);

            for (let i = 0; i < 7; i += 1) {
              const progress = 0.04 + i * 0.153;
              const index = Math.floor(progress * (pts.length - 1));
              const point = pts[index];
              const velocity = source[index];
              const vx = Math.min(rect.w * 0.095, Math.abs(velocity.vx ?? 0) * 1.15) * wobble;
              const vy = -(velocity.vy ?? 0) * 1.1 * wobble;
              p.noStroke();
              p.fill(black);
              p.circle(point.x, point.y, 4);
              arrow(point.x, point.y, point.x + vx, point.y, navy, 1.1);
              arrow(point.x + vx, point.y, point.x + vx, point.y + vy, black, 1.1);
              arrow(point.x, point.y, point.x + vx, point.y + vy, signal, 1.8);
            }
          });
        };

        const drawGravity = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect);
            const gravities = [5.1, 6.7, 8.2, 9.8, 12.2, 15.5];
            const paths = gravities.map((gravity) => projectile(42, 18, gravity));
            const maxX = Math.max(...paths.flat().map((point) => point.x));
            const maxY = Math.max(...paths.flat().map((point) => point.y));
            paths.forEach((path, i) => {
              const pts = mapped(path, c, maxX, maxY);
              const active = ((t * 0.09 + phase) % 1) * 1.12;
              linePath(pts, colors[(i + 2) % colors.length], 1.3, i % 2 === 1);
              linePath(pts, colors[(i + 2) % colors.length], 3, false, p.constrain(active - i * 0.055, 0.02, 1));
              movingNode(pts, (t * (0.09 + i * 0.008) + i * 0.1) % 1, colors[(i + 2) % colors.length], 5.5);
            });

            const age = t - impact.born;
            if (age >= 0 && age < 1.3 && impact.x > rect.x && impact.x < rect.x + rect.w) {
              p.push();
              p.noFill();
              p.stroke(signal);
              p.strokeWeight(1.5);
              p.circle(impact.x, impact.y, age * 70);
              p.pop();
            }
          });
        };

        p.setup = () => {
          const canvas = p.createCanvas(window.innerWidth, targetHeight());
          canvas.parent(hostRef.current!);
          canvas.elt.setAttribute("role", "img");
          canvas.elt.setAttribute(
            "aria-label",
            "Six animated projectile trajectory graphs responding to pointer movement",
          );
          p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
          p.frameRate(60);
          p.strokeCap(p.ROUND);
          p.strokeJoin(p.ROUND);
          reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        };

        p.draw = () => {
          const current = settingsRef.current;
          const t = reducedMotion || !current.motion
            ? 1.4
            : (p.millis() / 1000) * current.speed;
          p.background(offWhite);
          const [a, b, c] = panels();
          if (collection === "featured") {
            drawFan(a, t);
            drawDrag(b, t);
            drawGravity(c, t);
          } else {
            drawEqualRange(a, t);
            drawTimeBeads(b, t);
            drawVectors(c, t);
          }

          const age = t - impact.born;
          if (age >= 0 && age < 0.8) {
            p.push();
            p.noFill();
            p.stroke(powder + "99");
            p.strokeWeight(1);
            p.circle(impact.x, impact.y, age * 42);
            p.pop();
          }
        };

        p.mousePressed = () => {
          phase = (phase + 0.173) % 1;
          impact = { x: p.mouseX, y: p.mouseY, born: p.millis() / 1000 };
        };

        p.touchStarted = () => {
          if (p.touches.length > 0) {
            phase = (phase + 0.173) % 1;
            impact = { x: p.mouseX, y: p.mouseY, born: p.millis() / 1000 };
          }
        };

        p.windowResized = () => {
          p.resizeCanvas(window.innerWidth, targetHeight());
        };
      }, hostRef.current);
    });

    return () => {
      active = false;
      instance?.remove();
    };
  }, [collection]);

  return (
    <div className="trajectory-shell">
      <SiteNavigation
        active={collection === "featured" ? "live" : "archive"}
        controlsOpen={controlsOpen}
        onControls={() => setControlsOpen((open) => !open)}
      />

      <aside
        id="graph-controls"
        className={`control-panel${controlsOpen ? " is-open" : ""}`}
        aria-hidden={!controlsOpen}
        hidden={!controlsOpen}
      >
        <div className="control-panel__head">
          <span>Graph controls</span>
          <button type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>
            Reset
          </button>
        </div>

        <div className="control-section">
          <ToggleRow
            label="Background grid"
            checked={settings.grid}
            onChange={(checked) => setSetting("grid", checked)}
          />
          <ToggleRow
            label="Axis lines"
            checked={settings.axisLines}
            onChange={(checked) => setSetting("axisLines", checked)}
          />
          <ToggleRow
            label="Axis arrows"
            checked={settings.axisArrows}
            onChange={(checked) => setSetting("axisArrows", checked)}
          />
          <ToggleRow
            label="Moving points"
            checked={settings.particles}
            onChange={(checked) => setSetting("particles", checked)}
          />
          <ToggleRow
            label="Motion"
            checked={settings.motion}
            onChange={(checked) => setSetting("motion", checked)}
          />
        </div>

        <div className="control-section control-section--ranges">
          <RangeRow
            label="Speed"
            value={settings.speed}
            min={0.25}
            max={2.5}
            step={0.05}
            display={`${settings.speed.toFixed(2)}×`}
            onChange={(value) => setSetting("speed", value)}
          />
          <RangeRow
            label="Stroke"
            value={settings.stroke}
            min={0.5}
            max={2.5}
            step={0.05}
            display={`${settings.stroke.toFixed(2)}×`}
            onChange={(value) => setSetting("stroke", value)}
          />
          <RangeRow
            label="Grid density"
            value={settings.gridDensity}
            min={3}
            max={12}
            step={1}
            display={String(settings.gridDensity)}
            disabled={!settings.grid}
            onChange={(value) => setSetting("gridDensity", value)}
          />
        </div>

        <fieldset className="background-control">
          <legend>Background</legend>
          <div>
            {(["alternating", "white", "gray"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={settings.background === value ? "is-selected" : ""}
                onClick={() => setSetting("background", value)}
              >
                {value === "alternating" ? "Mix" : value === "white" ? "White" : "Gray"}
              </button>
            ))}
          </div>
        </fieldset>
      </aside>

      <div ref={hostRef} className="trajectory-field" />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`range-row${disabled ? " is-disabled" : ""}`}>
      <span><span>{label}</span><output>{display}</output></span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

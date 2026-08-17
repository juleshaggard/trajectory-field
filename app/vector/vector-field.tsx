"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNavigation } from "../site-navigation";

type Point = { x: number; y: number };
type Settings = {
  streamlines: boolean;
  arrows: boolean;
  axes: boolean;
  frame: boolean;
  labels: boolean;
  criticalPoints: boolean;
  particles: boolean;
  motion: boolean;
  density: number;
  stroke: number;
  speed: number;
};

const TAU = Math.PI * 2;
const DOMAIN = 4.35;
const STORAGE_KEY = "trajectory-vector-controls-v1";
const COLORS = {
  ink: "#000000",
  navy: "#305579",
  powder: "#bcd4e4",
  white: "#ffffff",
  signal: "#e1fe0e",
};
const DEFAULT_SETTINGS: Settings = {
  streamlines: true,
  arrows: true,
  axes: false,
  frame: true,
  labels: true,
  criticalPoints: false,
  particles: true,
  motion: true,
  density: 22,
  stroke: 1,
  speed: 1,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function fieldVector(x: number, y: number) {
  if (x < -1) {
    return {
      x: -(x + 1) * (1 + 0.045 * y * y * y * y),
      y: (-2 * y) / (1 + 0.12 * (x + 1) * (x + 1)),
    };
  }
  if (x > 1) {
    return {
      x: (x - 1) * (1 + 0.08 * y * y),
      y: 2 * y * (1 + 0.02 * (x - 1) * (x - 1)),
    };
  }
  return {
    x: x * x - 1,
    y: 2 * x * y,
  };
}

function occupancyIndex(point: Point, gridSize: number) {
  if (Math.abs(point.x) > DOMAIN || Math.abs(point.y) > DOMAIN) return -1;
  const column = clamp(Math.floor(((point.x + DOMAIN) / (DOMAIN * 2)) * gridSize), 0, gridSize - 1);
  const row = clamp(Math.floor(((DOMAIN - point.y) / (DOMAIN * 2)) * gridSize), 0, gridSize - 1);
  return row * gridSize + column;
}

function traceField(
  seed: Point,
  direction: 1 | -1,
  occupied: Uint8Array,
  gridSize: number,
) {
  const points: Point[] = [];
  const cells = new Set<number>();
  let x = seed.x;
  let y = seed.y;
  const stepSize = 0.036;

  for (let step = 0; step < 132; step += 1) {
    if (Math.abs(x) > DOMAIN + 0.12 || Math.abs(y) > DOMAIN + 0.12) break;
    const cell = occupancyIndex({ x, y }, gridSize);
    if (cell < 0 || (step > 5 && occupied[cell])) break;
    cells.add(cell);
    points.push({ x, y });
    const vector = fieldVector(x, y);
    const magnitude = Math.hypot(vector.x, vector.y);
    if (magnitude < 0.0001) break;
    x += (vector.x / magnitude) * stepSize * direction;
    y += (vector.y / magnitude) * stepSize * direction;
    if (step > 12 && (Math.hypot(x + 1, y) < 0.025 || Math.hypot(x - 1, y) < 0.025)) break;
  }

  return { points, cells };
}

function buildStreamlines(density: number) {
  const paths: Point[][] = [];
  const count = Math.max(9, Math.round(density));
  const occupancySize = Math.round(count * 2.35);
  const occupied = new Uint8Array(occupancySize * occupancySize);
  const seeds: Point[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      seeds.push({
        x: -DOMAIN + ((column + 0.5) / count) * DOMAIN * 2,
        y: DOMAIN - ((row + 0.5) / count) * DOMAIN * 2,
      });
    }
  }
  seeds.sort((a, b) => {
    const priorityA = Math.abs(Math.sin(a.x * 12.9898 + a.y * 78.233));
    const priorityB = Math.abs(Math.sin(b.x * 12.9898 + b.y * 78.233));
    return priorityB - priorityA;
  });

  seeds.forEach((seed) => {
    const seedCell = occupancyIndex(seed, occupancySize);
    if (seedCell < 0 || occupied[seedCell]) return;
    const backward = traceField(seed, -1, occupied, occupancySize);
    const forward = traceField(seed, 1, occupied, occupancySize);
    const combined = [...backward.points.reverse(), ...forward.points.slice(1)];
    if (combined.length < 24) return;
    backward.cells.forEach((cell) => { occupied[cell] = 1; });
    forward.cells.forEach((cell) => { occupied[cell] = 1; });
    paths.push(combined);
  });

  return paths;
}

function drawTriangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
  context.lineTo(x + Math.cos(angle + 2.55) * size * 0.82, y + Math.sin(angle + 2.55) * size * 0.82);
  context.lineTo(x + Math.cos(angle - 2.55) * size * 0.82, y + Math.sin(angle - 2.55) * size * 0.82);
  context.closePath();
  context.fill();
}

export function VectorField() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      queueMicrotask(() => setStorageReady(true));
      return;
    }
    try {
      const restored = { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<Settings>) };
      queueMicrotask(() => {
        setSettings(restored);
        setStorageReady(true);
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => setStorageReady(true));
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, storageReady]);

  useEffect(() => {
    if (!controlsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setControlsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [controlsOpen]);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = buildStreamlines(settings.density);
    const startedAt = window.performance.now();
    let animationFrame = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const render = (now: number) => {
      const elapsed = reducedMotion || !settings.motion
        ? 6.4
        : Math.max(0, (now - startedAt) / 1000) * settings.speed;
      const compact = width < 680;
      const outerInset = compact ? 28 : clamp(Math.min(width, height) * 0.055, 42, 72);
      const plotSize = Math.max(180, Math.min(width - outerInset * 2, height - outerInset * 2));
      const left = (width - plotSize) / 2;
      const top = (height - plotSize) / 2;
      const right = left + plotSize;
      const bottom = top + plotSize;
      const scale = plotSize / (DOMAIN * 2);
      const toScreen = (point: Point) => ({
        x: left + (point.x + DOMAIN) * scale,
        y: top + (DOMAIN - point.y) * scale,
      });

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = COLORS.white;
      context.fillRect(0, 0, width, height);
      context.save();
      context.beginPath();
      context.rect(left, top, plotSize, plotSize);
      context.clip();

      if (settings.axes) {
        const origin = toScreen({ x: 0, y: 0 });
        context.strokeStyle = "rgba(48, 85, 121, 0.22)";
        context.lineWidth = 0.8;
        context.beginPath();
        context.moveTo(left, origin.y);
        context.lineTo(right, origin.y);
        context.moveTo(origin.x, top);
        context.lineTo(origin.x, bottom);
        context.stroke();
      }

      const screenPaths = paths.map((path) => path.map(toScreen));
      if (settings.streamlines) {
        context.strokeStyle = "rgba(48, 85, 121, 0.82)";
        context.lineWidth = 1.75 * settings.stroke;
        context.lineCap = "round";
        context.lineJoin = "round";
        screenPaths.forEach((path) => {
          if (path.length < 2) return;
          context.beginPath();
          context.moveTo(path[0].x, path[0].y);
          for (let index = 1; index < path.length; index += 1) {
            context.lineTo(path[index].x, path[index].y);
          }
          context.stroke();
        });
      }

      if (settings.arrows) {
        const arrowProgresses = compact ? [0.48] : [0.3, 0.62];
        screenPaths.forEach((path, pathIndex) => {
          arrowProgresses.forEach((baseProgress, arrowIndex) => {
            const drift = settings.motion
              ? (elapsed * 0.028 + pathIndex * 0.003 + arrowIndex * 0.011) % 0.18
              : 0;
            const progress = clamp(baseProgress + drift, 0.08, 0.92);
            const pointIndex = clamp(Math.round(progress * (path.length - 1)), 2, path.length - 3);
            const point = path[pointIndex];
            const before = path[pointIndex - 2];
            const after = path[pointIndex + 2];
            if (!point || !before || !after) return;
            drawTriangle(
              context,
              point.x,
              point.y,
              Math.atan2(after.y - before.y, after.x - before.x),
              (compact ? 4.8 : 6.2) * settings.stroke,
              COLORS.navy,
            );
          });
        });
      }

      if (settings.particles) {
        screenPaths.forEach((path, pathIndex) => {
          if (pathIndex % 4 !== 0 || path.length < 4) return;
          const progress = settings.motion
            ? (elapsed * 0.075 + pathIndex * 0.137) % 1
            : (pathIndex * 0.137) % 1;
          const floatIndex = progress * (path.length - 1);
          const index = Math.floor(floatIndex);
          const nextIndex = Math.min(path.length - 1, index + 1);
          const mix = floatIndex - index;
          const x = path[index].x + (path[nextIndex].x - path[index].x) * mix;
          const y = path[index].y + (path[nextIndex].y - path[index].y) * mix;
          const active = pathIndex === 0;
          context.fillStyle = active ? "rgba(225, 254, 14, 0.22)" : "rgba(188, 212, 228, 0.34)";
          context.beginPath();
          context.arc(x, y, active ? 8 : 5.5, 0, TAU);
          context.fill();
          context.fillStyle = active ? COLORS.signal : COLORS.navy;
          context.beginPath();
          context.arc(x, y, active ? 3.1 : 2.1, 0, TAU);
          context.fill();
        });
      }

      if (settings.criticalPoints) {
        [-1, 1].forEach((xValue, index) => {
          const point = toScreen({ x: xValue, y: 0 });
          context.fillStyle = COLORS.white;
          context.strokeStyle = index === 0 ? COLORS.navy : COLORS.ink;
          context.lineWidth = 1.2;
          context.beginPath();
          context.arc(point.x, point.y, compact ? 4 : 5, 0, TAU);
          context.fill();
          context.stroke();
          context.fillStyle = index === 0 ? COLORS.navy : COLORS.ink;
          context.fillRect(point.x - 1, point.y - 1, 2, 2);
        });
      }
      context.restore();

      if (settings.frame) {
        context.strokeStyle = COLORS.ink;
        context.lineWidth = 1.35;
        context.strokeRect(left, top, plotSize, plotSize);
        const tickCount = 16;
        for (let tick = 0; tick <= tickCount; tick += 1) {
          const ratio = tick / tickCount;
          const position = left + plotSize * ratio;
          const verticalPosition = top + plotSize * ratio;
          const major = tick % 4 === 0;
          const tickLength = major ? (compact ? 8 : 11) : (compact ? 5 : 7);
          context.lineWidth = major ? 1.2 : 0.8;
          context.beginPath();
          context.moveTo(position, top);
          context.lineTo(position, top + tickLength);
          context.moveTo(position, bottom);
          context.lineTo(position, bottom - tickLength);
          context.moveTo(left, verticalPosition);
          context.lineTo(left + tickLength, verticalPosition);
          context.moveTo(right, verticalPosition);
          context.lineTo(right - tickLength, verticalPosition);
          context.stroke();
        }
      }

      if (settings.labels) {
        context.fillStyle = COLORS.ink;
        context.font = `500 ${compact ? 9 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textBaseline = "middle";
        [-4, -2, 0, 2, 4].forEach((value) => {
          const x = toScreen({ x: value, y: 0 }).x;
          const y = toScreen({ x: 0, y: value }).y;
          context.textAlign = "center";
          context.fillText(String(value), x, bottom + (compact ? 15 : 19));
          if (value !== 0) {
            context.textAlign = "right";
            context.fillText(String(value), left - (compact ? 9 : 13), y);
          }
        });
      }

      if (!reducedMotion && settings.motion) animationFrame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion || !settings.motion) render(window.performance.now());
    });
    resizeObserver.observe(field);
    resize();
    animationFrame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [settings]);

  const setSetting = <Key extends keyof Settings>(key: Key, value: Settings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const setLayers = (visible: boolean) => {
    setSettings((current) => ({
      ...current,
      streamlines: visible,
      arrows: visible,
      axes: visible,
      frame: visible,
      labels: visible,
      criticalPoints: visible,
      particles: visible,
    }));
  };

  return (
    <div className="vector-shell">
      <SiteNavigation
        active="vector"
        controlsOpen={controlsOpen}
        onControls={() => setControlsOpen((open) => !open)}
      />

      <aside
        id="graph-controls"
        className="control-panel vector-control-panel"
        aria-hidden={!controlsOpen}
        hidden={!controlsOpen}
      >
        <div className="control-panel__head">
          <span>Vector controls</span>
          <button type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset</button>
        </div>
        <div className="control-section">
          <ToggleRow label="Streamlines" checked={settings.streamlines} onChange={(value) => setSetting("streamlines", value)} />
          <ToggleRow label="Direction arrows" checked={settings.arrows} onChange={(value) => setSetting("arrows", value)} />
          <ToggleRow label="Axis lines" checked={settings.axes} onChange={(value) => setSetting("axes", value)} />
          <ToggleRow label="Frame and ticks" checked={settings.frame} onChange={(value) => setSetting("frame", value)} />
          <ToggleRow label="Scale labels" checked={settings.labels} onChange={(value) => setSetting("labels", value)} />
          <ToggleRow label="Critical points" checked={settings.criticalPoints} onChange={(value) => setSetting("criticalPoints", value)} />
          <ToggleRow label="Moving points" checked={settings.particles} onChange={(value) => setSetting("particles", value)} />
          <ToggleRow label="Motion" checked={settings.motion} onChange={(value) => setSetting("motion", value)} />
        </div>
        <div className="control-section control-section--ranges">
          <RangeRow label="Density" value={settings.density} min={9} max={30} step={1} display={String(settings.density)} onChange={(value) => setSetting("density", value)} />
          <RangeRow label="Stroke" value={settings.stroke} min={0.5} max={2.4} step={0.05} display={`${settings.stroke.toFixed(2)}×`} onChange={(value) => setSetting("stroke", value)} />
          <RangeRow label="Speed" value={settings.speed} min={0.25} max={2.5} step={0.05} display={`${settings.speed.toFixed(2)}×`} disabled={!settings.motion} onChange={(value) => setSetting("speed", value)} />
        </div>
        <div className="vector-visibility-controls">
          <button type="button" onClick={() => setLayers(true)}>Show all</button>
          <button type="button" onClick={() => setLayers(false)}>Hide all</button>
        </div>
      </aside>

      <section ref={fieldRef} className="vector-field">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Animated vector field with a stable node at negative one and an unstable node at positive one"
        />
      </section>
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

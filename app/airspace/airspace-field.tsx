"use client";

import { useEffect, useRef } from "react";
import { SiteNavigation } from "../site-navigation";

type Point = { x: number; y: number };
type Airport = Point & {
  code: string;
  heading: number;
  radius: number;
  runways: number[];
};
type Route = {
  start: Point;
  controlA: Point;
  controlB: Point;
  end: Point;
  phase: number;
  speed: number;
  callSign: string;
  level: number;
};

const COLORS = {
  ink: "#000000",
  navy: "#305579",
  powder: "#bcd4e4",
  gray: "#e4e4e4",
  offWhite: "#f5f5f5",
  white: "#ffffff",
  signal: "#e1fe0e",
};

const AIRPORTS: Airport[] = [
  { x: 0.12, y: 0.61, code: "EGLM", heading: 274, radius: 0.092, runways: [0.08, 1.91] },
  { x: 0.31, y: 0.39, code: "EGLL", heading: 267, radius: 0.105, runways: [-0.13, 0.02] },
  { x: 0.48, y: 0.53, code: "EGWU", heading: 262, radius: 0.082, runways: [-0.02] },
  { x: 0.68, y: 0.25, code: "EGTR", heading: 198, radius: 0.078, runways: [0.55, 2.12] },
  { x: 0.82, y: 0.57, code: "EGKR", heading: 211, radius: 0.086, runways: [-0.31] },
  { x: 0.31, y: 0.83, code: "EGTF", heading: 243, radius: 0.073, runways: [0.44] },
  { x: 0.58, y: 0.82, code: "OCK", heading: 301, radius: 0.104, runways: [1.56] },
  { x: 0.9, y: 0.17, code: "BAPAG", heading: 146, radius: 0.096, runways: [-0.88] },
];

const FIX_NAMES = [
  "ABTUM", "ADMAG", "ADSON", "BAPAG", "BASRI", "BEKUM", "BILNI", "BIG40",
  "BOVVA", "CAXER", "DET34", "DORKI", "DOVER", "EKNIV", "ELNAT", "EPM05",
  "ETVAX", "FARLO", "FELIX", "GOKUL", "GWC34", "HOLBY", "IPRIL", "LAM30",
  "LON08", "LON10", "LUNAR", "MARIL", "MAYLA", "NEXUS", "OCK24", "ODLEG",
  "PILON", "RAVEN", "RIGEL", "RUDMO", "SABER", "SILVA", "STNX2", "TANGO",
  "TODBI", "ULTRA", "VAPOR", "WELIN", "XENON", "YUKON", "ZEBRA", "D330T",
  "D196F", "D244F", "D304E", "D127O", "R032", "R305", "R326", "R362",
];

const CALL_SIGNS = [
  "BAW217", "UAL928", "VIR19K", "SAS804", "KLM44D", "AAL108", "EZY62N",
  "RYR35T", "DLH907", "SWR46P", "AFR18M", "ACA856", "JBU007", "LOT281",
  "QTR003", "FIN71A", "IBE316", "TAP621", "WZZ903", "ICE45L", "NKS118",
  "THY72C", "SIA322", "SVA109",
];

const SECTOR_LINES: Point[][] = [
  [{ x: -0.05, y: 0.16 }, { x: 0.18, y: 0.05 }, { x: 0.45, y: 0.12 }, { x: 0.72, y: 0.03 }, { x: 1.08, y: 0.18 }],
  [{ x: -0.03, y: 0.46 }, { x: 0.17, y: 0.31 }, { x: 0.39, y: 0.36 }, { x: 0.62, y: 0.29 }, { x: 1.04, y: 0.41 }],
  [{ x: -0.04, y: 0.74 }, { x: 0.24, y: 0.68 }, { x: 0.47, y: 0.75 }, { x: 0.73, y: 0.66 }, { x: 1.05, y: 0.79 }],
  [{ x: 0.08, y: -0.05 }, { x: 0.16, y: 0.24 }, { x: 0.1, y: 0.51 }, { x: 0.19, y: 1.05 }],
  [{ x: 0.39, y: -0.04 }, { x: 0.35, y: 0.22 }, { x: 0.43, y: 0.48 }, { x: 0.37, y: 1.04 }],
  [{ x: 0.72, y: -0.05 }, { x: 0.66, y: 0.2 }, { x: 0.76, y: 0.52 }, { x: 0.69, y: 1.04 }],
  [{ x: 0.94, y: -0.04 }, { x: 0.88, y: 0.32 }, { x: 0.96, y: 0.59 }, { x: 0.89, y: 1.05 }],
];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function bezierPoint(route: Route, progress: number): Point {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * route.start.x + 3 * inverse ** 2 * t * route.controlA.x + 3 * inverse * t ** 2 * route.controlB.x + t ** 3 * route.end.x,
    y: inverse ** 3 * route.start.y + 3 * inverse ** 2 * t * route.controlA.y + 3 * inverse * t ** 2 * route.controlB.y + t ** 3 * route.end.y,
  };
}

function bezierTangent(route: Route, progress: number): Point {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  return {
    x: 3 * inverse ** 2 * (route.controlA.x - route.start.x) + 6 * inverse * t * (route.controlB.x - route.controlA.x) + 3 * t ** 2 * (route.end.x - route.controlB.x),
    y: 3 * inverse ** 2 * (route.controlA.y - route.start.y) + 6 * inverse * t * (route.controlB.y - route.controlA.y) + 3 * t ** 2 * (route.end.y - route.controlB.y),
  };
}

function createFixes() {
  const random = seededRandom(91127);
  return FIX_NAMES.map((name, index) => ({
    name,
    x: 0.025 + random() * 0.95,
    y: 0.035 + random() * 0.93,
    type: index % 4,
  }));
}

function createRoutes() {
  const random = seededRandom(28051);
  return CALL_SIGNS.map((callSign, index): Route => {
    const horizontal = index % 2 === 0;
    const reverse = index % 4 > 1;
    const start = horizontal
      ? { x: reverse ? 1.08 : -0.08, y: 0.08 + random() * 0.84 }
      : { x: 0.05 + random() * 0.9, y: reverse ? 1.08 : -0.08 };
    const end = horizontal
      ? { x: reverse ? -0.08 : 1.08, y: 0.08 + random() * 0.84 }
      : { x: 0.05 + random() * 0.9, y: reverse ? -0.08 : 1.08 };
    const hub = AIRPORTS[index % AIRPORTS.length];
    return {
      start,
      controlA: { x: start.x * 0.28 + hub.x * 0.72, y: start.y * 0.28 + hub.y * 0.72 },
      controlB: { x: end.x * 0.28 + hub.x * 0.72, y: end.y * 0.28 + hub.y * 0.72 },
      end,
      phase: random(),
      speed: 0.009 + random() * 0.009,
      callSign,
      level: 70 + Math.floor(random() * 32) * 10,
    };
  });
}

function traceRoute(context: CanvasRenderingContext2D, route: Route, width: number, height: number) {
  context.beginPath();
  context.moveTo(route.start.x * width, route.start.y * height);
  context.bezierCurveTo(
    route.controlA.x * width,
    route.controlA.y * height,
    route.controlB.x * width,
    route.controlB.y * height,
    route.end.x * width,
    route.end.y * height,
  );
}

function drawRunway(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.strokeRect(-length / 2, -5, length, 10);
  context.beginPath();
  context.moveTo(-length / 2, 0);
  context.lineTo(length / 2, 0);
  context.stroke();
  for (let marker = -0.4; marker <= 0.4; marker += 0.2) {
    context.beginPath();
    context.moveTo(length * marker, -5);
    context.lineTo(length * marker, 5);
    context.stroke();
  }
  context.restore();
}

function drawCompass(
  context: CanvasRenderingContext2D,
  airport: Airport,
  width: number,
  height: number,
  elapsed: number,
) {
  const scale = Math.min(width, height);
  const x = airport.x * width;
  const y = airport.y * height;
  const radius = airport.radius * scale;

  context.strokeStyle = "rgba(48, 85, 121, 0.52)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();

  for (let tick = 0; tick < 72; tick += 1) {
    const angle = (tick / 72) * Math.PI * 2;
    const length = tick % 6 === 0 ? 10 : tick % 2 === 0 ? 6 : 3;
    context.lineWidth = tick % 6 === 0 ? 1.2 : 0.7;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * (radius - length), y + Math.sin(angle) * (radius - length));
    context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    context.stroke();
  }

  context.strokeStyle = "rgba(48, 85, 121, 0.84)";
  context.lineWidth = 0.8;
  airport.runways.forEach((runway) => drawRunway(context, x, y, radius * 2.7, runway));

  context.save();
  context.translate(x, y);
  context.rotate((airport.heading * Math.PI) / 180 + Math.sin(elapsed * 0.13 + x) * 0.018);
  context.strokeStyle = "rgba(0, 0, 0, 0.68)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, -radius * 1.16);
  context.lineTo(0, radius * 1.16);
  context.stroke();
  context.restore();

  context.fillStyle = COLORS.navy;
  context.font = "650 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.fillText(airport.code, x, y - radius - 8);
  context.textAlign = "left";
}

export function AirspaceField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const fixes = createFixes();
    const routes = createRoutes();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = window.performance.now();
    const view = { zoom: 1, targetZoom: 1, x: 0, y: 0, targetX: 0, targetY: 0 };
    const drag = { active: false, x: 0, y: 0 };
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let animationFrame = 0;

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const zoomAt = (nextZoom: number, pointerX = width / 2, pointerY = height / 2) => {
      const clampedZoom = clamp(nextZoom, 0.72, 3.2);
      const worldX = (pointerX - width / 2 - view.targetX) / view.targetZoom;
      const worldY = (pointerY - height / 2 - view.targetY) / view.targetZoom;
      view.targetX = pointerX - width / 2 - worldX * clampedZoom;
      view.targetY = pointerY - height / 2 - worldY * clampedZoom;
      view.targetZoom = clampedZoom;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      zoomAt(view.targetZoom * Math.exp(-event.deltaY * 0.0012), event.clientX - bounds.left, event.clientY - bounds.top);
    };
    const handlePointerDown = (event: PointerEvent) => {
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!drag.active) return;
      view.targetX += event.clientX - drag.x;
      view.targetY += event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
    };
    const handlePointerUp = (event: PointerEvent) => {
      drag.active = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "+" || event.key === "=") zoomAt(view.targetZoom * 1.18);
      if (event.key === "-" || event.key === "_") zoomAt(view.targetZoom / 1.18);
      if (event.key === "0") {
        view.targetZoom = 1;
        view.targetX = 0;
        view.targetY = 0;
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("keydown", handleKeyDown);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(field);
    resize();

    const render = (now: number) => {
      const elapsed = reducedMotion ? 31.4 : Math.max(0, (now - startedAt) / 1000);
      view.zoom += (view.targetZoom - view.zoom) * 0.12;
      view.x += (view.targetX - view.x) * 0.12;
      view.y += (view.targetY - view.y) * 0.12;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = COLORS.white;
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(width / 2 + view.x, height / 2 + view.y);
      context.scale(view.zoom, view.zoom);
      context.translate(-width / 2, -height / 2);

      // Angular reference lattice.
      context.strokeStyle = "rgba(48, 85, 121, 0.12)";
      context.lineWidth = 0.7;
      context.setLineDash([2, 9]);
      for (let column = 1; column < 16; column += 1) {
        const x = (column / 16) * width;
        context.beginPath();
        context.moveTo(x, -height * 0.15);
        context.lineTo(x + Math.sin(column * 0.8) * width * 0.04, height * 1.15);
        context.stroke();
      }
      for (let row = 1; row < 11; row += 1) {
        const y = (row / 11) * height;
        context.beginPath();
        context.moveTo(-width * 0.1, y);
        context.bezierCurveTo(width * 0.24, y - 9, width * 0.7, y + 12, width * 1.1, y - 4);
        context.stroke();
      }
      context.setLineDash([]);

      // Sector boundaries.
      context.strokeStyle = "rgba(48, 85, 121, 0.28)";
      context.lineWidth = 0.85;
      SECTOR_LINES.forEach((line, lineIndex) => {
        context.beginPath();
        line.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.setLineDash(lineIndex % 3 === 0 ? [8, 7] : []);
        context.stroke();
      });
      context.setLineDash([]);

      // Published corridors.
      routes.forEach((route, index) => {
        if (index % 2 !== 0) return;
        traceRoute(context, route, width, height);
        context.strokeStyle = index % 4 === 0 ? "rgba(188, 212, 228, 0.54)" : "rgba(228, 228, 228, 0.7)";
        context.lineWidth = index % 4 === 0 ? 5 : 3;
        context.stroke();
        traceRoute(context, route, width, height);
        context.strokeStyle = index % 4 === 0 ? "rgba(48, 85, 121, 0.68)" : "rgba(0, 0, 0, 0.28)";
        context.lineWidth = 0.8;
        context.setLineDash(index % 4 === 0 ? [9, 6] : []);
        context.stroke();
        context.setLineDash([]);
      });

      // Airport compass roses and runway complexes.
      AIRPORTS.forEach((airport) => drawCompass(context, airport, width, height, elapsed));

      // Fixes and beacons.
      const labelSize = width < 680 ? 6.5 : 8;
      context.font = `600 ${labelSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "middle";
      fixes.forEach((fix) => {
        const x = fix.x * width;
        const y = fix.y * height;
        context.strokeStyle = fix.type === 0 ? COLORS.ink : COLORS.navy;
        context.fillStyle = fix.type === 3 ? COLORS.ink : COLORS.navy;
        context.lineWidth = 0.9;
        context.beginPath();
        if (fix.type === 0) {
          context.arc(x, y, 2.2, 0, Math.PI * 2);
          context.fill();
        } else if (fix.type === 1) {
          context.moveTo(x, y - 4);
          context.lineTo(x + 3.6, y + 3);
          context.lineTo(x - 3.6, y + 3);
          context.closePath();
          context.stroke();
        } else if (fix.type === 2) {
          context.moveTo(x, y - 3.5);
          context.lineTo(x + 3.5, y);
          context.lineTo(x, y + 3.5);
          context.lineTo(x - 3.5, y);
          context.closePath();
          context.stroke();
        } else {
          context.rect(x - 2.5, y - 2.5, 5, 5);
          context.fill();
        }
        context.fillStyle = "rgba(0, 0, 0, 0.72)";
        context.fillText(fix.name, x + 5, y - 5);
      });

      // Live transponder tracks.
      const activeIndex = routes.length > 0 ? Math.floor(elapsed / 5.2) % routes.length : 0;
      routes.forEach((route, index) => {
        const progress = (route.phase + elapsed * route.speed) % 1;
        const point = bezierPoint(route, progress);
        const tangent = bezierTangent(route, progress);
        const x = point.x * width;
        const y = point.y * height;
        const angle = Math.atan2(tangent.y * height, tangent.x * width);
        const active = index === activeIndex;
        const color = active ? COLORS.signal : index % 5 === 0 ? COLORS.ink : COLORS.navy;

        context.strokeStyle = active ? COLORS.signal : "rgba(48, 85, 121, 0.42)";
        context.lineWidth = active ? 1.4 : 0.7;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - Math.cos(angle) * (active ? 34 : 20), y - Math.sin(angle) * (active ? 34 : 20));
        context.stroke();

        context.save();
        context.translate(x, y);
        context.rotate(angle + Math.PI / 2);
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(0, -5.5);
        context.lineTo(3.2, 4.3);
        context.lineTo(0, 2.8);
        context.lineTo(-3.2, 4.3);
        context.closePath();
        context.fill();
        context.restore();

        if (index % 2 === 0 || active) {
          context.font = `${active ? 700 : 600} ${active ? labelSize + 1 : labelSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          context.fillStyle = color;
          context.fillText(`${route.callSign} F${route.level}`, x + 8, y - 8);
        }

        if (active) {
          context.strokeStyle = COLORS.signal;
          context.lineWidth = 1;
          context.setLineDash([3, 4]);
          context.beginPath();
          context.arc(x, y, 14 + Math.sin(elapsed * 3) * 2, 0, Math.PI * 2);
          context.stroke();
          context.setLineDash([]);
        }
      });

      context.restore();
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="airspace-shell">
      <SiteNavigation active="airspace" />
      <section ref={fieldRef} className="airspace-field">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label="Animated terminal airspace chart with compass roses, runways, navigation fixes, sectors, and moving aircraft; drag to pan and scroll to zoom"
        />
      </section>
    </div>
  );
}

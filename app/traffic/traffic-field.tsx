"use client";

import { useEffect, useRef } from "react";
import { SiteNavigation } from "../site-navigation";

type Point = { x: number; y: number };
type Track = {
  start: Point;
  controlA: Point;
  controlB: Point;
  end: Point;
  phase: number;
  speed: number;
  callSign: string;
  flightLevel: number;
  groundSpeed: number;
  tracked: boolean;
};

const CALL_SIGNS = [
  "AAL241", "ACA707", "BAW39K", "CJT914", "DAL286", "EDV512", "FFT108",
  "JBU601", "KLM47P", "NKS319", "PDT882", "QTR719", "SKW264", "SWA908",
  "UAL173", "UPS451", "WJA620", "AAY337", "ASA118", "CPA805", "EJA72M",
  "FDX936", "JZA411", "LAN205", "NCA159", "RPA744", "TSC312", "VIR25B",
  "AJT804", "GTI510", "ICE68L", "ROU913", "SIA27C", "THY11D", "WWD438",
  "XAA602",
];

const FIX_NAMES = [
  "ADSON", "AMERT", "BAKER", "BRIXX", "CANDR", "CAVET", "DORIN", "EKTOR",
  "ELNAT", "FAVRO", "GIPER", "GOMER", "HADLY", "IKTAV", "JASEN", "KELSO",
  "KORAL", "LEMON", "LUNAR", "MERIT", "MOTIF", "NADIR", "NEXUS", "OPERA",
  "OSCAR", "PAVEN", "PIVOT", "QUILL", "RAVEN", "RIGEL", "SABER", "SILVA",
  "TANGO", "TULIP", "ULTRA", "VAPOR", "VEKTA", "WELLS", "XENON", "YUKON",
  "ZEBRA", "AKRON", "BASIL", "CORAL", "DOVER", "ELDEN", "FROST", "GLINT",
];

const SECTORS: Point[][] = [
  [{ x: 0, y: 0 }, { x: 0.3, y: 0 }, { x: 0.38, y: 0.26 }, { x: 0.17, y: 0.43 }, { x: 0, y: 0.33 }],
  [{ x: 0.3, y: 0 }, { x: 0.64, y: 0 }, { x: 0.67, y: 0.3 }, { x: 0.48, y: 0.44 }, { x: 0.38, y: 0.26 }],
  [{ x: 0.64, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.36 }, { x: 0.79, y: 0.43 }, { x: 0.67, y: 0.3 }],
  [{ x: 0, y: 0.33 }, { x: 0.17, y: 0.43 }, { x: 0.43, y: 0.58 }, { x: 0.31, y: 0.78 }, { x: 0, y: 0.69 }],
  [{ x: 0.17, y: 0.43 }, { x: 0.48, y: 0.44 }, { x: 0.71, y: 0.61 }, { x: 0.55, y: 0.82 }, { x: 0.31, y: 0.78 }, { x: 0.43, y: 0.58 }],
  [{ x: 0.48, y: 0.44 }, { x: 0.79, y: 0.43 }, { x: 1, y: 0.36 }, { x: 1, y: 0.74 }, { x: 0.71, y: 0.61 }],
  [{ x: 0, y: 0.69 }, { x: 0.31, y: 0.78 }, { x: 0.36, y: 1 }, { x: 0, y: 1 }],
  [{ x: 0.31, y: 0.78 }, { x: 0.55, y: 0.82 }, { x: 0.72, y: 1 }, { x: 0.36, y: 1 }],
  [{ x: 0.55, y: 0.82 }, { x: 0.71, y: 0.61 }, { x: 1, y: 0.74 }, { x: 1, y: 1 }, { x: 0.72, y: 1 }],
];

const COASTLINES: Point[][] = [
  [{ x: -0.02, y: 0.18 }, { x: 0.08, y: 0.22 }, { x: 0.13, y: 0.31 }, { x: 0.2, y: 0.37 }, { x: 0.22, y: 0.48 }, { x: 0.31, y: 0.54 }, { x: 0.29, y: 0.66 }, { x: 0.37, y: 0.72 }, { x: 0.35, y: 0.83 }, { x: 0.44, y: 1.03 }],
  [{ x: 0.7, y: -0.03 }, { x: 0.73, y: 0.09 }, { x: 0.69, y: 0.18 }, { x: 0.76, y: 0.25 }, { x: 0.74, y: 0.35 }, { x: 0.83, y: 0.44 }, { x: 0.8, y: 0.56 }, { x: 0.89, y: 0.63 }, { x: 0.86, y: 0.75 }, { x: 1.02, y: 0.86 }],
  [{ x: 0.4, y: 0.12 }, { x: 0.46, y: 0.17 }, { x: 0.43, y: 0.23 }, { x: 0.51, y: 0.28 }, { x: 0.49, y: 0.34 }, { x: 0.56, y: 0.38 }],
];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function interpolate(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function bezierPoint(track: Track, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * track.start.x + 3 * inverse ** 2 * t * track.controlA.x + 3 * inverse * t ** 2 * track.controlB.x + t ** 3 * track.end.x,
    y: inverse ** 3 * track.start.y + 3 * inverse ** 2 * t * track.controlA.y + 3 * inverse * t ** 2 * track.controlB.y + t ** 3 * track.end.y,
  };
}

function bezierTangent(track: Track, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  return {
    x: 3 * inverse ** 2 * (track.controlA.x - track.start.x) + 6 * inverse * t * (track.controlB.x - track.controlA.x) + 3 * t ** 2 * (track.end.x - track.controlB.x),
    y: 3 * inverse ** 2 * (track.controlA.y - track.start.y) + 6 * inverse * t * (track.controlB.y - track.controlA.y) + 3 * t ** 2 * (track.end.y - track.controlB.y),
  };
}

function createTracks() {
  const random = seededRandom(73027);
  const tracks: Track[] = [];

  for (let index = 0; index < CALL_SIGNS.length; index += 1) {
    const lane = index % 4;
    const margin = 0.035;
    let start: Point;
    let end: Point;

    if (lane === 0) {
      start = { x: -margin, y: 0.08 + random() * 0.84 };
      end = { x: 1 + margin, y: 0.08 + random() * 0.84 };
    } else if (lane === 1) {
      start = { x: 0.06 + random() * 0.88, y: -margin };
      end = { x: 0.06 + random() * 0.88, y: 1 + margin };
    } else if (lane === 2) {
      start = { x: 1 + margin, y: 0.08 + random() * 0.84 };
      end = { x: -margin, y: 0.08 + random() * 0.84 };
    } else {
      start = { x: 0.06 + random() * 0.88, y: 1 + margin };
      end = { x: 0.06 + random() * 0.88, y: -margin };
    }

    const hub = {
      x: 0.48 + (random() - 0.5) * 0.3,
      y: 0.54 + (random() - 0.5) * 0.24,
    };

    tracks.push({
      start,
      controlA: {
        x: interpolate(start.x, hub.x, 0.7) + (random() - 0.5) * 0.12,
        y: interpolate(start.y, hub.y, 0.7) + (random() - 0.5) * 0.12,
      },
      controlB: {
        x: interpolate(end.x, hub.x, 0.7) + (random() - 0.5) * 0.12,
        y: interpolate(end.y, hub.y, 0.7) + (random() - 0.5) * 0.12,
      },
      end,
      phase: random(),
      speed: 0.0065 + random() * 0.008,
      callSign: CALL_SIGNS[index],
      flightLevel: 190 + Math.floor(random() * 25) * 10,
      groundSpeed: 310 + Math.floor(random() * 18) * 10,
      tracked: index % 3 === 0 || index % 7 === 0,
    });
  }

  return tracks;
}

function traceTrack(context: CanvasRenderingContext2D, track: Track, width: number, height: number) {
  context.beginPath();
  context.moveTo(track.start.x * width, track.start.y * height);
  context.bezierCurveTo(
    track.controlA.x * width,
    track.controlA.y * height,
    track.controlB.x * width,
    track.controlB.y * height,
    track.end.x * width,
    track.end.y * height,
  );
}

function drawBracket(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const arm = size * 0.38;
  context.beginPath();
  context.moveTo(x - size, y - size + arm);
  context.lineTo(x - size, y - size);
  context.lineTo(x - size + arm, y - size);
  context.moveTo(x + size - arm, y - size);
  context.lineTo(x + size, y - size);
  context.lineTo(x + size, y - size + arm);
  context.moveTo(x + size, y + size - arm);
  context.lineTo(x + size, y + size);
  context.lineTo(x + size - arm, y + size);
  context.moveTo(x - size + arm, y + size);
  context.lineTo(x - size, y + size);
  context.lineTo(x - size, y + size - arm);
  context.stroke();
}

export function TrafficField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const tracks = createTracks();
    const waypointRandom = seededRandom(4129);
    const waypoints = FIX_NAMES.map((name, index) => ({
      name,
      x: 0.035 + waypointRandom() * 0.93,
      y: 0.055 + waypointRandom() * 0.89,
      kind: index % 4,
    }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = window.performance.now();
    const pointer = { x: -1000, y: -1000, active: false };
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

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
    };
    const handlePointerLeave = () => {
      pointer.active = false;
    };
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(field);
    resize();

    const render = (now: number) => {
      const elapsed = reducedMotion ? 28.4 : (now - startedAt) / 1000;
      const scale = Math.min(width, height);
      const compact = width < 640;
      const labelSize = compact ? 6.5 : Math.min(9, Math.max(7.2, width / 175));

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      // Controlled airspace sectors.
      SECTORS.forEach((sector, index) => {
        context.beginPath();
        sector.forEach((point, pointIndex) => {
          const x = point.x * width;
          const y = point.y * height;
          if (pointIndex === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
        context.fillStyle = index % 3 === 0
          ? "rgba(188, 212, 228, 0.34)"
          : index % 3 === 1
            ? "rgba(228, 228, 228, 0.33)"
            : "rgba(245, 245, 245, 0.78)";
        context.fill();
        context.strokeStyle = "rgba(48, 85, 121, 0.24)";
        context.lineWidth = 1;
        context.stroke();
      });

      // Coordinate lattice.
      context.strokeStyle = "rgba(48, 85, 121, 0.09)";
      context.lineWidth = 1;
      context.setLineDash([2, 7]);
      for (let column = 1; column < 12; column += 1) {
        const x = (column / 12) * width;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let row = 1; row < 8; row += 1) {
        const y = (row / 8) * height;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.setLineDash([]);

      // Abstract coastline and terrain boundaries.
      context.strokeStyle = "rgba(48, 85, 121, 0.34)";
      context.lineWidth = 1.1;
      COASTLINES.forEach((line) => {
        context.beginPath();
        line.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      });

      // Radar range reference around the primary terminal area.
      const radarX = width * 0.49;
      const radarY = height * 0.57;
      context.strokeStyle = "rgba(48, 85, 121, 0.22)";
      context.lineWidth = 1;
      context.setLineDash([5, 7]);
      [0.12, 0.23, 0.35, 0.47].forEach((radius) => {
        context.beginPath();
        context.arc(radarX, radarY, scale * radius, 0, Math.PI * 2);
        context.stroke();
      });
      for (let spoke = 0; spoke < 12; spoke += 1) {
        const angle = (spoke / 12) * Math.PI * 2;
        context.beginPath();
        context.moveTo(radarX, radarY);
        context.lineTo(radarX + Math.cos(angle) * scale * 0.48, radarY + Math.sin(angle) * scale * 0.48);
        context.stroke();
      }
      context.setLineDash([]);

      // Named fixes and navigation beacons.
      context.font = `600 ${labelSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "middle";
      waypoints.forEach((waypoint) => {
        const x = waypoint.x * width;
        const y = waypoint.y * height;
        context.strokeStyle = "rgba(20, 24, 28, 0.66)";
        context.fillStyle = "rgba(20, 24, 28, 0.72)";
        context.lineWidth = 0.8;
        context.beginPath();
        if (waypoint.kind === 0) {
          context.moveTo(x, y - 3.5);
          context.lineTo(x + 3.2, y + 2.8);
          context.lineTo(x - 3.2, y + 2.8);
          context.closePath();
          context.stroke();
        } else if (waypoint.kind === 1) {
          context.rect(x - 2.5, y - 2.5, 5, 5);
          context.stroke();
        } else if (waypoint.kind === 2) {
          context.arc(x, y, 2.2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.moveTo(x, y - 3);
          context.lineTo(x + 3, y);
          context.lineTo(x, y + 3);
          context.lineTo(x - 3, y);
          context.closePath();
          context.stroke();
        }
        context.fillText(waypoint.name, x + 5, y - 5);
      });

      // Published corridors and centerlines.
      tracks.forEach((track, index) => {
        if (index % 3 !== 0) return;
        traceTrack(context, track, width, height);
        context.strokeStyle = index % 2 === 0
          ? "rgba(188, 212, 228, 0.4)"
          : "rgba(228, 228, 228, 0.68)";
        context.lineWidth = compact ? 5 : 8;
        context.stroke();
        traceTrack(context, track, width, height);
        context.strokeStyle = "rgba(48, 85, 121, 0.42)";
        context.lineWidth = 1;
        context.setLineDash(index % 6 === 0 ? [7, 6] : []);
        context.stroke();
        context.setLineDash([]);
      });

      const positions = tracks.map((track) => {
        const progress = (track.phase + elapsed * track.speed) % 1;
        const normalizedPoint = bezierPoint(track, progress);
        return {
          progress,
          x: normalizedPoint.x * width,
          y: normalizedPoint.y * height,
          tangent: bezierTangent(track, progress),
        };
      });

      const cycleIndex = Math.floor(Math.max(0, elapsed) / 4.6);
      let selectedIndex = tracks.length > 0 ? cycleIndex % tracks.length : 0;
      if (pointer.active) {
        let nearestDistance = 86;
        positions.forEach((position, index) => {
          const distance = Math.hypot(pointer.x - position.x, pointer.y - position.y);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            selectedIndex = index;
          }
        });
      }

      // Live aircraft and tracking overlays.
      positions.forEach((position, index) => {
        const track = tracks[index];
        const selected = index === selectedIndex;
        const acquired = track.tracked && Math.sin(elapsed * 2.8 + index * 1.91) > 0.2;
        const angle = Math.atan2(position.tangent.y * height, position.tangent.x * width);
        const tailLength = compact ? 18 : 28;
        const tangentLength = Math.max(0.0001, Math.hypot(position.tangent.x * width, position.tangent.y * height));
        const unitX = (position.tangent.x * width) / tangentLength;
        const unitY = (position.tangent.y * height) / tangentLength;

        context.strokeStyle = selected ? "#e1fe0e" : "rgba(48, 85, 121, 0.42)";
        context.lineWidth = selected ? 1.6 : 0.9;
        context.beginPath();
        context.moveTo(position.x - unitX * tailLength, position.y - unitY * tailLength);
        context.lineTo(position.x + unitX * (selected ? 42 : 24), position.y + unitY * (selected ? 42 : 24));
        context.stroke();

        context.save();
        context.translate(position.x, position.y);
        context.rotate(angle + Math.PI / 2);
        context.beginPath();
        context.moveTo(0, -6.5);
        context.lineTo(3.7, 5.4);
        context.lineTo(0, 3.5);
        context.lineTo(-3.7, 5.4);
        context.closePath();
        context.fillStyle = selected ? "#e1fe0e" : index % 5 === 0 ? "#000000" : "#305579";
        context.fill();
        context.restore();

        if (track.tracked || selected) {
          context.strokeStyle = selected ? "#305579" : acquired ? "rgba(48, 85, 121, 0.82)" : "rgba(48, 85, 121, 0.3)";
          context.lineWidth = selected ? 1.5 : 0.9;
          drawBracket(context, position.x, position.y, selected ? 13 : 9);
        }

        if (selected || track.tracked) {
          const side = index % 2 === 0 ? 1 : -1;
          const labelX = position.x + side * (compact ? 20 : 30);
          const labelY = position.y - (12 + (index % 3) * 5);
          context.strokeStyle = selected ? "#305579" : "rgba(48, 85, 121, 0.45)";
          context.lineWidth = 0.8;
          context.beginPath();
          context.moveTo(position.x + side * 10, position.y - 7);
          context.lineTo(labelX, labelY + 4);
          context.stroke();

          context.font = `650 ${selected ? labelSize + 0.8 : labelSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          const lineOne = track.callSign;
          const lineTwo = `F${track.flightLevel} ${track.groundSpeed}`;
          const boxWidth = Math.max(context.measureText(lineOne).width, context.measureText(lineTwo).width) + 8;
          const boxHeight = labelSize * 2.45;
          const boxX = side > 0 ? labelX : labelX - boxWidth;
          const boxY = labelY - labelSize;
          context.fillStyle = selected ? "#e1fe0e" : "rgba(255, 255, 255, 0.82)";
          context.fillRect(boxX, boxY, boxWidth, boxHeight);
          context.strokeStyle = selected ? "#305579" : "rgba(48, 85, 121, 0.28)";
          context.strokeRect(boxX, boxY, boxWidth, boxHeight);
          context.fillStyle = selected ? "#000000" : "#305579";
          context.textAlign = side > 0 ? "left" : "right";
          const textX = side > 0 ? boxX + 4 : boxX + boxWidth - 4;
          context.fillText(lineOne, textX, boxY + labelSize * 0.72);
          context.fillText(lineTwo, textX, boxY + labelSize * 1.75);
          context.textAlign = "left";
        }
      });

      // Primary terminal fixes.
      [
        { x: 0.49, y: 0.57, code: "CTR" },
        { x: 0.31, y: 0.76, code: "AP1" },
        { x: 0.75, y: 0.31, code: "AP2" },
      ].forEach((hub, index) => {
        const x = hub.x * width;
        const y = hub.y * height;
        context.fillStyle = index === 0 ? "#e1fe0e" : "#ffffff";
        context.strokeStyle = "#305579";
        context.lineWidth = index === 0 ? 2 : 1.2;
        context.beginPath();
        context.arc(x, y, index === 0 ? 8 : 6, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = "#305579";
        context.font = `700 ${labelSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.fillText(hub.code, x + 11, y + 1);
      });

      // Edge telemetry is part of the instrument, not page copy.
      context.fillStyle = "#305579";
      context.font = `650 ${compact ? 7 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "top";
      const selectedTrack = tracks[selectedIndex] ?? tracks[0];
      const selectedCallSign = selectedTrack?.callSign ?? "STANDBY";
      context.fillText(`AREA 07 / ACTIVE ${tracks.length} / TRACK ${selectedCallSign}`, compact ? 10 : 22, compact ? 10 : 20);
      context.textAlign = "right";
      context.fillText("RNG 120NM / UPD 60HZ / MODE C", width - (compact ? 10 : 22), compact ? 10 : 20);
      context.textBaseline = "bottom";
      context.fillText("HND 06 / CONFLICT 02", width - (compact ? 10 : 22), height - (compact ? 10 : 20));
      context.textAlign = "left";
      context.fillText("CTR 49.0 / 057.0 / FL190–430", compact ? 10 : 22, height - (compact ? 10 : 20));

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div className="traffic-shell">
      <SiteNavigation active="traffic" />
      <section ref={fieldRef} className="traffic-field">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Animated air traffic control field with moving aircraft, routes, sectors, waypoints, tracking brackets, and live handoffs"
        />
      </section>
    </div>
  );
}

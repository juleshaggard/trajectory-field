"use client";

import { useEffect, useRef } from "react";
import { SiteNavigation } from "../site-navigation";

type PlotterVariant = "master" | "range" | "bearing" | "intercept" | "sector";

const COLORS = {
  ink: "#000000",
  navy: "#305579",
  powder: "#bcd4e4",
  gray: "#e4e4e4",
  offWhite: "#f5f5f5",
  white: "#ffffff",
  signal: "#e1fe0e",
};

const VARIANT_PHASE: Record<PlotterVariant, number> = {
  master: 0.14,
  range: 1.28,
  bearing: 2.62,
  intercept: 3.94,
  sector: 5.18,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function heading(value: number) {
  const normalized = ((Math.round(value) % 360) + 360) % 360;
  return String(normalized).padStart(3, "0");
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.lineTo(x + width - corner, y);
  context.quadraticCurveTo(x + width, y, x + width, y + corner);
  context.lineTo(x + width, y + height - corner);
  context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  context.lineTo(x + corner, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - corner);
  context.lineTo(x, y + corner);
  context.quadraticCurveTo(x, y, x + corner, y);
  context.closePath();
}

function drawHatchedFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  inset: number,
  band: number,
) {
  const radius = Math.max(10, band * 0.7);
  roundedRect(context, inset, inset, width - inset * 2, height - inset * 2, radius);
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.2;
  context.stroke();

  context.save();
  roundedRect(context, inset, inset, width - inset * 2, height - inset * 2, radius);
  context.clip();
  context.strokeStyle = "rgba(0, 0, 0, 0.72)";
  context.lineWidth = 1;
  const spacing = Math.max(7, band * 0.38);
  for (let x = -height; x < width + height; x += spacing) {
    context.beginPath();
    context.moveTo(x, inset);
    context.lineTo(x + band, inset + band);
    context.stroke();
    context.beginPath();
    context.moveTo(x, height - inset - band);
    context.lineTo(x + band, height - inset);
    context.stroke();
  }
  for (let y = -width; y < width + height; y += spacing) {
    context.beginPath();
    context.moveTo(inset, y);
    context.lineTo(inset + band, y + band);
    context.stroke();
    context.beginPath();
    context.moveTo(width - inset - band, y);
    context.lineTo(width - inset, y + band);
    context.stroke();
  }
  context.restore();

  roundedRect(
    context,
    inset + band,
    inset + band,
    width - (inset + band) * 2,
    height - (inset + band) * 2,
    Math.max(5, radius - band * 0.45),
  );
  context.strokeStyle = "rgba(48, 85, 121, 0.72)";
  context.lineWidth = 0.8;
  context.stroke();
}

function drawEdgeScale(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  inset: number,
  band: number,
  compact: boolean,
) {
  const left = inset + band + 4;
  const right = width - inset - band - 4;
  const top = inset + band + 4;
  const bottom = height - inset - band - 4;
  const stepsX = compact ? 30 : 48;
  const stepsY = compact ? 22 : 36;
  context.strokeStyle = COLORS.ink;
  context.fillStyle = COLORS.ink;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let step = 0; step <= stepsX; step += 1) {
    const ratio = step / stepsX;
    const x = left + (right - left) * ratio;
    const major = step % 6 === 0;
    const medium = step % 3 === 0;
    const length = major ? band * 0.64 : medium ? band * 0.43 : band * 0.26;
    context.lineWidth = major ? 1.25 : 0.75;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + length);
    context.moveTo(x, bottom);
    context.lineTo(x, bottom - length);
    context.stroke();
    if (major && step > 0 && step < stepsX) {
      const topValue = 320 + ratio * 80;
      const bottomValue = 220 - ratio * 80;
      context.font = `650 ${compact ? 7 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillText(heading(topValue), x, top + band * 0.78);
      context.fillText(heading(bottomValue), x, bottom - band * 0.78);
    }
  }

  for (let step = 0; step <= stepsY; step += 1) {
    const ratio = step / stepsY;
    const y = top + (bottom - top) * ratio;
    const major = step % 6 === 0;
    const medium = step % 3 === 0;
    const length = major ? band * 0.64 : medium ? band * 0.43 : band * 0.26;
    context.lineWidth = major ? 1.25 : 0.75;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + length, y);
    context.moveTo(right, y);
    context.lineTo(right - length, y);
    context.stroke();
    if (major && step > 0 && step < stepsY) {
      context.font = `650 ${compact ? 7 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillText(heading(320 - ratio * 100), left + band * 0.82, y);
      context.fillText(heading(40 + ratio * 100), right - band * 0.82, y);
    }
  }

  context.font = `750 ${compact ? 10 : 13}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText("N", width / 2, top + band * 0.72);
  context.fillText("S", width / 2, bottom - band * 0.72);
  context.fillText("W", left + band * 0.72, height / 2);
  context.fillText("E", right - band * 0.72, height / 2);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  bounds: { left: number; top: number; right: number; bottom: number },
  compact: boolean,
) {
  const { left, top, right, bottom } = bounds;
  const columns = compact ? 10 : 14;
  const rows = compact ? 8 : 12;
  context.strokeStyle = "rgba(48, 85, 121, 0.52)";
  context.lineWidth = 0.75;
  for (let column = 0; column <= columns; column += 1) {
    const x = left + ((right - left) * column) / columns;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, bottom);
    context.stroke();
  }
  for (let row = 0; row <= rows; row += 1) {
    const y = top + ((bottom - top) * row) / rows;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
  }

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(centerX, top);
  context.lineTo(centerX, bottom);
  context.moveTo(left, centerY);
  context.lineTo(right, centerY);
  context.stroke();

  context.lineWidth = 1;
  for (let tick = 0; tick <= columns * 2; tick += 1) {
    const x = left + ((right - left) * tick) / (columns * 2);
    context.beginPath();
    context.moveTo(x, centerY - (tick % 2 === 0 ? 5 : 3));
    context.lineTo(x, centerY + (tick % 2 === 0 ? 5 : 3));
    context.stroke();
  }
  for (let tick = 0; tick <= rows * 2; tick += 1) {
    const y = top + ((bottom - top) * tick) / (rows * 2);
    context.beginPath();
    context.moveTo(centerX - (tick % 2 === 0 ? 5 : 3), y);
    context.lineTo(centerX + (tick % 2 === 0 ? 5 : 3), y);
    context.stroke();
  }
}

function drawRegistration(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.fillStyle = COLORS.white;
  context.strokeStyle = COLORS.navy;
  context.lineWidth = 1.1;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = COLORS.ink;
  context.beginPath();
  context.arc(x, y, Math.max(1.2, radius * 0.25), 0, Math.PI * 2);
  context.fill();
}

function drawModuleGeometry(
  context: CanvasRenderingContext2D,
  variant: PlotterVariant,
  bounds: { left: number; top: number; right: number; bottom: number },
  elapsed: number,
  compact: boolean,
) {
  const boardWidth = bounds.right - bounds.left;
  const boardHeight = bounds.bottom - bounds.top;
  const scale = Math.min(boardWidth, boardHeight);
  const phase = VARIANT_PHASE[variant];
  const center = {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };
  if (variant === "range") center.x -= boardWidth * 0.08;
  if (variant === "intercept") center.y += boardHeight * 0.08;
  if (variant === "sector") center.x += boardWidth * 0.1;

  const ringMultipliers = variant === "bearing"
    ? [0.16, 0.29, 0.42]
    : variant === "sector"
      ? [0.2, 0.38]
      : [0.19, 0.36];
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.15;
  ringMultipliers.forEach((multiplier, index) => {
    context.beginPath();
    if (variant === "sector" && index === 1) {
      context.arc(center.x, center.y, scale * multiplier, Math.PI * 1.08, Math.PI * 1.93);
    } else {
      context.arc(center.x, center.y, scale * multiplier, 0, Math.PI * 2);
    }
    context.stroke();
  });

  const liveAngle = phase + elapsed * (variant === "master" ? 0.09 : 0.13);
  const lineRadius = scale * (variant === "bearing" ? 0.46 : 0.4);
  context.strokeStyle = COLORS.navy;
  context.lineWidth = 1.35;
  context.beginPath();
  context.moveTo(center.x, center.y);
  context.lineTo(center.x + Math.cos(liveAngle) * lineRadius, center.y + Math.sin(liveAngle) * lineRadius);
  context.stroke();

  context.strokeStyle = COLORS.signal;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, lineRadius, liveAngle - 0.025, liveAngle + 0.025);
  context.stroke();

  if (variant === "intercept" || variant === "master") {
    const crossingAngle = -phase * 0.62 + elapsed * 0.045;
    context.strokeStyle = "rgba(48, 85, 121, 0.76)";
    context.lineWidth = 1;
    context.setLineDash([7, 6]);
    context.beginPath();
    context.moveTo(center.x - Math.cos(crossingAngle) * lineRadius, center.y - Math.sin(crossingAngle) * lineRadius);
    context.lineTo(center.x + Math.cos(crossingAngle) * lineRadius, center.y + Math.sin(crossingAngle) * lineRadius);
    context.stroke();
    context.setLineDash([]);
  }

  if (variant === "sector") {
    context.strokeStyle = "rgba(48, 85, 121, 0.84)";
    context.lineWidth = 1;
    for (let spoke = -2; spoke <= 2; spoke += 1) {
      const angle = liveAngle + spoke * 0.31;
      context.beginPath();
      context.moveTo(center.x, center.y);
      context.lineTo(center.x + Math.cos(angle) * lineRadius, center.y + Math.sin(angle) * lineRadius);
      context.stroke();
    }
  }

  context.fillStyle = COLORS.ink;
  context.font = `650 ${compact ? 7 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.save();
  context.translate(center.x + scale * 0.22, center.y - scale * 0.22);
  context.rotate(-0.58);
  context.fillText(variant === "bearing" ? "030°" : "10 NM", 0, 0);
  context.restore();
  drawRegistration(context, center.x, center.y, compact ? 3.5 : 4.5);
}

function PlotterBoard({ variant, className = "" }: { variant: PlotterVariant; className?: string }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = window.performance.now();
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let animationFrame = 0;
    let visible = true;

    const resize = () => {
      const bounds = board.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const draw = (now: number) => {
      const elapsed = reducedMotion ? 24.2 : Math.max(0, (now - startedAt) / 1000);
      const compact = Math.min(width, height) < 520;
      const inset = variant === "master" ? clamp(Math.min(width, height) * 0.012, 8, 16) : 8;
      const band = clamp(Math.min(width, height) * 0.058, compact ? 24 : 30, 56);
      const scaleInset = inset + band + (compact ? 5 : 9);
      const bounds = {
        left: scaleInset + band * 0.88,
        top: scaleInset + band * 0.88,
        right: width - scaleInset - band * 0.88,
        bottom: height - scaleInset - band * 0.88,
      };

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = variant === "range" || variant === "sector" ? COLORS.offWhite : COLORS.white;
      context.fillRect(0, 0, width, height);
      drawHatchedFrame(context, width, height, inset, band);
      drawEdgeScale(context, width, height, inset, band, compact);
      drawGrid(context, bounds, compact);
      drawModuleGeometry(context, variant, bounds, elapsed, compact);

      if (!reducedMotion && visible) animationFrame = window.requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion || !visible) draw(window.performance.now());
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      const nextVisible = entry.isIntersecting;
      if (nextVisible && !visible && !reducedMotion) {
        visible = true;
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        visible = nextVisible;
        if (!visible) window.cancelAnimationFrame(animationFrame);
      }
    }, { rootMargin: "120px" });

    resizeObserver.observe(board);
    intersectionObserver.observe(board);
    resize();
    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [variant]);

  return (
    <section ref={boardRef} className={`plotter-board ${className}`.trim()}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${variant} navigation plotting board with calibrated heading rulers, grid, range rings, and live bearing index`}
      />
    </section>
  );
}

export function PlotterField() {
  return (
    <div className="plotter-shell">
      <SiteNavigation active="plotter" />
      <div className="plotter-stage plotter-stage--hero">
        <PlotterBoard variant="master" />
      </div>
      <div className="plotter-mosaic">
        <PlotterBoard variant="range" className="plotter-board--wide" />
        <PlotterBoard variant="bearing" className="plotter-board--square" />
        <PlotterBoard variant="intercept" className="plotter-board--medium" />
        <PlotterBoard variant="sector" className="plotter-board--landscape" />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNavigation } from "../site-navigation";

type Period = "daily" | "weekly" | "monthly";

type PeriodConfig = {
  value: number;
  previous: string;
  current: string;
  phase: number;
  peaks: Array<[number, number, number]>;
};

const PERIODS: Record<Period, PeriodConfig> = {
  daily: {
    value: 14,
    previous: "YEST  $1,621",
    current: "TODAY  $1,842",
    phase: 1.7,
    peaks: [[0.18, 0.08, 0.48], [0.47, 0.12, 0.28], [0.78, 0.08, 0.42]],
  },
  weekly: {
    value: 82,
    previous: "WK 32  $6,840",
    current: "WK 33  $8,214",
    phase: 3.4,
    peaks: [[0.12, 0.07, 0.3], [0.38, 0.1, 0.52], [0.68, 0.14, 0.36], [0.9, 0.05, 0.24]],
  },
  monthly: {
    value: 326,
    previous: "MAY  $3,250",
    current: "JUN  $12,392",
    phase: 0.2,
    peaks: [[0.08, 0.035, 0.48], [0.19, 0.055, 0.31], [0.55, 0.08, 0.76], [0.68, 0.055, 0.36], [0.86, 0.035, 0.29]],
  },
};

const PERIOD_ORDER: Period[] = ["daily", "weekly", "monthly"];
const COLUMNS = 52;
const MAX_ROWS = 12;

function targetLevel(index: number, config: PeriodConfig, time: number, reducedMotion: boolean) {
  const x = index / (COLUMNS - 1);
  let level = 0.13 + Math.sin(x * Math.PI * 5.4 + config.phase) * 0.045;
  for (const [center, width, height] of config.peaks) {
    const distance = (x - center) / width;
    level += Math.exp(-(distance * distance)) * height;
  }
  if (!reducedMotion) {
    level += Math.sin(time * 0.72 + index * 0.48 + config.phase) * 0.035;
    level += Math.sin(time * 0.23 - index * 0.19) * 0.018;
  }
  return Math.max(0.08, Math.min(0.96, level));
}

export function PulseField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const periodRef = useRef<Period>("monthly");
  const hoverRef = useRef<number | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const chart = chartRef.current;
    if (!canvas || !chart) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const levels = new Float32Array(COLUMNS).fill(0.12);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let lastTime = window.performance.now();
    let width = 1;
    let height = 1;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = chart.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(chart);
    resize();

    const pointerColumn = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const horizontalPadding = width < 560 ? 20 : 42;
      const usableWidth = Math.max(1, width - horizontalPadding * 2);
      const progress = (event.clientX - bounds.left - horizontalPadding) / usableWidth;
      hoverRef.current = Math.max(0, Math.min(COLUMNS - 1, Math.round(progress * (COLUMNS - 1))));
    };
    const clearPointer = () => {
      hoverRef.current = null;
    };
    canvas.addEventListener("pointermove", pointerColumn);
    canvas.addEventListener("pointerleave", clearPointer);

    const render = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = reducedMotion ? 2.4 : now / 1000;
      const config = PERIODS[periodRef.current];
      const horizontalPadding = width < 560 ? 20 : 42;
      const bottomPadding = width < 560 ? 39 : 88;
      const topPadding = width < 560 ? 18 : 26;
      const usableWidth = Math.max(1, width - horizontalPadding * 2);
      const usableHeight = Math.max(80, height - topPadding - bottomPadding);
      const columnGap = usableWidth / (COLUMNS - 1);
      const rowGap = Math.min(width < 560 ? 12 : 19, usableHeight / (MAX_ROWS - 1));
      const radius = Math.max(2.15, Math.min(3.65, columnGap * 0.29));
      const idleColumn = Math.floor((Math.sin(elapsed * 0.31) * 0.5 + 0.5) * (COLUMNS - 1));
      const focusColumn = hoverRef.current ?? idleColumn;

      context.clearRect(0, 0, width, height);
      context.save();

      for (let column = 0; column < COLUMNS; column += 1) {
        const target = targetLevel(column, config, elapsed, reducedMotion);
        levels[column] += (target - levels[column]) * (1 - Math.exp(-3.3 * delta));
        const litRows = levels[column] * MAX_ROWS;
        const x = horizontalPadding + column * columnGap;
        const isCurrent = column >= Math.floor(COLUMNS * 0.48);
        const focusDistance = Math.abs(column - focusColumn);

        for (let row = 0; row < MAX_ROWS; row += 1) {
          const activation = Math.max(0, Math.min(1, litRows - row));
          if (activation <= 0.025) continue;
          const y = height - bottomPadding - row * rowGap;
          const idleBreath = reducedMotion ? 0 : Math.sin(elapsed * 1.05 + column * 0.14 - row * 0.22) * 0.08;
          const focusLift = Math.max(0, 1 - focusDistance / 5) * 0.22;
          const alpha = Math.max(0.08, Math.min(0.93, activation * (isCurrent ? 0.72 : 0.31) + idleBreath + focusLift));
          const dotRadius = radius * (0.78 + activation * 0.22 + focusLift * 0.16);

          context.beginPath();
          context.arc(x, y, dotRadius, 0, Math.PI * 2);
          context.fillStyle = isCurrent
            ? `rgba(48, 85, 121, ${alpha})`
            : `rgba(102, 113, 122, ${alpha})`;
          context.fill();
        }
      }

      const focusLevel = levels[focusColumn] * MAX_ROWS;
      const signalRow = Math.max(0, Math.min(MAX_ROWS - 1, Math.floor(focusLevel)));
      const signalX = horizontalPadding + focusColumn * columnGap;
      const signalY = height - bottomPadding - signalRow * rowGap;
      context.beginPath();
      context.arc(signalX, signalY, radius * 1.16, 0, Math.PI * 2);
      context.fillStyle = "#e1fe0e";
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = "#305579";
      context.stroke();

      context.restore();

      if (valueRef.current) {
        const drift = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 0.42 + config.phase) * Math.max(1, config.value * 0.012));
        valueRef.current.textContent = `+${config.value + drift}`;
      }
      animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", pointerColumn);
      canvas.removeEventListener("pointerleave", clearPointer);
    };
  }, []);

  const config = PERIODS[period];

  return (
    <div className="pulse-shell">
      <SiteNavigation active="pulse" />
      <section className="pulse-field">
        <article className="pulse-card" aria-label="Animated revenue pulse">
          <header className="pulse-card__header">
            <div className="pulse-card__metric">
              <span>Revenue pulse</span>
              <strong><span ref={valueRef}>+326</span><small>%</small></strong>
            </div>
            <div className="pulse-card__periods" role="tablist" aria-label="Revenue period">
              {PERIOD_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={period === option}
                  className={period === option ? "is-selected" : ""}
                  onClick={() => setPeriod(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </header>

          <div ref={chartRef} className="pulse-chart">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Animated ${period} dot matrix showing current and previous revenue activity`}
            />
            <div className="pulse-chart__labels" aria-hidden="true">
              <span>{config.previous}</span>
              <strong>{config.current}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

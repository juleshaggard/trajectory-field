"use client";

import { useEffect, useRef } from "react";

type TrailPoint = {
  x: number;
  y: number;
  time: number;
};

const TRAIL_LIFETIME = 860;
const MAX_POINTS = 96;
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, summary, label[for], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!canvas || !cursor) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const target = { x: 0, y: 0 };
    const lead = { x: 0, y: 0 };
    const guide = { x: 0, y: 0 };
    const head = { x: 0, y: 0 };
    const previousHead = { x: 0, y: 0 };
    const direction = { x: 0, y: 0 };
    const points: TrailPoint[] = [];

    let initialized = false;
    let enabled = finePointer.matches && !reducedMotion.matches;
    let frame = 0;
    let previousFrame = 0;
    let rotation = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
    };

    const clearTrail = () => {
      points.length = 0;
      previousFrame = 0;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const deactivate = () => {
      clearTrail();
      initialized = false;
      cursor.style.opacity = "0";
      cursor.classList.remove("is-hovering");
      document.documentElement.classList.remove("flight-cursor-enabled");
    };

    const draw = (now: number) => {
      frame = 0;

      if (!enabled || !initialized) {
        deactivate();
        return;
      }

      const delta = previousFrame ? Math.min(now - previousFrame, 24) : 16.67;
      previousFrame = now;

      // Three time-corrected low-pass stages absorb hand jitter and abrupt
      // pointer samples while keeping the tail's follow-through continuous.
      const leadFollow = 1 - Math.exp(-delta / 26);
      const guideFollow = 1 - Math.exp(-delta / 44);
      const headFollow = 1 - Math.exp(-delta / 62);
      lead.x += (target.x - lead.x) * leadFollow;
      lead.y += (target.y - lead.y) * leadFollow;
      guide.x += (lead.x - guide.x) * guideFollow;
      guide.y += (lead.y - guide.y) * guideFollow;
      head.x += (guide.x - head.x) * headFollow;
      head.y += (guide.y - head.y) * headFollow;

      const velocityX = (head.x - previousHead.x) / delta;
      const velocityY = (head.y - previousHead.y) / delta;
      const velocityFollow = 1 - Math.exp(-delta / 72);
      direction.x += (velocityX - direction.x) * velocityFollow;
      direction.y += (velocityY - direction.y) * velocityFollow;
      previousHead.x = head.x;
      previousHead.y = head.y;

      const speed = Math.hypot(direction.x, direction.y);
      if (speed > 0.012) {
        const desiredRotation = Math.atan2(direction.y, direction.x) + Math.PI / 2;
        const turn = Math.atan2(
          Math.sin(desiredRotation - rotation),
          Math.cos(desiredRotation - rotation),
        );
        rotation += turn * (1 - Math.exp(-delta / 86));
      }

      cursor.style.transform = `translate3d(${head.x - 13}px, ${head.y - 14}px, 0) rotate(${rotation}rad)`;

      const lastPoint = points.at(-1);
      const distance = lastPoint
        ? Math.hypot(head.x - lastPoint.x, head.y - lastPoint.y)
        : Number.POSITIVE_INFINITY;

      if (distance > 0.25) {
        points.push({ x: head.x, y: head.y, time: now });
      }

      while (
        points.length > MAX_POINTS ||
        (points[0] && now - points[0].time > TRAIL_LIFETIME)
      ) {
        points.shift();
      }

      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.lineWidth = 1;
      context.lineCap = "round";
      context.lineJoin = "round";

      // Draw Catmull-Rom spans as cubic Beziers so quick direction changes
      // settle into one continuous curve instead of angular cursor samples.
      for (let index = 0; index < points.length - 1; index += 1) {
        const point0 = points[Math.max(0, index - 1)];
        const point1 = points[index];
        const point2 = points[index + 1];
        const point3 = points[Math.min(points.length - 1, index + 2)];
        const age = now - (point1.time + point2.time) / 2;
        const life = Math.max(0, 1 - age / TRAIL_LIFETIME);

        if (life <= 0) continue;

        context.beginPath();
        context.moveTo(point1.x, point1.y);
        context.bezierCurveTo(
          point1.x + (point2.x - point0.x) / 6,
          point1.y + (point2.y - point0.y) / 6,
          point2.x - (point3.x - point1.x) / 6,
          point2.y - (point3.y - point1.y) / 6,
          point2.x,
          point2.y,
        );
        context.strokeStyle = `rgba(112, 112, 112, ${0.78 * life * life})`;
        context.stroke();
      }

      const targetGap = Math.hypot(target.x - head.x, target.y - head.y);
      if (points.length > 1 || targetGap > 0.25) {
        frame = window.requestAnimationFrame(draw);
      } else {
        clearTrail();
      }
    };

    const start = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const updateHoverState = (targetElement: EventTarget | null) => {
      const isInteractive =
        targetElement instanceof Element &&
        Boolean(targetElement.closest(INTERACTIVE_SELECTOR));
      cursor.classList.toggle("is-hovering", isInteractive);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabled || (event.pointerType && event.pointerType !== "mouse")) return;

      const nextX = event.clientX;
      const nextY = event.clientY;
      const jumped =
        initialized && Math.hypot(nextX - target.x, nextY - target.y) > 180;

      target.x = nextX;
      target.y = nextY;
      document.documentElement.classList.add("flight-cursor-enabled");
      cursor.style.opacity = "1";
      updateHoverState(event.target);

      if (!initialized || jumped) {
        lead.x = nextX;
        lead.y = nextY;
        guide.x = nextX;
        guide.y = nextY;
        head.x = nextX;
        head.y = nextY;
        previousHead.x = nextX;
        previousHead.y = nextY;
        direction.x = 0;
        direction.y = 0;
        rotation = 0;
        points.length = 0;
        initialized = true;
        previousFrame = 0;
      }

      start();
    };

    const handleCapabilityChange = () => {
      enabled = finePointer.matches && !reducedMotion.matches;
      if (!enabled) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        deactivate();
      }
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        deactivate();
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("blur", deactivate);
    finePointer.addEventListener("change", handleCapabilityChange);
    reducedMotion.addEventListener("change", handleCapabilityChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", deactivate);
      finePointer.removeEventListener("change", handleCapabilityChange);
      reducedMotion.removeEventListener("change", handleCapabilityChange);
      cursor.classList.remove("is-hovering");
      document.documentElement.classList.remove("flight-cursor-enabled");
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="mouse-trail" aria-hidden="true" />
      <span ref={cursorRef} className="flight-cursor" aria-hidden="true" />
    </>
  );
}

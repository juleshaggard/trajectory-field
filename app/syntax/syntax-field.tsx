"use client";

import { useEffect, useRef } from "react";
import { SiteNavigation } from "../site-navigation";

type Point = { x: number; y: number };
type WordNode = {
  text: string;
  x: number;
  y: number;
  size: number;
  phase: number;
  travelX: number;
  travelY: number;
  weight: number;
};
type PositionedWord = WordNode & Point & {
  fontSize: number;
  width: number;
  height: number;
  cadence: number;
};
type TextTarget = {
  id: string;
  wordIndex: number;
  start: number;
  length: number;
  phase: number;
  confidence: number;
};
type ConnectorStyle = "straight" | "curve" | "wave" | "step" | "loop" | "coil";
type StudySize = "full" | "wide" | "square" | "medium";
type HeadlineStudyDefinition = {
  headline: string;
  parts: string[];
  style: ConnectorStyle;
  tracking: number;
  size: StudySize;
  tone: "white" | "gray";
};
type MeasuredNode = Point & { width: number; height: number };

const FONT_FAMILY = '"Basel Classic", "Basel", "Helvetica Neue", Helvetica, Arial, sans-serif';
const TAU = Math.PI * 2;

const WORDS: WordNode[] = [
  { text: "Make", x: 0.18, y: 0.22, size: 0.078, phase: 0.15, travelX: 0.018, travelY: 0.026, weight: 400 },
  { text: "the story", x: 0.72, y: 0.29, size: 0.071, phase: 1.45, travelX: 0.026, travelY: 0.018, weight: 400 },
  { text: "move", x: 0.37, y: 0.61, size: 0.074, phase: 2.72, travelX: 0.022, travelY: 0.032, weight: 400 },
];

const CONNECTIONS = [
  [0, 1], [0, 2], [1, 2],
];

const TEXT_TARGETS: TextTarget[] = [
  { id: "B-014", wordIndex: 0, start: 0, length: 2, phase: 0.18, confidence: 0.96 },
  { id: "B-027", wordIndex: 1, start: 4, length: 5, phase: 1.72, confidence: 0.91 },
  { id: "B-041", wordIndex: 2, start: 1, length: 2, phase: 3.34, confidence: 0.88 },
];

const HEADLINE_STUDIES: HeadlineStudyDefinition[] = [
  { headline: "Stories with trajectory.", parts: ["Stories", "with", "trajectory."], style: "curve", tracking: 2, size: "wide", tone: "white" },
  { headline: "Get ahead of the conversation.", parts: ["Get ahead", "of the", "conversation."], style: "wave", tracking: 3, size: "square", tone: "gray" },
  { headline: "Know where you're going.", parts: ["Know", "where you're", "going."], style: "coil", tracking: 1, size: "square", tone: "white" },
  { headline: "See it coming.", parts: ["See it", "coming."], style: "loop", tracking: 1, size: "wide", tone: "gray" },
  { headline: "Find the angle. Set the trajectory.", parts: ["Find the angle.", "Set the", "trajectory."], style: "step", tracking: 3, size: "full", tone: "white" },
  { headline: "Make the story move.", parts: ["Make", "the story", "move."], style: "wave", tracking: 2, size: "medium", tone: "gray" },
  { headline: "Stories that go somewhere.", parts: ["Stories", "that go", "somewhere."], style: "curve", tracking: 1, size: "medium", tone: "white" },
  { headline: "Ahead of the story.", parts: ["Ahead", "of the story."], style: "straight", tracking: 2, size: "wide", tone: "white" },
  { headline: "Where stories gain momentum.", parts: ["Where stories", "gain", "momentum."], style: "loop", tracking: 3, size: "square", tone: "gray" },
  { headline: "Know what's next.", parts: ["Know", "what's next."], style: "step", tracking: 1, size: "square", tone: "white" },
  { headline: "Shape what's next.", parts: ["Shape", "what's next."], style: "curve", tracking: 2, size: "wide", tone: "gray" },
  { headline: "Make what's next known.", parts: ["Make", "what's next", "known."], style: "straight", tracking: 1, size: "full", tone: "white" },
  { headline: "Turn momentum into relevance.", parts: ["Turn momentum", "into", "relevance."], style: "wave", tracking: 3, size: "wide", tone: "gray" },
  { headline: "Move the conversation.", parts: ["Move", "the conversation."], style: "curve", tracking: 0, size: "square", tone: "white" },
  { headline: "The right story. The right trajectory.", parts: ["The right story.", "The right", "trajectory."], style: "step", tracking: 2, size: "full", tone: "gray" },
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function lineEndpoint(from: MeasuredNode, to: MeasuredNode) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const halfWidth = from.width / 2 + 11;
  const halfHeight = from.height / 2 + 8;
  const xScale = Math.abs(unitX) > 0.001 ? halfWidth / Math.abs(unitX) : Number.POSITIVE_INFINITY;
  const yScale = Math.abs(unitY) > 0.001 ? halfHeight / Math.abs(unitY) : Number.POSITIVE_INFINITY;
  const scale = Math.min(xScale, yScale);
  return { x: from.x + unitX * scale, y: from.y + unitY * scale };
}

function drawCornerBox(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
) {
  const left = x - width / 2;
  const top = y - height / 2;
  const right = x + width / 2;
  const bottom = y + height / 2;
  const arm = Math.min(18, Math.min(width, height) * 0.2);
  context.strokeStyle = active ? "#e1fe0e" : "rgba(48, 85, 121, 0.76)";
  context.lineWidth = active ? 1.4 : 0.9;
  context.beginPath();
  context.moveTo(left, top + arm);
  context.lineTo(left, top);
  context.lineTo(left + arm, top);
  context.moveTo(right - arm, top);
  context.lineTo(right, top);
  context.lineTo(right, top + arm);
  context.moveTo(right, bottom - arm);
  context.lineTo(right, bottom);
  context.lineTo(right - arm, bottom);
  context.moveTo(left + arm, bottom);
  context.lineTo(left, bottom);
  context.lineTo(left, bottom - arm);
  context.stroke();

  context.fillStyle = active ? "#e1fe0e" : "#305579";
  const marker = active ? 3.5 : 2.5;
  context.fillRect(left - marker / 2, top - marker / 2, marker, marker);
}

function drawStudyConnector(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  style: ConnectorStyle,
  rhythm: number,
  index: number,
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const normalX = -deltaY / distance;
  const normalY = deltaX / distance;
  const bend = Math.min(64, distance * 0.18) * Math.sin(rhythm * 0.72 + index * 1.38);

  context.beginPath();
  context.moveTo(start.x, start.y);
  if (style === "straight") {
    context.lineTo(end.x, end.y);
  } else if (style === "curve") {
    context.quadraticCurveTo(
      (start.x + end.x) / 2 + normalX * bend,
      (start.y + end.y) / 2 + normalY * bend,
      end.x,
      end.y,
    );
  } else if (style === "wave") {
    const waveCount = 3 + (index % 2);
    const amplitude = Math.min(14, distance * 0.055);
    for (let segment = 1; segment <= 32; segment += 1) {
      const progress = segment / 32;
      const envelope = Math.sin(progress * Math.PI);
      const oscillation = Math.sin(progress * TAU * waveCount + rhythm + index);
      context.lineTo(
        start.x + deltaX * progress + normalX * oscillation * amplitude * envelope,
        start.y + deltaY * progress + normalY * oscillation * amplitude * envelope,
      );
    }
  } else if (style === "step") {
    const split = 0.44 + Math.sin(rhythm * 0.5 + index) * 0.08;
    const elbowX = start.x + deltaX * split;
    context.lineTo(elbowX, start.y);
    context.lineTo(elbowX, end.y);
    context.lineTo(end.x, end.y);
  } else if (style === "coil") {
    const loopCount = 3;
    const radius = Math.min(110, distance / (loopCount * 2.05))
      * (0.96 + Math.sin(rhythm * 0.44 + index) * 0.08);
    const direction = index % 2 === 0 ? 1 : -1;
    const tangentX = deltaX / distance;
    const tangentY = deltaY / distance;
    for (let segment = 1; segment <= loopCount * 48; segment += 1) {
      const progress = segment / (loopCount * 48);
      const phase = progress * TAU * loopCount;
      const along = -Math.sin(phase) * radius;
      const across = (1 - Math.cos(phase)) * radius * direction;
      context.lineTo(
        start.x + deltaX * progress + tangentX * along + normalX * across,
        start.y + deltaY * progress + tangentY * along + normalY * across,
      );
    }
  } else {
    const loop = Math.min(110, distance * 0.34);
    context.bezierCurveTo(
      start.x + deltaX * 0.24 + normalX * loop,
      start.y + deltaY * 0.24 + normalY * loop,
      start.x + deltaX * 0.76 - normalX * loop,
      start.y + deltaY * 0.76 - normalY * loop,
      end.x,
      end.y,
    );
  }
  context.stroke();
}

function HeadlineStudy({
  study,
  index,
}: {
  study: HeadlineStudyDefinition;
  index: number;
}) {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
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
      const bounds = field.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const draw = (now: number) => {
      const elapsed = reducedMotion ? 12.8 + index : Math.max(0, (now - startedAt) / 1000);
      const rhythm = (elapsed / (5.4 + (index % 4) * 0.35)) * TAU + index * 0.41;
      const compact = width < 520;
      const layouts = study.parts.length === 2
        ? [{ x: 0.28, y: 0.34 }, { x: 0.7, y: 0.67 }]
        : [{ x: 0.23, y: 0.27 }, { x: 0.73, y: 0.34 }, { x: 0.43, y: 0.72 }];
      const longestPart = Math.max(...study.parts.map((part) => part.length));
      const maxType = study.size === "full" ? 96 : study.size === "wide" ? 76 : 64;
      const baseFontSize = clamp(
        Math.min(width / Math.max(7, longestPart * 0.62), height * (study.parts.length === 2 ? 0.19 : 0.16)),
        compact ? 24 : 30,
        compact ? 52 : maxType,
      );

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      const nodes = study.parts.map((part, nodeIndex): MeasuredNode & { text: string; fontSize: number; cadence: number } => {
        const layout = layouts[nodeIndex];
        const cadence = rhythm + nodeIndex * 1.87;
        const fontSize = baseFontSize * (1 + Math.sin(cadence * 0.9) * 0.018);
        const x = layout.x * width + Math.sin(cadence) * width * (0.012 + (nodeIndex % 2) * 0.004);
        const y = layout.y * height + Math.cos(cadence * 0.92) * height * (0.018 + (nodeIndex % 2) * 0.005);
        context.font = `400 ${fontSize}px ${FONT_FAMILY}`;
        return {
          text: part,
          x,
          y,
          fontSize,
          cadence,
          width: context.measureText(part).width,
          height: fontSize * 0.78,
        };
      });

      const connectionPairs = nodes.length === 2 ? [[0, 1]] : [[0, 1], [1, 2], [2, 0]];
      context.strokeStyle = "rgba(0, 0, 0, 0.72)";
      context.lineWidth = study.style === "wave" || study.style === "coil" ? 0.9 : 0.75;
      context.lineJoin = "round";
      context.lineCap = "round";
      connectionPairs.forEach(([fromIndex, toIndex], connectionIndex) => {
        const from = nodes[fromIndex];
        const to = nodes[toIndex];
        drawStudyConnector(
          context,
          lineEndpoint(from, to),
          lineEndpoint(to, from),
          study.style,
          rhythm,
          connectionIndex,
        );
      });

      context.textAlign = "center";
      context.textBaseline = "middle";
      nodes.forEach((node) => {
        context.font = `400 ${node.fontSize}px ${FONT_FAMILY}`;
        context.fillStyle = "#000000";
        context.fillText(node.text, node.x, node.y);
      });

      const activeTrack = study.tracking > 0 ? Math.floor(elapsed / 4.1) % study.tracking : -1;
      for (let trackIndex = 0; trackIndex < study.tracking; trackIndex += 1) {
        const flashTime = (elapsed + index * 0.38 + trackIndex * 1.47) % 4.9;
        const flashVisible = reducedMotion
          || flashTime < 1.18
          || (flashTime > 2.34 && flashTime < 2.52)
          || (flashTime > 3.12 && flashTime < 3.24);
        if (!flashVisible) continue;

        const node = nodes[(trackIndex * 2 + index) % nodes.length];
        const possibleStarts = Math.max(1, node.text.length - 2);
        let fragmentStart = (index + trackIndex * 3) % possibleStarts;
        while (node.text[fragmentStart] === " " && fragmentStart < node.text.length - 1) fragmentStart += 1;
        const fragmentLength = Math.max(1, Math.min(node.text.length - fragmentStart, Math.ceil(node.text.length * 0.36)));
        const prefix = node.text.slice(0, fragmentStart);
        const fragment = node.text.slice(fragmentStart, fragmentStart + fragmentLength);
        context.font = `400 ${node.fontSize}px ${FONT_FAMILY}`;
        const prefixWidth = context.measureText(prefix).width;
        const fragmentWidth = context.measureText(fragment).width;
        const fragmentX = node.x - node.width / 2 + prefixWidth + fragmentWidth / 2;
        const fragmentY = node.y;
        const boxWidth = fragmentWidth + (compact ? 9 : 14);
        const boxHeight = node.fontSize * 0.92;
        const active = trackIndex === activeTrack;
        drawCornerBox(context, fragmentX, fragmentY, boxWidth, boxHeight, active);

        const telemetryX = clamp(fragmentX - boxWidth / 2, 10, width - 112);
        const telemetryY = trackIndex % 2 === 0
          ? clamp(fragmentY - boxHeight / 2 - 27, 11, height - 28)
          : clamp(fragmentY + boxHeight / 2 + 7, 11, height - 28);
        context.font = `650 ${compact ? 6.5 : 8}px ${FONT_FAMILY}`;
        context.textAlign = "left";
        context.textBaseline = "top";
        if (active) {
          context.fillStyle = "#e1fe0e";
          context.fillRect(telemetryX - 3, telemetryY - 2, compact ? 78 : 98, compact ? 10 : 12);
          context.fillStyle = "#000000";
        } else {
          context.fillStyle = "#305579";
        }
        context.fillText(
          `B-${String(index + 1).padStart(2, "0")}${trackIndex}  C${90 + ((index + trackIndex) % 9)}  X${String(Math.round((fragmentX / width) * 99)).padStart(2, "0")} Y${String(Math.round((fragmentY / height) * 99)).padStart(2, "0")}`,
          telemetryX,
          telemetryY,
        );
      }

      context.fillStyle = "#305579";
      context.font = `650 ${compact ? 6.5 : 8}px ${FONT_FAMILY}`;
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(
        `S.${String(index + 1).padStart(2, "0")} / ${study.style.toUpperCase()} / ${study.parts.length}N / ${study.tracking}T`,
        14,
        13,
      );

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
      } else if (!nextVisible) {
        visible = false;
        window.cancelAnimationFrame(animationFrame);
      }
    }, { rootMargin: "140px" });

    resizeObserver.observe(field);
    intersectionObserver.observe(field);
    resize();
    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [index, study]);

  return (
    <section
      ref={fieldRef}
      className={`syntax-study syntax-study--${study.size}`}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${study.headline} Animated ${study.style} connector study with ${study.tracking} text-tracking acquisitions`}
      />
    </section>
  );
}

export function SyntaxField() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = window.performance.now();
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
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(field);
    resize();

    const render = (now: number) => {
      const elapsed = reducedMotion ? 18.6 : Math.max(0, (now - startedAt) / 1000);
      const rhythm = (elapsed / 6.4) * TAU;
      const compact = width < 680;
      const typographyScale = Math.min(width, height * 1.55);

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      const positionedWords: PositionedWord[] = WORDS.map((word) => {
        const cadence = rhythm + word.phase;
        const x = word.x * width + Math.sin(cadence) * word.travelX * width + Math.sin(cadence * 2.1) * word.travelX * width * 0.18;
        const y = word.y * height + Math.cos(cadence * 0.94) * word.travelY * height + Math.sin(cadence * 1.87) * word.travelY * height * 0.16;
        const fontSize = clamp(typographyScale * word.size * (1 + Math.sin(cadence) * 0.018), compact ? 25 : 34, compact ? 58 : 104);
        context.font = `${word.weight} ${fontSize}px ${FONT_FAMILY}`;
        return {
          ...word,
          x,
          y,
          cadence,
          fontSize,
          width: context.measureText(word.text).width,
          height: fontSize * 0.78,
        };
      });

      // The semantic network remains behind the moving word forms.
      context.strokeStyle = "rgba(0, 0, 0, 0.72)";
      context.lineWidth = 0.8;
      CONNECTIONS.forEach(([fromIndex, toIndex], connectionIndex) => {
        const from = positionedWords[fromIndex];
        const to = positionedWords[toIndex];
        const start = lineEndpoint(from, to);
        const end = lineEndpoint(to, from);
        context.beginPath();
        context.moveTo(start.x, start.y);
        if (connectionIndex % 4 === 0) {
          const midpointX = (start.x + end.x) / 2;
          const midpointY = (start.y + end.y) / 2 + Math.sin(rhythm + connectionIndex) * 5;
          context.quadraticCurveTo(midpointX, midpointY, end.x, end.y);
        } else {
          context.lineTo(end.x, end.y);
        }
        context.stroke();
      });

      // Basel Classic word nodes.
      context.textAlign = "center";
      context.textBaseline = "middle";
      positionedWords.forEach((word) => {
        context.font = `${word.weight} ${word.fontSize}px ${FONT_FAMILY}`;
        context.fillStyle = "#000000";
        context.fillText(word.text, word.x, word.y);
      });

      // Optical blob acquisition tracks moving letter clusters, not separate shapes.
      const activeTarget = Math.floor(elapsed / 4.8) % TEXT_TARGETS.length;
      TEXT_TARGETS.forEach((target, index) => {
        const flashTime = (elapsed + target.phase) % 4.6;
        const visible = reducedMotion
          || flashTime < 1.3
          || (flashTime > 2.15 && flashTime < 2.38)
          || (flashTime > 2.55 && flashTime < 2.7);
        if (!visible) return;

        const word = positionedWords[target.wordIndex];
        const prefix = word.text.slice(0, target.start);
        const fragment = word.text.slice(target.start, target.start + target.length);
        context.font = `${word.weight} ${word.fontSize}px ${FONT_FAMILY}`;
        const prefixWidth = context.measureText(prefix).width;
        const fragmentWidth = context.measureText(fragment).width;
        const fragmentX = word.x - word.width / 2 + prefixWidth + fragmentWidth / 2;
        const fragmentY = word.y;
        const boxWidth = fragmentWidth + (compact ? 10 : 16);
        const boxHeight = word.fontSize * 0.94;
        const active = index === activeTarget;
        drawCornerBox(context, fragmentX, fragmentY, boxWidth, boxHeight, active);

        const left = fragmentX - boxWidth / 2;
        const top = fragmentY - boxHeight / 2;
        const dataX = clamp(left, 8, width - 126);
        const dataY = index % 2 === 0
          ? clamp(top - (compact ? 36 : 44), 12, height - 55)
          : clamp(fragmentY + boxHeight / 2 + 7, 12, height - 55);
        const cycleSpeed = TAU / 6.4;
        const velocityX = Math.cos(word.cadence) * word.travelX * width * cycleSpeed;
        const velocityY = -Math.sin(word.cadence * 0.94) * word.travelY * height * cycleSpeed * 0.94;
        context.textAlign = "left";
        context.textBaseline = "top";
        context.font = `650 ${compact ? 7 : 9}px ${FONT_FAMILY}`;
        context.fillStyle = active ? "#000000" : "#305579";
        if (active) {
          context.fillStyle = "#e1fe0e";
          context.fillRect(dataX - 4, dataY - 3, compact ? 88 : 108, compact ? 30 : 38);
          context.fillStyle = "#000000";
        }
        context.fillText(`${target.id}  CONF ${Math.round(target.confidence * 100)}`, dataX, dataY);
        context.fillText(`VX ${velocityX >= 0 ? "+" : ""}${velocityX.toFixed(2)}  VY ${velocityY >= 0 ? "+" : ""}${velocityY.toFixed(2)}`, dataX, dataY + (compact ? 10 : 13));
        context.fillText(`X ${String(Math.round((fragmentX / width) * 999)).padStart(3, "0")}  Y ${String(Math.round((fragmentY / height) * 999)).padStart(3, "0")}`, dataX, dataY + (compact ? 20 : 26));
      });

      // Fixed field registration marks.
      context.strokeStyle = "rgba(48, 85, 121, 0.48)";
      context.fillStyle = "#305579";
      context.lineWidth = 0.8;
      [
        { x: 18, y: 18 },
        { x: width - 18, y: 18 },
        { x: width - 18, y: height - 18 },
        { x: 18, y: height - 18 },
      ].forEach((mark) => {
        context.beginPath();
        context.arc(mark.x, mark.y, 3, 0, TAU);
        context.stroke();
        context.fillRect(mark.x - 0.5, mark.y - 7, 1, 14);
        context.fillRect(mark.x - 7, mark.y - 0.5, 14, 1);
      });

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="syntax-shell">
      <SiteNavigation active="syntax" />
      <section ref={fieldRef} className="syntax-field">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Rhythmic field of three Basel Classic words connected by live lines with flashing letter-cluster tracking boxes and acquisition telemetry"
        />
      </section>
      <div className="syntax-studies">
        {HEADLINE_STUDIES.map((study, index) => (
          <HeadlineStudy
            key={study.headline}
            study={study}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

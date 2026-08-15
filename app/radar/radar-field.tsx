"use client";

import { useEffect, useRef } from "react";
import type P5 from "p5";
import { SiteNavigation } from "../site-navigation";

const NAV_HEIGHT = 60;

type Track = {
  x: number;
  y: number;
  id: string;
  code: string;
  period: number;
  phase: number;
};

const tracks: Track[] = [
  { x: 522, y: 286, id: "trk.01", code: "F-15", period: 2.8, phase: 0.15 },
  { x: 140, y: 344, id: "trk.02", code: "F/A-18", period: 3.6, phase: 1.2 },
  { x: 86, y: 421, id: "trk.05", code: "C-32", period: 4.1, phase: 2.05 },
  { x: 258, y: 430, id: "trk.03", code: "B-2A", period: 3.1, phase: 0.82 },
  { x: 512, y: 483, id: "trk.04", code: "A-10C", period: 3.9, phase: 2.72 },
];

export function RadarField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let instance: P5 | undefined;
    let active = true;

    void import("p5").then(({ default: P5Constructor }) => {
      if (!active || !hostRef.current) return;

      instance = new P5Constructor((p: P5) => {
        const ink = "#000000";
        const navy = "#305579";
        const powder = "#bcd4e4";
        const offWhite = "#f5f5f5";
        const white = "#ffffff";
        const signal = "#e1fe0e";
        let reducedMotion = false;

        const viewportHeight = () => Math.max(320, window.innerHeight - NAV_HEIGHT);
        const wrap = (value: number) => ((value % 360) + 360) % 360;
        const padHeading = (value: number) => Math.round(wrap(value)).toString().padStart(3, "0");

        const lineDash = (pattern: number[]) => {
          const context = p.drawingContext as CanvasRenderingContext2D;
          context.setLineDash(pattern);
        };

        const drawTopReadout = (heading: number, t: number) => {
          p.push();
          p.noStroke();
          p.fill(ink);
          p.textFont("monospace");
          p.textStyle(p.NORMAL);

          p.textAlign(p.LEFT, p.TOP);
          p.textSize(15);
          p.text("LF 7.2", 33, 32);
          p.textSize(7);
          p.fill(navy);
          p.text(`STL ${String(274 + Math.round(Math.sin(t * 0.4))).padStart(3, "0")}`, 33, 54);
          p.text(`${153 + Math.round(Math.sin(t * 0.17) * 2)}° / 32`, 33, 67);

          p.textAlign(p.RIGHT, p.TOP);
          p.fill(ink);
          p.textSize(15);
          p.text("RF 8.6", 607, 32);
          p.textSize(7);
          p.fill(navy);
          p.text(`STL ${168 + Math.round(Math.cos(t * 0.31))}`, 607, 54);
          p.text(`${126 + Math.round(Math.sin(t * 0.22) * 2)}° / 20`, 607, 67);

          p.textAlign(p.CENTER, p.TOP);
          p.fill(navy);
          p.textSize(20);
          p.text("APC", 237, 38);
          p.text("LDS", 403, 38);

          p.noFill();
          p.stroke(navy);
          p.strokeWeight(1);
          p.rectMode(p.CENTER);
          p.rect(320, 45, 70, 33);
          p.line(310, 62, 320, 70);
          p.line(320, 70, 330, 62);
          p.noStroke();
          p.fill(ink);
          p.textSize(28);
          p.text(padHeading(heading), 320, 30);
          p.pop();
        };

        const drawBearingArc = (t: number) => {
          const cx = 320;
          const cy = 640;
          const radius = 520;
          const startDegree = -128;
          const endDegree = -52;

          p.push();
          p.noFill();
          p.stroke(navy);
          p.strokeWeight(1.2);
          p.arc(cx, cy, radius * 2, radius * 2, p.radians(startDegree), p.radians(endDegree));

          for (let degree = startDegree; degree <= endDegree; degree += 2) {
            const angle = p.radians(degree);
            const major = (degree + 130) % 10 === 0;
            const medium = degree % 5 === 0;
            const length = major ? 16 : medium ? 10 : 7;
            const inner = radius - length;
            p.stroke(major ? navy : powder);
            p.strokeWeight(major ? 1.3 : 1);
            p.line(
              cx + Math.cos(angle) * inner,
              cy + Math.sin(angle) * inner,
              cx + Math.cos(angle) * radius,
              cy + Math.sin(angle) * radius,
            );
          }

          p.stroke(powder);
          p.strokeWeight(1);
          lineDash([1.5, 8]);
          p.arc(cx, cy, (radius - 46) * 2, (radius - 46) * 2, p.radians(-116), p.radians(-64));
          lineDash([]);

          const scanAngle = p.radians(-116 + ((t * 7.5) % 52));
          const scanRadius = radius - 46;
          p.noStroke();
          p.fill(signal);
          p.circle(cx + Math.cos(scanAngle) * scanRadius, cy + Math.sin(scanAngle) * scanRadius, 7);

          p.stroke(ink);
          p.strokeWeight(1.2);
          p.fill(signal);
          p.triangle(320, 116, 315, 125, 325, 125);
          p.pop();

          p.push();
          p.noStroke();
          p.fill(navy);
          p.textFont("monospace");
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(7);
          p.text("23.12", 320, 148);
          p.text("24.96", 130, 187);
          p.text("23.32", 510, 187);
          p.pop();
        };

        const drawRotor = (t: number) => {
          const angle = t * 0.48;
          const radius = 154;

          p.push();
          p.translate(320, 294);
          p.rotate(angle);
          p.noFill();
          p.stroke(navy);
          p.strokeWeight(1.15);

          lineDash([4, 3]);
          p.arc(0, 0, radius * 2, radius * 2, -Math.PI * 0.52, Math.PI * 0.92);
          lineDash([]);

          for (let index = 0; index < 3; index += 1) {
            const armAngle = -Math.PI / 2 + index * (Math.PI * 2 / 3);
            const joint = 43;
            const outer = 153;
            const x1 = Math.cos(armAngle) * joint;
            const y1 = Math.sin(armAngle) * joint;
            const x2 = Math.cos(armAngle) * outer;
            const y2 = Math.sin(armAngle) * outer;
            const bendX = Math.cos(armAngle + 0.12) * 60;
            const bendY = Math.sin(armAngle + 0.12) * 60;
            p.line(x1, y1, bendX, bendY);
            p.line(bendX, bendY, x2, y2);
            p.noStroke();
            p.fill(index === 0 ? signal : navy);
            p.circle(x2, y2, index === 0 ? 6 : 4);
            p.noFill();
            p.stroke(navy);
          }

          p.stroke(powder);
          p.circle(0, 0, 82);
          p.circle(0, 0, 18);
          p.stroke(navy);
          p.line(-56, 0, 56, 0);
          p.line(0, -56, 0, 56);
          p.pop();
        };

        const drawFixedSight = (t: number) => {
          p.push();
          p.stroke(ink);
          p.strokeWeight(1.1);
          p.line(320, 166, 320, 527);
          p.line(299, 198, 299, 294);
          p.line(341, 198, 341, 294);
          p.stroke(powder);
          p.line(265, 264, 375, 264);

          p.noStroke();
          p.fill(ink);
          p.triangle(320, 540, 310, 553, 330, 553);

          const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
          p.fill(navy + Math.round(70 + pulse * 150).toString(16).padStart(2, "0"));
          p.circle(320, 294, 5 + pulse * 2);
          p.pop();
        };

        const trackIsActive = (track: Track, t: number, index: number) => {
          if (reducedMotion) return index === 3;
          const phase = (t + track.phase) % track.period;
          const sequence = t * 1.25;
          const sequencedBurst = Math.floor(sequence) % tracks.length === index && sequence % 1 < 0.58;
          const localBurst = phase < 0.28 || (index % 2 === 0 && phase > 0.5 && phase < 0.68);
          return sequencedBurst || localBurst;
        };

        const drawTrack = (track: Track, t: number, index: number) => {
          const isActive = trackIsActive(track, t, index);
          const size = 25;

          p.push();
          p.translate(track.x, track.y);
          p.rectMode(p.CENTER);
          p.stroke(isActive ? ink : navy);
          p.strokeWeight(isActive ? 1.5 : 0.8);
          p.fill(isActive ? signal : offWhite);
          p.rect(0, 0, size, size);
          p.noFill();
          p.stroke(isActive ? navy : powder);
          p.rect(0, 0, 12, 12);
          p.line(-12, -12, -7, -12);
          p.line(-12, -12, -12, -7);
          p.line(12, 12, 7, 12);
          p.line(12, 12, 12, 7);

          if (isActive) {
            p.stroke(ink);
            p.line(-17, 0, -12, 0);
            p.line(12, 0, 17, 0);
            p.line(0, -17, 0, -12);
            p.line(0, 12, 0, 17);
          }

          p.noStroke();
          p.fill(navy);
          p.textFont("monospace");
          p.textAlign(p.CENTER, p.BOTTOM);
          p.textSize(7);
          p.text(track.id, 0, -17);
          p.textAlign(p.CENTER, p.TOP);
          p.text(track.code, 0, 17);
          p.pop();
        };

        const drawMicroTargets = (t: number) => {
          const pips = [
            [246, 264, 0],
            [275, 244, 1],
            [365, 244, 2],
            [394, 264, 3],
          ];

          p.push();
          p.rectMode(p.CENTER);
          p.noFill();
          p.stroke(powder);
          p.strokeWeight(1);
          pips.forEach(([x, y, phase]) => {
            const active = !reducedMotion && Math.sin(t * 2.2 + phase * 1.4) > 0.88;
            p.fill(active ? signal : offWhite);
            p.stroke(active ? navy : powder);
            p.rect(x, y, 7, 7);
            p.noFill();
            p.circle(x, y, 2);
          });
          p.pop();
        };

        const drawBottomTelemetry = (t: number) => {
          p.push();
          p.noStroke();
          p.fill(navy);
          p.textFont("monospace");
          p.textSize(7);
          p.textAlign(p.LEFT, p.TOP);
          p.text("ALR 1a", 33, 585);
          p.text(`Set: usr_${String(5 + Math.round(Math.sin(t * 0.23))).padStart(2, "0")}`, 33, 600);
          p.textAlign(p.CENTER, p.TOP);
          p.text(":: TARGET RANGE CLEAR ::", 320, 600);
          p.textAlign(p.RIGHT, p.TOP);
          p.text("ALR 1a", 607, 585);
          p.text(`Rlx: pro_sec_${String(4 + Math.round(Math.cos(t * 0.19))).padStart(2, "0")}`, 607, 600);

          const barCount = 15;
          p.stroke(powder);
          for (let index = 0; index < barCount; index += 1) {
            const height = 2 + ((index + Math.floor(t * 5)) % 5);
            p.line(294 + index * 4, 620, 294 + index * 4, 620 - height);
          }
          p.pop();
        };

        p.setup = () => {
          const canvas = p.createCanvas(window.innerWidth, viewportHeight());
          canvas.parent(hostRef.current!);
          canvas.elt.setAttribute("role", "img");
          canvas.elt.setAttribute(
            "aria-label",
            "Animated mechanical aircraft radar with a spinning radial dial, flashing target boxes, bearing ticks, and live telemetry",
          );
          p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
          p.frameRate(60);
          p.strokeCap(p.SQUARE);
          p.strokeJoin(p.MITER);
          reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        };

        p.draw = () => {
          const t = reducedMotion ? 14.2 : p.millis() / 1000;
          const heading = 342 + t * 2.2 + Math.sin(t * 0.17) * 3;
          const scale = Math.min(p.width, p.height) / 640;
          const offsetX = (p.width - 640 * scale) / 2;
          const offsetY = (p.height - 640 * scale) / 2;
          const vibrationX = reducedMotion ? 0 : (p.noise(200 + t * 6) - 0.5) * 0.45;
          const vibrationY = reducedMotion ? 0 : (p.noise(400 + t * 6.4) - 0.5) * 0.45;

          p.background(offWhite);
          p.push();
          p.translate(offsetX + vibrationX, offsetY + vibrationY);
          p.scale(scale);

          p.noFill();
          p.stroke(white);
          p.strokeWeight(1);
          for (let x = 80; x < 640; x += 80) p.line(x, 0, x, 640);
          for (let y = 80; y < 640; y += 80) p.line(0, y, 640, y);

          drawTopReadout(heading, t);
          drawBearingArc(t);
          drawRotor(t);
          drawFixedSight(t);
          tracks.forEach((track, index) => drawTrack(track, t, index));
          drawMicroTargets(t);
          drawBottomTelemetry(t);
          p.pop();
        };

        p.windowResized = () => {
          p.resizeCanvas(window.innerWidth, viewportHeight());
        };
      }, hostRef.current);
    });

    return () => {
      active = false;
      instance?.remove();
    };
  }, []);

  return (
    <div className="radar-shell">
      <SiteNavigation active="radar" />
      <div ref={hostRef} className="radar-field" />
    </div>
  );
}

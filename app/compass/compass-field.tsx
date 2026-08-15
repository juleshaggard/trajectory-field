"use client";

import { useEffect, useRef } from "react";
import type P5 from "p5";
import { SiteNavigation } from "../site-navigation";

const NAV_HEIGHT = 60;

export function CompassField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let instance: P5 | undefined;
    let active = true;

    void import("p5").then(({ default: P5Constructor }) => {
      if (!active || !hostRef.current) return;

      instance = new P5Constructor((p: P5) => {
        const ink = "#11161a";
        const navy = "#305579";
        const powder = "#bcd4e4";
        const gray = "#e4e4e4";
        const offWhite = "#f5f5f5";
        const white = "#ffffff";
        const signal = "#e1fe0e";
        let reducedMotion = false;

        const viewportHeight = () => Math.max(620, window.innerHeight - NAV_HEIGHT);
        const wrapHeading = (value: number) => ((value % 360) + 360) % 360;
        const padHeading = (value: number) => Math.round(wrapHeading(value)).toString().padStart(3, "0");

        const drawBackgroundGrid = () => {
          p.push();
          p.stroke(gray);
          p.strokeWeight(1);
          const step = p.width < 720 ? 48 : 64;
          for (let x = step; x < p.width; x += step) p.line(x, 0, x, p.height);
          for (let y = step; y < p.height; y += step) p.line(0, y, p.width, y);
          p.stroke(powder);
          p.line(p.width * 0.5, 0, p.width * 0.5, p.height);
          p.line(0, p.height * 0.5, p.width, p.height * 0.5);
          p.pop();
        };

        const drawTelemetry = (
          heading: number,
          speed: number,
          altitude: number,
          verticalSpeed: number,
        ) => {
          const edge = p.width < 720 ? 18 : 32;
          const compact = p.width < 720;
          p.push();
          p.fill(navy);
          p.noStroke();
          p.textFont("monospace");

          p.textAlign(p.LEFT, p.TOP);
          p.textSize(compact ? 9 : 11);
          p.textStyle(p.BOLD);
          p.text("HDG / MAG", edge, edge);
          p.textSize(compact ? 24 : 38);
          p.text(`${padHeading(heading)}°`, edge, edge + (compact ? 15 : 18));

          p.textAlign(p.RIGHT, p.TOP);
          p.textSize(compact ? 9 : 11);
          p.text("ALT / FT", p.width - edge, edge);
          p.textSize(compact ? 24 : 38);
          p.text(Math.round(altitude).toLocaleString("en-US"), p.width - edge, edge + (compact ? 15 : 18));

          p.textAlign(p.LEFT, p.BOTTOM);
          p.textSize(compact ? 9 : 11);
          p.text("SPD / KT", edge, p.height - edge - (compact ? 28 : 42));
          p.textSize(compact ? 24 : 38);
          p.text(speed.toFixed(1), edge, p.height - edge);

          p.textAlign(p.RIGHT, p.BOTTOM);
          p.textSize(compact ? 9 : 11);
          p.text("V/S / FPM", p.width - edge, p.height - edge - (compact ? 28 : 42));
          p.textSize(compact ? 24 : 38);
          const direction = verticalSpeed >= 0 ? "+" : "−";
          p.text(`${direction}${Math.abs(Math.round(verticalSpeed))}`, p.width - edge, p.height - edge);
          p.pop();
        };

        const drawCompassRose = (
          cx: number,
          cy: number,
          radius: number,
          heading: number,
          bank: number,
        ) => {
          p.push();
          p.translate(cx, cy);
          p.rotate((bank * Math.PI) / 180);
          p.textFont("monospace");
          p.textAlign(p.CENTER, p.CENTER);

          p.noFill();
          p.stroke(powder);
          p.strokeWeight(1);
          p.circle(0, 0, radius * 2);
          p.circle(0, 0, radius * 1.58);

          for (let degree = 0; degree < 360; degree += 2) {
            const relative = ((degree - heading - 90) * Math.PI) / 180;
            const major = degree % 30 === 0;
            const medium = degree % 10 === 0;
            const innerRadius = radius - (major ? 22 : medium ? 14 : 7);
            const x1 = Math.cos(relative) * innerRadius;
            const y1 = Math.sin(relative) * innerRadius;
            const x2 = Math.cos(relative) * radius;
            const y2 = Math.sin(relative) * radius;

            p.stroke(major ? navy : medium ? navy + "b8" : powder);
            p.strokeWeight(major ? 3 : medium ? 2 : 1);
            p.line(x1, y1, x2, y2);

            if (major) {
              const cardinal: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };
              const label = cardinal[degree] ?? String(degree / 10).padStart(2, "0");
              const labelRadius = radius - (degree % 90 === 0 ? 48 : 42);
              p.push();
              p.translate(Math.cos(relative) * labelRadius, Math.sin(relative) * labelRadius);
              p.rotate(relative + Math.PI / 2);
              p.noStroke();
              p.fill(degree % 90 === 0 ? ink : navy);
              p.textStyle(p.BOLD);
              p.textSize(degree % 90 === 0 ? Math.max(18, radius * 0.075) : Math.max(10, radius * 0.038));
              p.text(label, 0, 0);
              p.pop();
            }
          }

          p.pop();
        };

        const drawPitchLadder = (
          cx: number,
          cy: number,
          radius: number,
          pitch: number,
          bank: number,
        ) => {
          p.push();
          p.translate(cx, cy + pitch * radius * 0.028);
          p.rotate((bank * Math.PI) / 180);
          p.textFont("monospace");
          p.textSize(Math.max(9, radius * 0.03));
          p.textStyle(p.BOLD);
          p.stroke(navy);
          p.fill(navy);
          p.strokeWeight(1.5);

          for (let value = -20; value <= 20; value += 5) {
            if (value === 0) continue;
            const y = -value * radius * 0.018;
            const width = value % 10 === 0 ? radius * 0.21 : radius * 0.13;
            p.line(-width, y, -radius * 0.04, y);
            p.line(radius * 0.04, y, width, y);
            p.noStroke();
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(Math.abs(value), -width - 7, y);
            p.textAlign(p.LEFT, p.CENTER);
            p.text(Math.abs(value), width + 7, y);
            p.stroke(navy);
          }
          p.pop();
        };

        const drawAircraftReticle = (cx: number, cy: number, radius: number, t: number) => {
          p.push();
          p.translate(cx, cy);
          p.stroke(ink);
          p.strokeWeight(Math.max(2, radius * 0.008));
          p.noFill();
          p.line(-radius * 0.22, 0, -radius * 0.055, 0);
          p.line(radius * 0.055, 0, radius * 0.22, 0);
          p.line(-radius * 0.055, 0, 0, radius * 0.035);
          p.line(0, radius * 0.035, radius * 0.055, 0);
          p.circle(0, 0, radius * 0.045);

          const vectorX = Math.sin(t * 0.19) * radius * 0.14;
          const vectorY = Math.cos(t * 0.13) * radius * 0.07;
          p.stroke(navy);
          p.strokeWeight(1.5);
          p.line(0, 0, vectorX, vectorY);
          p.fill(signal);
          p.stroke(ink);
          p.circle(vectorX, vectorY, Math.max(8, radius * 0.035));
          p.pop();
        };

        const drawHeadingBug = (cx: number, cy: number, radius: number, bank: number) => {
          const bankOffset = Math.sin((bank * Math.PI) / 180) * radius;
          p.push();
          p.translate(cx - bankOffset, cy - radius - 4);
          p.fill(signal);
          p.stroke(ink);
          p.strokeWeight(2);
          p.triangle(0, 16, -10, -2, 10, -2);
          p.pop();
        };

        p.setup = () => {
          const canvas = p.createCanvas(window.innerWidth, viewportHeight());
          canvas.parent(hostRef.current!);
          canvas.elt.setAttribute("role", "img");
          canvas.elt.setAttribute(
            "aria-label",
            "Animated aircraft compass with heading, pitch, bank, speed, altitude, and vertical speed",
          );
          p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
          p.frameRate(60);
          p.strokeCap(p.ROUND);
          p.strokeJoin(p.ROUND);
          reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        };

        p.draw = () => {
          const t = reducedMotion ? 18 : p.millis() / 1000;
          const heading = wrapHeading(172 + t * 0.72 + Math.sin(t * 0.17) * 13 + (p.noise(t * 0.035) - 0.5) * 16);
          const bank = Math.sin(t * 0.31) * 5.5 + Math.sin(t * 0.11) * 2.5;
          const pitch = Math.sin(t * 0.21) * 3.2 + (p.noise(100 + t * 0.08) - 0.5) * 2;
          const speed = 412.6 + Math.sin(t * 0.41) * 4.2 + (p.noise(200 + t * 0.16) - 0.5) * 2.4;
          const altitude = 31642 + Math.sin(t * 0.12) * 34 + (p.noise(300 + t * 0.05) - 0.5) * 18;
          const verticalSpeed = Math.sin(t * 0.23) * 438 + Math.sin(t * 0.51) * 72;

          p.background(offWhite);
          drawBackgroundGrid();

          const compact = p.width < 720;
          const cx = p.width * 0.5;
          const cy = compact ? p.height * 0.51 : p.height * 0.52;
          const radius = Math.min(p.width * (compact ? 0.41 : 0.29), p.height * (compact ? 0.31 : 0.39), 430);
          const vibrationX = reducedMotion ? 0 : (p.noise(400 + t * 4.8) - 0.5) * 1.2;
          const vibrationY = reducedMotion ? 0 : (p.noise(500 + t * 5.1) - 0.5) * 1.2;

          p.push();
          p.translate(vibrationX, vibrationY);
          drawCompassRose(cx, cy, radius, heading, bank);
          drawPitchLadder(cx, cy, radius, pitch, bank);
          drawAircraftReticle(cx, cy, radius, t);
          drawHeadingBug(cx, cy, radius, bank);
          p.pop();

          drawTelemetry(heading, speed, altitude, verticalSpeed);

          p.push();
          p.noStroke();
          p.fill(navy);
          p.textFont("monospace");
          p.textSize(compact ? 9 : 10);
          p.textStyle(p.BOLD);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(`BANK ${bank >= 0 ? "+" : "−"}${Math.abs(bank).toFixed(1)}°  /  PITCH ${pitch >= 0 ? "+" : "−"}${Math.abs(pitch).toFixed(1)}°`, cx, p.height - 18);
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
    <div className="compass-shell">
      <SiteNavigation active="compass" />
      <div ref={hostRef} className="compass-field" />
    </div>
  );
}

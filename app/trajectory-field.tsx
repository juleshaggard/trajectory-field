"use client";

import { useEffect, useRef } from "react";
import type P5 from "p5";

type PanelTone = "black" | "powder" | "gray" | "offwhite" | "white" | "split";
type Rect = { x: number; y: number; w: number; h: number; tone?: PanelTone };
type Point = { x: number; y: number; vx?: number; vy?: number };

const TAU = Math.PI * 2;

export function TrajectoryField() {
  const hostRef = useRef<HTMLDivElement>(null);

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

        const paletteBands = [
          { color: black, weight: 9.03 },
          { color: navy, weight: 4.85 },
          { color: powder, weight: 19.53 },
          { color: gray, weight: 9.71 },
          { color: offWhite, weight: 9.71 },
          { color: white, weight: 41.65 },
          { color: signal, weight: 4.74 },
        ];

        let phase = 0;
        let impact = { x: -100, y: -100, born: -10 };
        let reducedMotion = false;

        const targetHeight = () => {
          const width = window.innerWidth;
          if (width < 680) {
            const gap = 10;
            const panelHeight = Math.max(250, width * 0.74);
            return Math.round(gap * 7 + panelHeight * 6);
          }
          return Math.max(window.innerHeight, 680);
        };

        const panels = (): Rect[] => {
          const gap = p.width < 680 ? 10 : 12;
          const edge = gap;

          if (p.width < 680) {
            const h = (p.height - gap * 7) / 6;
            return Array.from({ length: 6 }, (_, i) => ({
              x: edge,
              y: edge + i * (h + gap),
              w: p.width - edge * 2,
              h,
              tone: (["white", "powder", "gray", "offwhite", "black", "split"] as PanelTone[])[i],
            }));
          }

          const usableW = p.width - edge * 2;
          const usableH = p.height - edge * 2;
          const topH = usableH * 0.55 - gap * 0.5;
          const bottomH = usableH - topH - gap;
          const halfW = usableW * 0.5 - gap * 0.5;
          const quarterW = (usableW - gap * 3) * 0.25;

          return [
            { x: edge, y: edge, w: halfW, h: topH, tone: "white" },
            { x: edge + halfW + gap, y: edge, w: quarterW, h: topH, tone: "powder" },
            {
              x: edge + halfW + gap + quarterW + gap,
              y: edge,
              w: quarterW,
              h: topH,
              tone: "gray",
            },
            { x: edge, y: edge + topH + gap, w: quarterW, h: bottomH, tone: "offwhite" },
            {
              x: edge + quarterW + gap,
              y: edge + topH + gap,
              w: quarterW,
              h: bottomH,
              tone: "black",
            },
            {
              x: edge + (quarterW + gap) * 2,
              y: edge + topH + gap,
              w: halfW,
              h: bottomH,
              tone: "split",
            },
          ];
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
          const toneColors: Record<Exclude<PanelTone, "split">, string> = {
            black,
            powder,
            gray,
            offwhite: offWhite,
            white,
          };
          p.noStroke();
          p.fill(rect.tone === "split" ? white : toneColors[rect.tone ?? "white"]);
          p.rect(rect.x, rect.y, rect.w, rect.h, Math.min(18, rect.w * 0.05));

          if (rect.tone === "split") {
            roundedClip(rect, () => {
              p.noStroke();
              p.fill(powder);
              p.rect(rect.x + rect.w * 0.6, rect.y, rect.w * 0.4, rect.h);
            });
          }

          roundedClip(rect, () => {
            const total = paletteBands.reduce((sum, band) => sum + band.weight, 0);
            let cursor = rect.x;
            paletteBands.forEach((band, index) => {
              const bandWidth = index === paletteBands.length - 1
                ? rect.x + rect.w - cursor
                : rect.w * (band.weight / total);
              p.noStroke();
              p.fill(band.color);
              p.rect(cursor, rect.y + rect.h - 3, bandWidth, 3);
              cursor += bandWidth;
            });
          });
        };

        const chart = (rect: Rect, xInset = 0.085, topInset = 0.09) => ({
          x: rect.x + rect.w * xInset,
          y: rect.y + rect.h * topInset,
          w: rect.w * (1 - xInset - 0.055),
          h: rect.h * (1 - topInset - 0.105),
        });

        const graphFrame = (rect: Rect, divisions = 6) => {
          const c = chart(rect);
          const dark = rect.tone === "black";
          p.push();
          p.stroke(dark ? navy : rect.tone === "powder" ? white : gray);
          p.strokeWeight(1);
          for (let i = 1; i <= divisions; i += 1) {
            const x = c.x + (c.w * i) / divisions;
            p.line(x, c.y, x, c.y + c.h);
          }
          for (let i = 1; i <= 4; i += 1) {
            const y = c.y + (c.h * i) / 4;
            p.line(c.x, y, c.x + c.w, y);
          }

          p.stroke(dark ? powder : navy);
          p.strokeWeight(1.25);
          p.line(c.x, c.y, c.x, c.y + c.h);
          p.line(c.x, c.y + c.h, c.x + c.w, c.y + c.h);

          p.noStroke();
          p.fill(dark ? powder : navy);
          p.triangle(c.x + c.w, c.y + c.h, c.x + c.w - 7, c.y + c.h - 3.5, c.x + c.w - 7, c.y + c.h + 3.5);
          p.triangle(c.x, c.y, c.x - 3.5, c.y + 7, c.x + 3.5, c.y + 7);
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

        const linePath = (points: Point[], color: string, weight = 2, dotted = false, maxProgress = 1) => {
          p.push();
          p.noFill();
          p.stroke(color);
          p.strokeWeight(weight);
          const ctx = p.drawingContext as CanvasRenderingContext2D;
          if (dotted) ctx.setLineDash([4, 7]);
          p.beginShape();
          const count = Math.max(2, Math.floor(points.length * maxProgress));
          for (let i = 0; i < count; i += 1) p.vertex(points[i].x, points[i].y);
          p.endShape();
          ctx.setLineDash([]);
          p.pop();
        };

        const movingNode = (points: Point[], progress: number, color: string, radius = 7) => {
          const index = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
          const point = points[index];
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
            const c = graphFrame(rect, 8);
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
            const c = graphFrame(rect, 5);
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
            const c = graphFrame(rect, 5);
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
            const c = graphFrame(rect, 5);
            const pts = mapped(projectile(52, 18), c);
            linePath(pts, navy, 1, true);

            for (let i = 0; i < 12; i += 1) {
              const progress = i / 11;
              const point = pts[Math.floor(progress * (pts.length - 1))];
              const pulse = 0.5 + 0.5 * Math.sin(t * 4.2 - progress * TAU * 1.6);
              p.noStroke();
              p.fill(p.color(powder + Math.round(30 + pulse * 80).toString(16).padStart(2, "0")));
              p.circle(point.x, point.y, 4 + pulse * 7);
              p.fill(navy);
              p.circle(point.x, point.y, 3.2);
            }

            const progress = (t * 0.17) % 1;
            const index = Math.floor(progress * (pts.length - 1));
            const head = pts[index];
            p.push();
            p.stroke(navy);
            p.strokeWeight(2.5);
            for (let j = 1; j < 8; j += 1) {
              const previous = pts[Math.max(0, index - j)];
              p.strokeWeight(3 - j * 0.3);
              p.line(previous.x, previous.y, head.x, head.y);
            }
            p.pop();
            movingNode(pts, progress, signal, 8);
          });
        };

        const drawVectors = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect, 5);
            const source = projectile(49, 18);
            const pts = mapped(source, c);
            linePath(pts, powder, 1.25, true);
            const wobble = 0.86 + 0.14 * Math.sin(t * 1.8);

            for (let i = 0; i < 7; i += 1) {
              const progress = 0.04 + i * 0.153;
              const index = Math.floor(progress * (pts.length - 1));
              const point = pts[index];
              const velocity = source[index];
              const vx = Math.min(rect.w * 0.095, Math.abs(velocity.vx ?? 0) * 1.15) * wobble;
              const vy = -(velocity.vy ?? 0) * 1.1 * wobble;
              p.noStroke();
              p.fill(white);
              p.circle(point.x, point.y, 4);
              arrow(point.x, point.y, point.x + vx, point.y, powder, 1.1);
              arrow(point.x + vx, point.y, point.x + vx, point.y + vy, white, 1.1);
              arrow(point.x, point.y, point.x + vx, point.y + vy, signal, 1.8);
            }
          });
        };

        const drawGravity = (rect: Rect, t: number) => {
          panelBase(rect);
          roundedClip(rect, () => {
            const c = graphFrame(rect, 9);
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
          const t = reducedMotion ? 1.4 : p.millis() / 1000;
          p.background(black);
          const [a, b, c, d, e, f] = panels();
          drawFan(a, t);
          drawDrag(b, t);
          drawEqualRange(c, t);
          drawTimeBeads(d, t);
          drawVectors(e, t);
          drawGravity(f, t);

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
  }, []);

  return <div ref={hostRef} className="trajectory-field" />;
}

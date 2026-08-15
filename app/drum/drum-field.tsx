"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import { SiteNavigation } from "../site-navigation";

type LoadState = "loading" | "ready" | "error";

const TAU = Math.PI * 2;

function makeLabelTexture(THREE: typeof ThreeTypes, label: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "600 56px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeArc(
  THREE: typeof ThreeTypes,
  radius: number,
  start: number,
  length: number,
  z: number,
  material: ThreeTypes.LineBasicMaterial | ThreeTypes.LineDashedMaterial,
) {
  const points = Array.from({ length: 81 }, (_, index) => {
    const angle = start + length * (index / 80);
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
  });
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  if (material instanceof THREE.LineDashedMaterial) line.computeLineDistances();
  return { geometry, line };
}

function makeTriangle(THREE: typeof ThreeTypes, color: string) {
  const shape = new THREE.Shape();
  shape.moveTo(0.16, 0);
  shape.lineTo(-0.12, 0.105);
  shape.lineTo(-0.12, -0.105);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  return { geometry, material, mesh: new THREE.Mesh(geometry, material) };
}

export function DrumField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      if (!mounted || !hostRef.current) return;

      try {
        const host = hostRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#f5f5f5");

        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.set(0, 0, 9);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute(
          "aria-label",
          "Interactive three-dimensional radial instrument drum. Move the pointer to tilt, drag to spin, or use the mouse wheel and arrow keys.",
        );
        host.appendChild(renderer.domElement);

        const geometries: ThreeTypes.BufferGeometry[] = [];
        const materials: ThreeTypes.Material[] = [];
        const textures: ThreeTypes.Texture[] = [];

        const instrument = new THREE.Group();
        instrument.rotation.set(-0.055, -0.94, -0.08);
        scene.add(instrument);

        const drum = new THREE.Group();
        instrument.add(drum);

        const bodyGeometry = new THREE.CylinderGeometry(2.27, 2.27, 0.46, 160, 1, false);
        bodyGeometry.rotateX(Math.PI / 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: 0.92,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        drum.add(body);
        geometries.push(bodyGeometry);
        materials.push(bodyMaterial);

        const rearGeometry = new THREE.TorusGeometry(2.27, 0.018, 8, 180);
        const rearMaterial = new THREE.MeshBasicMaterial({ color: "#bcd4e4" });
        const rear = new THREE.Mesh(rearGeometry, rearMaterial);
        rear.position.z = -0.245;
        drum.add(rear);
        geometries.push(rearGeometry);
        materials.push(rearMaterial);

        const ringDefinitions = [
          { radius: 1.69, tube: 0.008, color: "#bcd4e4", opacity: 0.72 },
          { radius: 1.91, tube: 0.012, color: "#305579", opacity: 0.85 },
          { radius: 2.23, tube: 0.014, color: "#305579", opacity: 0.96 },
          { radius: 2.47, tube: 0.012, color: "#000000", opacity: 0.96 },
          { radius: 2.63, tube: 0.01, color: "#305579", opacity: 0.7 },
        ];

        ringDefinitions.forEach((definition) => {
          const geometry = new THREE.TorusGeometry(definition.radius, definition.tube, 8, 240);
          const material = new THREE.MeshBasicMaterial({
            color: definition.color,
            transparent: definition.opacity < 1,
            opacity: definition.opacity,
          });
          const ring = new THREE.Mesh(geometry, material);
          ring.position.z = 0.255;
          drum.add(ring);
          geometries.push(geometry);
          materials.push(material);
        });

        const tickGeometry = new THREE.BoxGeometry(1, 1, 1);
        const tickMaterial = new THREE.MeshBasicMaterial({ color: "#000000" });
        const ticks = new THREE.InstancedMesh(tickGeometry, tickMaterial, 180);
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const axis = new THREE.Vector3(0, 0, 1);

        for (let index = 0; index < 180; index += 1) {
          const angle = (index / 180) * TAU;
          const isMajor = index % 15 === 0;
          const isMedium = !isMajor && index % 5 === 0;
          const length = isMajor ? 0.19 : isMedium ? 0.135 : 0.082;
          const thickness = isMajor ? 0.022 : isMedium ? 0.016 : 0.01;
          const radius = 2.55 - length * 0.5;
          position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.28);
          quaternion.setFromAxisAngle(axis, angle);
          scale.set(length, thickness, 0.026);
          matrix.compose(position, quaternion, scale);
          ticks.setMatrixAt(index, matrix);
        }
        ticks.instanceMatrix.needsUpdate = true;
        drum.add(ticks);
        geometries.push(tickGeometry);
        materials.push(tickMaterial);

        const innerBand = new THREE.Group();
        innerBand.position.z = 0.012;
        drum.add(innerBand);

        const labels = [
          "0.000", "0.036", "0.072", "0.108", "0.144", "0.180",
          "0.216", "0.252", "0.288", "0.324", "0.360", "0.396",
          "0.432", "0.468", "0.504", "0.540", "0.576", "0.612",
          "0.648", "0.684", "0.720", "0.756", "0.792", "0.828",
        ];
        const labelGeometry = new THREE.PlaneGeometry(0.5, 0.125);
        geometries.push(labelGeometry);
        labels.forEach((label, index) => {
          const angle = (index / labels.length) * TAU;
          const texture = makeLabelTexture(THREE, label, index % 6 === 0 ? "#305579" : "#000000");
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const plane = new THREE.Mesh(labelGeometry, material);
          plane.position.set(Math.cos(angle) * 2.06, Math.sin(angle) * 2.06, 0.285);
          plane.rotation.z = angle + Math.PI / 2;
          if (Math.cos(angle) < 0) plane.rotation.z += Math.PI;
          innerBand.add(plane);
          textures.push(texture);
          materials.push(material);
        });

        const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        const blockMaterial = new THREE.MeshBasicMaterial({ color: "#305579" });
        const blocks = new THREE.InstancedMesh(blockGeometry, blockMaterial, 24);
        for (let index = 0; index < 24; index += 1) {
          const angle = (index / 24) * TAU + 0.065;
          const length = index % 4 === 0 ? 0.15 : 0.09;
          position.set(Math.cos(angle) * 1.79, Math.sin(angle) * 1.79, 0.29);
          quaternion.setFromAxisAngle(axis, angle);
          scale.set(length, index % 4 === 0 ? 0.052 : 0.033, 0.025);
          matrix.compose(position, quaternion, scale);
          blocks.setMatrixAt(index, matrix);
        }
        blocks.instanceMatrix.needsUpdate = true;
        innerBand.add(blocks);
        geometries.push(blockGeometry);
        materials.push(blockMaterial);

        const dashMaterial = new THREE.LineDashedMaterial({
          color: "#305579",
          dashSize: 0.055,
          gapSize: 0.042,
          transparent: true,
          opacity: 0.86,
        });
        const inkArcMaterial = new THREE.LineBasicMaterial({ color: "#000000" });
        materials.push(dashMaterial, inkArcMaterial);
        [
          [1.56, 0.1, 1.12, dashMaterial],
          [1.56, 2.02, 0.68, inkArcMaterial],
          [1.56, 3.44, 1.31, dashMaterial],
          [2.76, 0.64, 0.82, inkArcMaterial],
          [2.76, 3.12, 0.54, dashMaterial],
        ].forEach(([radius, start, length, material]) => {
          const result = makeArc(
            THREE,
            radius as number,
            start as number,
            length as number,
            0.292,
            material as ThreeTypes.LineBasicMaterial | ThreeTypes.LineDashedMaterial,
          );
          drum.add(result.line);
          geometries.push(result.geometry);
        });

        const triangleDefinitions = [
          { angle: 0.18, radius: 1.48, color: "#e1fe0e", scale: 1.15 },
          { angle: 1.62, radius: 1.48, color: "#000000", scale: 0.92 },
          { angle: 3.72, radius: 1.48, color: "#305579", scale: 0.78 },
          { angle: 5.12, radius: 1.48, color: "#000000", scale: 0.92 },
          { angle: 5.72, radius: 2.74, color: "#bcd4e4", scale: 0.72 },
        ];
        triangleDefinitions.forEach((definition) => {
          const triangle = makeTriangle(THREE, definition.color);
          triangle.mesh.position.set(
            Math.cos(definition.angle) * definition.radius,
            Math.sin(definition.angle) * definition.radius,
            0.31,
          );
          triangle.mesh.rotation.z = definition.angle;
          triangle.mesh.scale.setScalar(definition.scale);
          drum.add(triangle.mesh);
          geometries.push(triangle.geometry);
          materials.push(triangle.material);
        });

        const indicatorGeometry = new THREE.BoxGeometry(0.42, 0.075, 0.04);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: "#000000" });
        const indicatorSignalMaterial = new THREE.MeshBasicMaterial({ color: "#bcd4e4" });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(1.14, -1.16, 0.32);
        indicator.rotation.z = -0.78;
        drum.add(indicator);
        const indicatorSignal = new THREE.Mesh(indicatorGeometry, indicatorSignalMaterial);
        indicatorSignal.scale.x = 0.44;
        indicatorSignal.position.set(1.34, -0.97, 0.33);
        indicatorSignal.rotation.z = -0.78;
        drum.add(indicatorSignal);
        geometries.push(indicatorGeometry);
        materials.push(indicatorMaterial, indicatorSignalMaterial);

        const ambient = new THREE.HemisphereLight("#ffffff", "#bcd4e4", 2.2);
        scene.add(ambient);
        const key = new THREE.DirectionalLight("#ffffff", 2.8);
        key.position.set(-3.4, 4.2, 6.8);
        scene.add(key);
        const side = new THREE.DirectionalLight("#bcd4e4", 1.1);
        side.position.set(4, -2, 2.5);
        scene.add(side);

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(1, height);
          const verticalFit = 2.92 / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
          const projectedHalfWidth = 1.67;
          const horizontalFit = projectedHalfWidth / Math.max(0.12, camera.aspect * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
          camera.position.z = Math.max(verticalFit, horizontalFit) * (width < 520 ? 1.02 : 0.97);
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const baseTilt = { x: -0.055, y: -0.94 };
        const targetTilt = { ...baseTilt };
        const currentTilt = { ...baseTilt };
        const pointer = { down: false, x: 0, y: 0 };
        let spin = -0.22;
        let velocity = 0;
        let animationFrame = 0;
        let lastTime = window.performance.now();

        const pointToTilt = (event: PointerEvent) => {
          const bounds = host.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
          const y = ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 - 1;
          targetTilt.x = baseTilt.x - y * 0.17;
          targetTilt.y = baseTilt.y + x * 0.34;
        };

        const onPointerDown = (event: PointerEvent) => {
          pointer.down = true;
          pointer.x = event.clientX;
          pointer.y = event.clientY;
          renderer.domElement.setPointerCapture(event.pointerId);
          renderer.domElement.classList.add("is-dragging");
        };
        const onPointerMove = (event: PointerEvent) => {
          pointToTilt(event);
          if (!pointer.down) return;
          const deltaX = event.clientX - pointer.x;
          const deltaY = event.clientY - pointer.y;
          pointer.x = event.clientX;
          pointer.y = event.clientY;
          spin += deltaX * 0.0075 + deltaY * 0.0016;
          velocity = THREE.MathUtils.clamp(deltaX * 0.42 + deltaY * 0.08, -7, 7);
        };
        const onPointerUp = (event: PointerEvent) => {
          pointer.down = false;
          if (renderer.domElement.hasPointerCapture(event.pointerId)) {
            renderer.domElement.releasePointerCapture(event.pointerId);
          }
          renderer.domElement.classList.remove("is-dragging");
        };
        const onPointerLeave = () => {
          if (pointer.down) return;
          targetTilt.x = baseTilt.x;
          targetTilt.y = baseTilt.y;
        };
        const onWheel = (event: WheelEvent) => {
          event.preventDefault();
          velocity = THREE.MathUtils.clamp(velocity + event.deltaY * 0.006, -6.5, 6.5);
        };
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          velocity += event.key === "ArrowLeft" ? 1.25 : -1.25;
          velocity = THREE.MathUtils.clamp(velocity, -6.5, 6.5);
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointercancel", onPointerUp);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
        renderer.domElement.addEventListener("keydown", onKeyDown);

        const render = (now: number) => {
          const delta = Math.min(0.04, Math.max(0.001, (now - lastTime) / 1000));
          lastTime = now;
          currentTilt.x = THREE.MathUtils.lerp(currentTilt.x, targetTilt.x, 1 - Math.exp(-5.5 * delta));
          currentTilt.y = THREE.MathUtils.lerp(currentTilt.y, targetTilt.y, 1 - Math.exp(-5.5 * delta));
          instrument.rotation.x = currentTilt.x;
          instrument.rotation.y = currentTilt.y;

          if (!pointer.down) {
            spin += velocity * delta;
            velocity *= Math.exp(-2.4 * delta);
          }
          if (!reducedMotion) spin += delta * 0.075;
          drum.rotation.z = spin;
          innerBand.rotation.z = -spin * 0.16 + Math.sin(now * 0.00024) * 0.045;
          indicatorSignal.visible = Math.floor(now / 520) % 7 !== 0;

          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };

        setLoadState("ready");
        animationFrame = window.requestAnimationFrame(render);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointercancel", onPointerUp);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          renderer.domElement.removeEventListener("wheel", onWheel);
          renderer.domElement.removeEventListener("keydown", onKeyDown);
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          textures.forEach((texture) => texture.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (mounted) setLoadState("error");
      }
    }).catch(() => {
      if (mounted) setLoadState("error");
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  return (
    <div className="drum-shell">
      <SiteNavigation active="drum" />
      <section className={`drum-field is-${loadState}`} aria-live="polite">
        <div ref={hostRef} className="drum-canvas" />
        {loadState === "loading" && <div className="drum-loading" aria-label="Loading radial drum" />}
        {loadState === "error" && (
          <div className="drum-error" role="alert">
            3D drum unavailable
          </div>
        )}
      </section>
    </div>
  );
}

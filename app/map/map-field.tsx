"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import { SiteNavigation } from "../site-navigation";

type LoadState = "loading" | "ready" | "error";
type MarkerKind = "triangle" | "flag" | "cross" | "station";

const TAU = Math.PI * 2;
const TERRAIN_RADIUS = 2.28;

function terrainHeight(x: number, z: number) {
  const radius = Math.hypot(x, z);
  const edge = Math.max(0, 1 - Math.pow(radius / TERRAIN_RADIUS, 3.4));
  const peak = Math.exp(-((x - 0.18) ** 2 * 0.68 + (z + 0.34) ** 2 * 0.92)) * 1.28;
  const westRidge = Math.exp(-((x + 0.78) ** 2 * 1.6 + (z - 0.08) ** 2 * 0.82)) * 0.52;
  const northRidge = Math.exp(-((x - 0.64) ** 2 * 1.7 + (z + 1.08) ** 2 * 2.2)) * 0.38;
  const relief =
    Math.sin(x * 3.15 + z * 1.7) * 0.055 +
    Math.cos(z * 4.2 - x * 1.35) * 0.04 +
    Math.sin((x - z) * 6.4) * 0.022;

  return 0.08 + edge * (0.12 + peak + westRidge + northRidge + relief);
}

function makeTerrainGeometry(THREE: typeof ThreeTypes) {
  const radialSegments = 160;
  const rings = 92;
  const positions: number[] = [0, terrainHeight(0, 0), 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];

  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = TERRAIN_RADIUS * (ring / rings);
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * TAU;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, terrainHeight(x, z), z);
      uvs.push(x / (TERRAIN_RADIUS * 2) + 0.5, z / (TERRAIN_RADIUS * 2) + 0.5);
    }
  }

  for (let segment = 0; segment < radialSegments; segment += 1) {
    indices.push(0, 1 + segment, 1 + ((segment + 1) % radialSegments));
  }

  for (let ring = 1; ring < rings; ring += 1) {
    const current = 1 + (ring - 1) * radialSegments;
    const next = current + radialSegments;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const after = (segment + 1) % radialSegments;
      indices.push(
        current + segment,
        next + segment,
        current + after,
        current + after,
        next + segment,
        next + after,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeMarkerTexture(
  THREE: typeof ThreeTypes,
  fill: string,
  kind: MarkerKind,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.clearRect(0, 0, 128, 128);
  context.beginPath();
  context.arc(64, 64, 51, 0, TAU);
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = "#305579";
  context.stroke();
  context.strokeStyle = fill === "#305579" ? "#ffffff" : "#305579";
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 7;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (kind === "triangle") {
    context.beginPath();
    context.moveTo(64, 39);
    context.lineTo(87, 83);
    context.lineTo(41, 83);
    context.closePath();
    context.stroke();
  } else if (kind === "flag") {
    context.beginPath();
    context.moveTo(50, 88);
    context.lineTo(50, 39);
    context.lineTo(84, 47);
    context.lineTo(50, 61);
    context.stroke();
  } else if (kind === "cross") {
    context.beginPath();
    context.moveTo(43, 64);
    context.lineTo(85, 64);
    context.moveTo(64, 43);
    context.lineTo(64, 85);
    context.stroke();
  } else {
    context.beginPath();
    context.arc(64, 64, 17, 0, TAU);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeLetterTexture(THREE: typeof ThreeTypes, letter: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.clearRect(0, 0, 96, 96);
  context.fillStyle = "#305579";
  context.font = "600 42px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(letter, 48, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function MapField() {
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

        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute(
          "aria-label",
          "A circular three-dimensional contour route map with compass bearings and elevated points of interest",
        );
        host.appendChild(renderer.domElement);

        const instrument = new THREE.Group();
        instrument.position.y = -0.16;
        scene.add(instrument);

        const mapGroup = new THREE.Group();
        instrument.add(mapGroup);

        const disposableGeometries: ThreeTypes.BufferGeometry[] = [];
        const disposableMaterials: ThreeTypes.Material[] = [];
        const disposableTextures: ThreeTypes.Texture[] = [];

        const baseGeometry = new THREE.CylinderGeometry(TERRAIN_RADIUS, TERRAIN_RADIUS, 0.12, 160);
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: "#e4e4e4",
          roughness: 1,
          metalness: 0,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.02;
        mapGroup.add(base);
        disposableGeometries.push(baseGeometry);
        disposableMaterials.push(baseMaterial);

        const terrainGeometry = makeTerrainGeometry(THREE);
        const terrainMaterial = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: 0.96,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        mapGroup.add(terrain);
        disposableGeometries.push(terrainGeometry);
        disposableMaterials.push(terrainMaterial);

        const contourMaterial = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          uniforms: {
            contourColor: { value: new THREE.Color("#305579") },
          },
          vertexShader: `
            varying float vElevation;
            void main() {
              vElevation = position.y;
              vec3 lifted = position + normal * 0.008;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(lifted, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 contourColor;
            varying float vElevation;
            void main() {
              float band = fract(vElevation * 10.4);
              float distanceToBand = min(band, 1.0 - band);
              float contour = 1.0 - smoothstep(0.018, 0.072, distanceToBand);
              contour *= smoothstep(0.115, 0.2, vElevation);
              if (contour < 0.14) discard;
              gl_FragColor = vec4(contourColor, contour * 0.82);
            }
          `,
        });
        const contours = new THREE.Mesh(terrainGeometry, contourMaterial);
        contours.renderOrder = 1;
        mapGroup.add(contours);
        disposableMaterials.push(contourMaterial);

        const edgeGeometry = new THREE.TorusGeometry(TERRAIN_RADIUS, 0.017, 8, 180);
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: "#305579" });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 0.095;
        mapGroup.add(edge);
        disposableGeometries.push(edgeGeometry);
        disposableMaterials.push(edgeMaterial);

        const routeMaterial = new THREE.LineDashedMaterial({
          color: "#e1fe0e",
          dashSize: 0.105,
          gapSize: 0.065,
          transparent: true,
          opacity: 0.92,
        });
        const routeMaterialSecondary = new THREE.LineDashedMaterial({
          color: "#bcd4e4",
          dashSize: 0.075,
          gapSize: 0.05,
          transparent: true,
          opacity: 1,
        });
        disposableMaterials.push(routeMaterial, routeMaterialSecondary);

        const routeDefinitions = [
          {
            material: routeMaterial,
            points: [
              [-1.72, 0.78],
              [-1.08, 0.42],
              [-0.48, 0.05],
              [-0.05, -0.55],
              [0.42, -1.2],
              [1.14, -1.56],
            ],
          },
          {
            material: routeMaterialSecondary,
            points: [
              [-0.92, -1.58],
              [-0.55, -0.84],
              [0.16, -0.34],
              [0.82, 0.16],
              [1.5, 0.76],
            ],
          },
        ];
        const stationGeometry = new THREE.SphereGeometry(0.038, 12, 8);
        const stationMaterial = new THREE.MeshBasicMaterial({ color: "#e1fe0e" });
        const routeDotGeometry = new THREE.SphereGeometry(0.021, 8, 6);
        const routeDotMaterial = new THREE.MeshBasicMaterial({ color: "#e1fe0e" });
        disposableGeometries.push(stationGeometry, routeDotGeometry);
        disposableMaterials.push(stationMaterial, routeDotMaterial);

        routeDefinitions.forEach((definition, routeIndex) => {
          const controlPoints = definition.points.map(([x, z]) => (
            new THREE.Vector3(x, terrainHeight(x, z) + 0.034, z)
          ));
          const curve = new THREE.CatmullRomCurve3(controlPoints, false, "catmullrom", 0.24);
          const routePoints = curve.getPoints(150).map((point) => (
            new THREE.Vector3(point.x, terrainHeight(point.x, point.z) + 0.034, point.z)
          ));
          const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
          const line = new THREE.Line(routeGeometry, definition.material);
          line.computeLineDistances();
          line.renderOrder = 2;
          mapGroup.add(line);
          disposableGeometries.push(routeGeometry);

          if (routeIndex === 0) {
            routePoints.forEach((point, pointIndex) => {
              if (pointIndex % 6 !== 0) return;
              const dot = new THREE.Mesh(routeDotGeometry, routeDotMaterial);
              dot.position.copy(point);
              dot.position.y += 0.018;
              dot.renderOrder = 3;
              mapGroup.add(dot);
            });
          }

          [0.18, 0.43, 0.7, 0.9].forEach((progress) => {
            const point = curve.getPoint(progress);
            const station = new THREE.Mesh(stationGeometry, stationMaterial);
            station.position.set(point.x, terrainHeight(point.x, point.z) + 0.052, point.z);
            mapGroup.add(station);
          });
        });

        const poleMaterial = new THREE.LineBasicMaterial({ color: "#305579", transparent: true, opacity: 0.72 });
        const anchorMaterial = new THREE.MeshBasicMaterial({ color: "#305579" });
        const anchorGeometry = new THREE.SphereGeometry(0.027, 10, 8);
        disposableMaterials.push(poleMaterial, anchorMaterial);
        disposableGeometries.push(anchorGeometry);

        const markerDefinitions: Array<{
          x: number;
          z: number;
          lift: number;
          fill: string;
          kind: MarkerKind;
        }> = [
          { x: -1.5, z: -0.3, lift: 0.72, fill: "#bcd4e4", kind: "triangle" },
          { x: -0.82, z: -1.18, lift: 0.8, fill: "#305579", kind: "station" },
          { x: 0.02, z: -1.48, lift: 0.72, fill: "#ffffff", kind: "flag" },
          { x: 1.18, z: -0.76, lift: 0.74, fill: "#e1fe0e", kind: "cross" },
          { x: 1.52, z: 0.48, lift: 0.66, fill: "#bcd4e4", kind: "station" },
          { x: 0.48, z: 0.72, lift: 0.78, fill: "#ffffff", kind: "flag" },
        ];
        const markerSprites: ThreeTypes.Sprite[] = [];

        markerDefinitions.forEach((definition) => {
          const ground = terrainHeight(definition.x, definition.z) + 0.03;
          const top = ground + definition.lift;
          const poleGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(definition.x, ground, definition.z),
            new THREE.Vector3(definition.x, top, definition.z),
          ]);
          const pole = new THREE.Line(poleGeometry, poleMaterial);
          mapGroup.add(pole);
          disposableGeometries.push(poleGeometry);

          const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
          anchor.position.set(definition.x, ground, definition.z);
          mapGroup.add(anchor);

          const texture = makeMarkerTexture(THREE, definition.fill, definition.kind);
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const marker = new THREE.Sprite(material);
          marker.position.set(definition.x, top, definition.z);
          marker.scale.setScalar(0.33);
          mapGroup.add(marker);
          markerSprites.push(marker);
          disposableTextures.push(texture);
          disposableMaterials.push(material);
        });

        const ringMaterial = new THREE.MeshBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
        });
        const innerRingGeometry = new THREE.RingGeometry(2.48, 2.5, 180);
        const outerRingGeometry = new THREE.RingGeometry(2.77, 2.785, 180);
        const innerRing = new THREE.Mesh(innerRingGeometry, ringMaterial);
        const outerRing = new THREE.Mesh(outerRingGeometry, ringMaterial);
        innerRing.rotation.x = -Math.PI / 2;
        outerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = 0.1;
        outerRing.position.y = 0.1;
        instrument.add(innerRing, outerRing);
        disposableGeometries.push(innerRingGeometry, outerRingGeometry);
        disposableMaterials.push(ringMaterial);

        const tickPositions: number[] = [];
        for (let degree = 0; degree < 360; degree += 2) {
          const angle = THREE.MathUtils.degToRad(degree);
          const innerRadius = degree % 30 === 0 ? 2.56 : degree % 10 === 0 ? 2.61 : 2.66;
          const outerRadius = 2.75;
          tickPositions.push(
            Math.sin(angle) * innerRadius,
            0.105,
            -Math.cos(angle) * innerRadius,
            Math.sin(angle) * outerRadius,
            0.105,
            -Math.cos(angle) * outerRadius,
          );
        }
        const tickGeometry = new THREE.BufferGeometry();
        tickGeometry.setAttribute("position", new THREE.Float32BufferAttribute(tickPositions, 3));
        const tickMaterial = new THREE.LineBasicMaterial({ color: "#305579", transparent: true, opacity: 0.78 });
        const ticks = new THREE.LineSegments(tickGeometry, tickMaterial);
        instrument.add(ticks);
        disposableGeometries.push(tickGeometry);
        disposableMaterials.push(tickMaterial);

        [
          { letter: "N", angle: 0 },
          { letter: "E", angle: Math.PI / 2 },
          { letter: "S", angle: Math.PI },
          { letter: "W", angle: Math.PI * 1.5 },
        ].forEach(({ letter, angle }) => {
          const texture = makeLetterTexture(THREE, letter);
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
          const label = new THREE.Sprite(material);
          label.position.set(Math.sin(angle) * 2.94, 0.16, -Math.cos(angle) * 2.94);
          label.scale.set(0.29, 0.29, 0.29);
          instrument.add(label);
          disposableTextures.push(texture);
          disposableMaterials.push(material);
        });

        const bearingGeometry = new THREE.SphereGeometry(0.047, 12, 8);
        const bearingMaterial = new THREE.MeshBasicMaterial({ color: "#e1fe0e" });
        const bearingAngle = THREE.MathUtils.degToRad(38);
        const bearing = new THREE.Mesh(bearingGeometry, bearingMaterial);
        bearing.position.set(Math.sin(bearingAngle) * 2.76, 0.12, -Math.cos(bearingAngle) * 2.76);
        instrument.add(bearing);
        disposableGeometries.push(bearingGeometry);
        disposableMaterials.push(bearingMaterial);

        const hemisphere = new THREE.HemisphereLight("#ffffff", "#bcd4e4", 1.25);
        const key = new THREE.DirectionalLight("#ffffff", 1.8);
        key.position.set(-4.5, 7, 5.5);
        const fill = new THREE.DirectionalLight("#bcd4e4", 0.72);
        fill.position.set(4, 3, -4);
        scene.add(hemisphere, key, fill);

        const lookAt = new THREE.Vector3(0, 0.22, 0);
        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(1, height);
          const portraitFit = 10.8 / Math.min(camera.aspect, 1);
          const landscapeFit = Math.max(7.7, 11.1 / Math.max(camera.aspect, 1));
          const landscapeMix = THREE.MathUtils.clamp((camera.aspect - 1) / 0.3, 0, 1);
          const distance = THREE.MathUtils.lerp(portraitFit, landscapeFit, landscapeMix);
          lookAt.y = THREE.MathUtils.lerp(0.22, -0.42, landscapeMix);
          camera.position.set(0, lookAt.y + distance * 0.64, distance * 0.77);
          camera.lookAt(lookAt);
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const pointer = new THREE.Vector2();
        const pointerTarget = new THREE.Vector2();
        const onPointerMove = (event: PointerEvent) => {
          const bounds = host.getBoundingClientRect();
          pointerTarget.set(
            ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2,
            ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2,
          );
        };
        const onPointerLeave = () => pointerTarget.set(0, 0);
        host.addEventListener("pointermove", onPointerMove, { passive: true });
        host.addEventListener("pointerleave", onPointerLeave);

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const startTime = window.performance.now();
        let animationFrame = 0;

        const render = () => {
          const elapsed = reducedMotion ? 4.2 : (window.performance.now() - startTime) / 1000;
          pointer.lerp(pointerTarget, 0.04);
          mapGroup.rotation.y = Math.sin(elapsed * 0.28) * 0.055 + pointer.x * 0.055;
          mapGroup.rotation.x = pointer.y * 0.012;

          markerSprites.forEach((marker, index) => {
            const pulse = 1 + Math.max(0, Math.sin(elapsed * 1.45 - index * 0.9)) * 0.085;
            marker.scale.setScalar(0.33 * pulse);
          });

          renderer.render(scene, camera);
          if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
        };

        setLoadState("ready");
        render();

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerleave", onPointerLeave);
          disposableGeometries.forEach((geometry) => geometry.dispose());
          disposableMaterials.forEach((material) => material.dispose());
          disposableTextures.forEach((texture) => texture.dispose());
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
    <div className="map-shell">
      <SiteNavigation active="map" />
      <section className={`map-field is-${loadState}`} aria-live="polite">
        <div ref={hostRef} className="map-canvas" />
        {loadState === "loading" && <div className="map-loading" aria-label="Loading route map instrument" />}
        {loadState === "error" && (
          <div className="map-error" role="alert">
            Route map unavailable
          </div>
        )}
      </section>
    </div>
  );
}

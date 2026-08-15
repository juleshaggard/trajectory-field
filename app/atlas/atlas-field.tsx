"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import { SiteNavigation } from "../site-navigation";

type LoadState = "loading" | "ready" | "error";

const TAU = Math.PI * 2;
const OUTER_RADIUS = 2.72;

function islandHeight(x: number, z: number) {
  const radius = Math.hypot(x, z);
  const edge = Math.max(0, 1 - Math.pow(radius / 1.14, 3.1));
  const crown = Math.exp(-((x + 0.12) ** 2 * 2.5 + (z - 0.06) ** 2 * 1.7)) * 0.48;
  const ridge = Math.exp(-((x - 0.42) ** 2 * 6.2 + (z + 0.28) ** 2 * 3.6)) * 0.24;
  const relief = Math.sin(x * 7.1 + z * 2.8) * 0.035 + Math.cos(z * 8.4 - x * 3.2) * 0.025;
  return -0.23 + edge * (0.12 + crown + ridge + relief);
}

function makeIslandGeometry(THREE: typeof ThreeTypes) {
  const radialSegments = 112;
  const rings = 58;
  const positions: number[] = [0, islandHeight(0, 0), 0];
  const indices: number[] = [];

  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = 1.14 * (ring / rings);
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * TAU;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, islandHeight(x, z), z);
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
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeCircle(
  THREE: typeof ThreeTypes,
  radius: number,
  material: ThreeTypes.Material,
  segments = 160,
) {
  const points: ThreeTypes.Vector3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, material);
}

function makeSphereGrid(
  THREE: typeof ThreeTypes,
  radius: number,
  latitudeCount: number,
  longitudeCount: number,
  material: ThreeTypes.Material,
) {
  const group = new THREE.Group();

  for (let latitude = 1; latitude < latitudeCount; latitude += 1) {
    const phi = -Math.PI / 2 + (latitude / latitudeCount) * Math.PI;
    const ringRadius = Math.cos(phi) * radius;
    const ring = makeCircle(THREE, ringRadius, material);
    ring.position.y = Math.sin(phi) * radius;
    group.add(ring);
  }

  for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
    const theta = (longitude / longitudeCount) * TAU;
    const points: ThreeTypes.Vector3[] = [];
    for (let segment = 0; segment <= 96; segment += 1) {
      const phi = -Math.PI / 2 + (segment / 96) * Math.PI;
      points.push(new THREE.Vector3(
        Math.cos(phi) * Math.cos(theta) * radius,
        Math.sin(phi) * radius,
        Math.cos(phi) * Math.sin(theta) * radius,
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geometry, material));
  }

  return group;
}

function makeCylinderGrid(
  THREE: typeof ThreeTypes,
  radius: number,
  height: number,
  radialCount: number,
  ringCount: number,
  material: ThreeTypes.Material,
) {
  const group = new THREE.Group();
  const verticalPositions: number[] = [];

  for (let radial = 0; radial < radialCount; radial += 1) {
    const angle = (radial / radialCount) * TAU;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    verticalPositions.push(x, -height / 2, z, x, height / 2, z);
  }

  const verticalGeometry = new THREE.BufferGeometry();
  verticalGeometry.setAttribute("position", new THREE.Float32BufferAttribute(verticalPositions, 3));
  group.add(new THREE.LineSegments(verticalGeometry, material));

  for (let ring = 0; ring < ringCount; ring += 1) {
    const line = makeCircle(THREE, radius, material);
    line.position.y = -height / 2 + (ring / Math.max(1, ringCount - 1)) * height;
    group.add(line);
  }

  return group;
}

function makeOrbitalArc(
  THREE: typeof ThreeTypes,
  radius: number,
  material: ThreeTypes.LineDashedMaterial,
) {
  const points: ThreeTypes.Vector3[] = [];
  for (let segment = 0; segment <= 256; segment += 1) {
    const angle = (segment / 256) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineLoop(geometry, material);
  line.computeLineDistances();
  return line;
}

export function AtlasField() {
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

        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0.38, 3, 10.2);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute(
          "aria-label",
          "Animated orbital atlas with nested sphere grids, rotating cylindrical coordinate cages, and a central terrain island",
        );
        host.appendChild(renderer.domElement);

        const instrument = new THREE.Group();
        instrument.rotation.set(-0.13, 0.22, -0.025);
        scene.add(instrument);

        const disposableGeometries: ThreeTypes.BufferGeometry[] = [];
        const disposableMaterials: ThreeTypes.Material[] = [];

        const outerMaterial = new THREE.LineBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
        });
        const outerGridMaterial = new THREE.LineBasicMaterial({
          color: "#bcd4e4",
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        const cageMaterial = new THREE.LineBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
        });
        const innerMaterial = new THREE.LineBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        });
        disposableMaterials.push(outerMaterial, outerGridMaterial, cageMaterial, innerMaterial);

        const outerGrid = makeSphereGrid(THREE, OUTER_RADIUS, 5, 7, outerGridMaterial);
        instrument.add(outerGrid);

        const boundary = makeCircle(THREE, OUTER_RADIUS, outerMaterial);
        boundary.rotation.x = Math.PI / 2;
        instrument.add(boundary);

        const cylinderA = makeCylinderGrid(THREE, 2.17, 2.48, 16, 6, cageMaterial);
        cylinderA.rotation.set(0.54, 0.12, 0.62);
        instrument.add(cylinderA);

        const cylinderB = makeCylinderGrid(THREE, 1.68, 3.84, 14, 7, cageMaterial);
        cylinderB.rotation.set(-0.32, 0.78, -0.86);
        instrument.add(cylinderB);

        const cylinderC = makeCylinderGrid(THREE, 1.13, 2.04, 12, 5, innerMaterial);
        cylinderC.rotation.set(0.96, -0.42, 0.18);
        instrument.add(cylinderC);

        const bandGeometry = new THREE.TorusGeometry(2.22, 0.012, 6, 220);
        const bandMaterial = new THREE.MeshBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        const solidBand = new THREE.Mesh(bandGeometry, bandMaterial);
        solidBand.rotation.set(1.24, 0.2, 0.04);
        instrument.add(solidBand);
        disposableGeometries.push(bandGeometry);
        disposableMaterials.push(bandMaterial);

        const dashMaterial = new THREE.LineDashedMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.72,
          dashSize: 0.11,
          gapSize: 0.075,
          depthWrite: false,
        });
        const signalDashMaterial = new THREE.LineDashedMaterial({
          color: "#000000",
          transparent: true,
          opacity: 0.78,
          dashSize: 0.018,
          gapSize: 0.038,
          depthWrite: false,
        });
        disposableMaterials.push(dashMaterial, signalDashMaterial);

        const orbitA = makeOrbitalArc(THREE, 2.34, dashMaterial);
        orbitA.rotation.set(0.42, 0.28, -0.18);
        instrument.add(orbitA);

        const orbitB = makeOrbitalArc(THREE, 2.52, signalDashMaterial);
        orbitB.rotation.set(1.18, -0.36, 0.67);
        instrument.add(orbitB);

        const innerSphere = makeSphereGrid(THREE, 0.58, 6, 9, innerMaterial);
        innerSphere.position.set(0.04, 0.5, 0.02);
        instrument.add(innerSphere);

        const coreGeometry = new THREE.SphereGeometry(0.105, 28, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({ color: "#e1fe0e" });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.copy(innerSphere.position);
        instrument.add(core);
        disposableGeometries.push(coreGeometry);
        disposableMaterials.push(coreMaterial);

        const islandGeometry = makeIslandGeometry(THREE);
        const islandMaterial = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: 0.96,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        const island = new THREE.Mesh(islandGeometry, islandMaterial);
        island.rotation.y = -0.3;
        island.scale.set(1.18, 1, 1.18);
        instrument.add(island);
        disposableGeometries.push(islandGeometry);
        disposableMaterials.push(islandMaterial);

        const contourMaterial = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          uniforms: { contourColor: { value: new THREE.Color("#305579") } },
          vertexShader: `
            varying float vElevation;
            void main() {
              vElevation = position.y;
              vec3 lifted = position + normal * 0.006;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(lifted, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 contourColor;
            varying float vElevation;
            void main() {
              float band = fract((vElevation + 0.35) * 14.0);
              float distanceToBand = min(band, 1.0 - band);
              float contour = 1.0 - smoothstep(0.018, 0.07, distanceToBand);
              if (contour < 0.14) discard;
              gl_FragColor = vec4(contourColor, contour * 0.9);
            }
          `,
        });
        const contours = new THREE.Mesh(islandGeometry, contourMaterial);
        contours.rotation.copy(island.rotation);
        contours.scale.copy(island.scale);
        instrument.add(contours);
        disposableMaterials.push(contourMaterial);

        const islandWireGeometry = new THREE.WireframeGeometry(islandGeometry);
        const islandWireMaterial = new THREE.LineBasicMaterial({
          color: "#bcd4e4",
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        const islandWire = new THREE.LineSegments(islandWireGeometry, islandWireMaterial);
        islandWire.rotation.copy(island.rotation);
        islandWire.scale.set(1.182, 1.002, 1.182);
        instrument.add(islandWire);
        disposableGeometries.push(islandWireGeometry);
        disposableMaterials.push(islandWireMaterial);

        const islandRimMaterial = new THREE.LineBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        });
        const islandRim = makeCircle(THREE, 1.345, islandRimMaterial);
        islandRim.position.y = -0.225;
        islandRim.rotation.y = -0.3;
        instrument.add(islandRim);
        disposableMaterials.push(islandRimMaterial);

        const beaconGeometry = new THREE.SphereGeometry(0.045, 16, 10);
        const beaconMaterial = new THREE.MeshBasicMaterial({ color: "#305579" });
        const activeBeaconMaterial = new THREE.MeshBasicMaterial({ color: "#e1fe0e" });
        disposableGeometries.push(beaconGeometry);
        disposableMaterials.push(beaconMaterial, activeBeaconMaterial);

        const beaconPositions = [
          [-0.72, -0.18, -0.28, 1.05],
          [0.58, -0.17, -0.18, 1.42],
          [-0.16, -0.04, 0.62, 0.88],
          [0.76, -0.2, 0.48, 1.18],
          [-0.54, -0.13, 0.46, 1.3],
        ];
        const beaconStemMaterial = new THREE.LineBasicMaterial({
          color: "#305579",
          transparent: true,
          opacity: 0.64,
        });
        disposableMaterials.push(beaconStemMaterial);

        beaconPositions.forEach(([x, baseY, z, topY], index) => {
          const stemGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, baseY, z),
            new THREE.Vector3(x, topY, z),
          ]);
          const stem = new THREE.Line(stemGeometry, beaconStemMaterial);
          instrument.add(stem);
          disposableGeometries.push(stemGeometry);

          const marker = new THREE.Mesh(
            beaconGeometry,
            index === 1 ? activeBeaconMaterial : beaconMaterial,
          );
          marker.position.set(x, topY, z);
          marker.userData.phase = index * 1.4;
          instrument.add(marker);
        });

        const ambient = new THREE.HemisphereLight("#ffffff", "#bcd4e4", 2.5);
        scene.add(ambient);
        const key = new THREE.DirectionalLight("#ffffff", 3.4);
        key.position.set(-3.4, 5.6, 5.4);
        scene.add(key);

        const pointer = { x: 0, y: 0 };
        const targetPointer = { x: 0, y: 0 };
        const onPointerMove = (event: PointerEvent) => {
          const bounds = host.getBoundingClientRect();
          targetPointer.x = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2;
          targetPointer.y = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2;
        };
        const onPointerLeave = () => {
          targetPointer.x = 0;
          targetPointer.y = 0;
        };
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerleave", onPointerLeave);

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(1, height);
          const halfField = width < 720 ? 2.78 : 3.02;
          const verticalFit = halfField / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
          const horizontalFit = verticalFit / Math.max(camera.aspect, 0.1);
          camera.position.z = Math.max(verticalFit, horizontalFit) * 1.11;
          camera.position.y = width < 720 ? 2.25 : 3;
          camera.updateProjectionMatrix();
          camera.lookAt(0, 0, 0);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const startTime = window.performance.now();
        let animationFrame = 0;

        const render = () => {
          const elapsed = reducedMotion ? 8.6 : (window.performance.now() - startTime) / 1000;
          pointer.x += (targetPointer.x - pointer.x) * 0.035;
          pointer.y += (targetPointer.y - pointer.y) * 0.035;

          instrument.rotation.x = -0.13 - pointer.y * 0.075 + Math.sin(elapsed * 0.17) * 0.018;
          instrument.rotation.y = 0.22 + pointer.x * 0.11 + Math.sin(elapsed * 0.11) * 0.035;

          cylinderA.rotation.y = 0.12 + elapsed * 0.075;
          cylinderA.rotation.z = 0.62 + Math.sin(elapsed * 0.23) * 0.08;
          cylinderB.rotation.x = -0.32 - elapsed * 0.046;
          cylinderB.rotation.y = 0.78 + elapsed * 0.028;
          cylinderC.rotation.z = 0.18 + elapsed * 0.115;
          solidBand.rotation.y = 0.2 + elapsed * 0.041;
          solidBand.rotation.z = 0.04 + Math.sin(elapsed * 0.19) * 0.055;
          orbitA.rotation.y = 0.28 - elapsed * 0.052;
          orbitB.rotation.z = 0.67 + elapsed * 0.036;
          innerSphere.rotation.y = elapsed * 0.082;
          innerSphere.rotation.x = Math.sin(elapsed * 0.2) * 0.1;

          instrument.children.forEach((child) => {
            if (typeof child.userData.phase !== "number") return;
            const pulse = 0.78 + Math.sin(elapsed * 1.35 + child.userData.phase) * 0.18;
            child.scale.setScalar(pulse);
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
          instrument.traverse((object) => {
            if (object instanceof THREE.Line || object instanceof THREE.LineLoop || object instanceof THREE.LineSegments) {
              object.geometry.dispose();
            }
          });
          disposableGeometries.forEach((geometry) => geometry.dispose());
          disposableMaterials.forEach((material) => material.dispose());
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
    <div className="atlas-shell">
      <SiteNavigation active="atlas" />
      <section className={`atlas-field is-${loadState}`} aria-live="polite">
        <div ref={hostRef} className="atlas-canvas" />
        {loadState === "loading" && <div className="atlas-loading" aria-label="Loading orbital atlas" />}
        {loadState === "error" && <div className="atlas-error">Unable to initialize atlas</div>}
      </section>
    </div>
  );
}

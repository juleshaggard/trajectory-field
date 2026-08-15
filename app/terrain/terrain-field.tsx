"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import { SiteNavigation } from "../site-navigation";

type LoadState = "loading" | "ready" | "error";

const easeInOutCubic = (value: number) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);

export function TerrainField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
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

        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 5.2);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute(
          "aria-label",
          "Animated three-dimensional terrain sphere rotating between timed holds beneath a fixed crosshair",
        );
        host.appendChild(renderer.domElement);

        const terrainGroup = new THREE.Group();
        terrainGroup.rotation.set(-0.14, 0.38, -0.035);
        scene.add(terrainGroup);

        const geometry = new THREE.IcosahedronGeometry(1.48, 5);
        const positions = geometry.attributes.position as ThreeTypes.BufferAttribute;
        const vector = new THREE.Vector3();

        for (let index = 0; index < positions.count; index += 1) {
          vector.fromBufferAttribute(positions, index).normalize();
          const x = vector.x;
          const y = vector.y;
          const z = vector.z;
          const broad =
            Math.sin(x * 3.7 + y * 1.9 - z * 2.6) * 0.052 +
            Math.sin(y * 5.3 + z * 3.1 + x * 1.4) * 0.041 +
            Math.cos(z * 4.4 - x * 2.2 + y * 2.7) * 0.038;
          const ridges =
            Math.abs(Math.sin(x * 8.8 + z * 6.1)) * 0.026 +
            Math.abs(Math.cos(y * 10.4 - x * 4.6)) * 0.018;
          const fine = Math.sin((x + y - z) * 19.2) * 0.012;
          const radius = 1 + broad + ridges + fine;
          vector.multiplyScalar(1.48 * radius);
          positions.setXYZ(index, vector.x, vector.y, vector.z);
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();

        const terrainMaterial = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: 0.91,
          metalness: 0.02,
          flatShading: false,
        });
        const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
        terrainGroup.add(terrainMesh);

        const contourMaterial = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          uniforms: {
            contourColor: { value: new THREE.Color("#305579") },
          },
          vertexShader: `
            varying float vElevation;
            void main() {
              vElevation = length(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 contourColor;
            varying float vElevation;
            void main() {
              float band = fract(vElevation * 25.0);
              float distanceToBand = min(band, 1.0 - band);
              float contour = 1.0 - smoothstep(0.018, 0.065, distanceToBand);
              if (contour < 0.16) discard;
              gl_FragColor = vec4(contourColor, contour * 0.9);
            }
          `,
        });
        const contourMesh = new THREE.Mesh(geometry, contourMaterial);
        contourMesh.scale.setScalar(1.0015);
        terrainGroup.add(contourMesh);

        const wireGeometry = new THREE.WireframeGeometry(geometry);
        const wireMaterial = new THREE.LineBasicMaterial({
          color: "#bcd4e4",
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
        const wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
        wireMesh.scale.setScalar(1.0025);
        terrainGroup.add(wireMesh);

        const rimGeometry = new THREE.SphereGeometry(1.51, 64, 32);
        const rimMaterial = new THREE.MeshBasicMaterial({
          color: "#305579",
          wireframe: true,
          transparent: true,
          opacity: 0.055,
          depthWrite: false,
        });
        const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
        terrainGroup.add(rimMesh);

        const ambient = new THREE.HemisphereLight("#ffffff", "#bcd4e4", 2.25);
        scene.add(ambient);
        const key = new THREE.DirectionalLight("#ffffff", 3.2);
        key.position.set(-3.4, 4.6, 5.8);
        scene.add(key);
        const fill = new THREE.DirectionalLight("#bcd4e4", 1.45);
        fill.position.set(4.2, -2.1, 2.8);
        scene.add(fill);

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(1, height);
          const halfField = 1.72;
          const verticalFit = halfField / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
          const horizontalFit = verticalFit / Math.max(camera.aspect, 0.1);
          const framingMargin = width < 720 ? 1.22 : 1.42;
          camera.position.z = Math.max(verticalFit, horizontalFit) * framingMargin;
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const startTime = window.performance.now();
        const baseRotation = { x: -0.14, y: 0.38, z: -0.035 };
        let animationFrame = 0;
        let previousPhase = "";

        const render = () => {
          const elapsed = reducedMotion ? 2.6 : (window.performance.now() - startTime) / 1000;
          const cycle = elapsed % 6.4;
          let travel = 0;
          let phase = "ROTATE R";

          if (cycle < 2.6) {
            travel = easeInOutCubic(cycle / 2.6);
          } else if (cycle < 3.1) {
            travel = 1;
            phase = "HOLD 0.5";
          } else if (cycle < 5.4) {
            travel = 1 - easeInOutCubic((cycle - 3.1) / 2.3);
            phase = "ROTATE L";
          } else {
            travel = 0;
            phase = "HOLD 1.0";
          }

          terrainGroup.rotation.x = baseRotation.x + travel * 0.16;
          terrainGroup.rotation.y = baseRotation.y + travel * 0.84;
          terrainGroup.rotation.z = baseRotation.z + Math.sin(travel * Math.PI) * 0.075;

          key.position.x = -3.4 + travel * 1.2;
          fill.position.y = -2.1 + travel * 0.7;

          if (phase !== previousPhase) {
            previousPhase = phase;
            if (phaseRef.current) phaseRef.current.textContent = phase;
          }
          if (headingRef.current) {
            const heading = 214 + travel * 48;
            headingRef.current.textContent = `${Math.round(heading).toString().padStart(3, "0")}°`;
          }

          renderer.render(scene, camera);
          if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
        };

        setLoadState("ready");
        render();

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          geometry.dispose();
          terrainMaterial.dispose();
          contourMaterial.dispose();
          wireGeometry.dispose();
          wireMaterial.dispose();
          rimGeometry.dispose();
          rimMaterial.dispose();
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
    <div className="terrain-shell">
      <SiteNavigation active="terrain" />
      <section className={`terrain-field is-${loadState}`} aria-live="polite">
        <div ref={hostRef} className="terrain-canvas" />
        {loadState === "loading" && <div className="terrain-loading" aria-label="Loading terrain instrument" />}
        {loadState === "error" && (
          <div className="terrain-error" role="alert">
            3D terrain unavailable
          </div>
        )}

        <div className="terrain-crosshair" aria-hidden="true">
          <span className="terrain-crosshair__horizontal" />
          <span className="terrain-crosshair__vertical" />
          <span className="terrain-crosshair__center" />
          <span className="terrain-crosshair__north" />
          <span className="terrain-crosshair__east" />
          <span className="terrain-crosshair__south" />
          <span className="terrain-crosshair__west" />
        </div>

        <div className="terrain-telemetry terrain-telemetry--top-left">
          <span>RELIEF / LIVE</span>
          <strong ref={headingRef}>214°</strong>
        </div>
        <div className="terrain-telemetry terrain-telemetry--top-right">
          <span>MOTION PHASE</span>
          <strong ref={phaseRef}>ROTATE R</strong>
        </div>
        <div className="terrain-telemetry terrain-telemetry--bottom-left">
          <span>MESH / ICOSPHERE</span>
          <strong>10.2K</strong>
        </div>
        <div className="terrain-telemetry terrain-telemetry--bottom-right">
          <span>RELIEF / RANGE</span>
          <strong>±184 M</strong>
        </div>
      </section>
    </div>
  );
}

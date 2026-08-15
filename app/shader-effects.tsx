"use client";

import { useEffect, useRef, useState } from "react";

type ShaderMode = "halftone" | "pixel" | "scanline" | "dither";
type ShaderColor = "ink" | "navy" | "signal";
type ShaderBlend = "multiply" | "overlay" | "screen" | "normal";

type ShaderSettings = {
  enabled: boolean;
  mode: ShaderMode;
  color: ShaderColor;
  blend: ShaderBlend;
  cellSize: number;
  strength: number;
  hardness: number;
  grain: number;
  angle: number;
  speed: number;
};

const STORAGE_KEY = "trajectory-shader-settings-v2";

const DEFAULT_SETTINGS: ShaderSettings = {
  enabled: true,
  mode: "halftone",
  color: "navy",
  blend: "overlay",
  cellSize: 10,
  strength: 72,
  hardness: 94,
  grain: 0,
  angle: 67,
  speed: 7,
};

const COLOR_VALUES: Record<ShaderColor, [number, number, number]> = {
  ink: [0, 0, 0],
  navy: [48 / 255, 85 / 255, 121 / 255],
  signal: [225 / 255, 254 / 255, 14 / 255],
};

const MODE_VALUES: Record<ShaderMode, number> = {
  halftone: 0,
  pixel: 1,
  scanline: 2,
  dither: 3,
};

const BLEND_VALUES: Record<ShaderBlend, number> = {
  multiply: 0,
  overlay: 1,
  screen: 2,
  normal: 3,
};

const VERTEX_SHADER = `#version 300 es

  in vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `#version 300 es

  precision highp float;
  precision highp int;

  uniform sampler2D u_source;
  uniform vec4 u_sourceRect;
  uniform float u_time;
  uniform float u_mode;
  uniform float u_blend;
  uniform float u_scale;
  uniform float u_strength;
  uniform float u_hardness;
  uniform float u_grain;
  uniform float u_angle;
  uniform float u_speed;
  uniform vec3 u_color;

  out vec4 outputColor;

  const float BAYER_8[64] = float[64](
     0.0, 48.0, 12.0, 60.0,  3.0, 51.0, 15.0, 63.0,
    32.0, 16.0, 44.0, 28.0, 35.0, 19.0, 47.0, 31.0,
     8.0, 56.0,  4.0, 52.0, 11.0, 59.0,  7.0, 55.0,
    40.0, 24.0, 36.0, 20.0, 43.0, 27.0, 39.0, 23.0,
     2.0, 50.0, 14.0, 62.0,  1.0, 49.0, 13.0, 61.0,
    34.0, 18.0, 46.0, 30.0, 33.0, 17.0, 45.0, 29.0,
    10.0, 58.0,  6.0, 54.0,  9.0, 57.0,  5.0, 53.0,
    42.0, 26.0, 38.0, 22.0, 41.0, 25.0, 37.0, 21.0
  );

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  mat2 rotate2d(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
  }

  float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  vec4 fetchSource(vec2 uv) {
    ivec2 size = textureSize(u_source, 0);
    ivec2 coordinate = clamp(
      ivec2(floor(clamp(uv, 0.0, 1.0) * vec2(size))),
      ivec2(0),
      size - ivec2(1)
    );
    return texelFetch(u_source, coordinate, 0);
  }

  float bayerThreshold(ivec2 coordinate) {
    int index = (coordinate.y & 7) * 8 + (coordinate.x & 7);
    return (BAYER_8[index] + 0.5) / 64.0;
  }

  vec3 quantize(vec3 color, float levels) {
    return floor(color * (levels - 1.0) + 0.5) / (levels - 1.0);
  }

  vec3 overlayBlend(vec3 base, vec3 effect) {
    vec3 low = 2.0 * base * effect;
    vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - effect);
    return mix(low, high, step(vec3(0.5), base));
  }

  vec3 applyBlend(vec3 base, vec3 effect) {
    if (u_blend < 0.5) return base * effect;
    if (u_blend < 1.5) return overlayBlend(base, effect);
    if (u_blend < 2.5) return 1.0 - (1.0 - base) * (1.0 - effect);
    return effect;
  }

  void main() {
    vec2 sourcePoint = gl_FragCoord.xy - u_sourceRect.xy;
    if (
      sourcePoint.x < 0.0 || sourcePoint.y < 0.0 ||
      sourcePoint.x > u_sourceRect.z || sourcePoint.y > u_sourceRect.w
    ) discard;

    vec2 sourceUv = clamp(sourcePoint / u_sourceRect.zw, 0.0, 1.0);
    float animatedTime = u_time * u_speed;
    float row = floor(sourcePoint.y / max(2.0, u_scale));
    float sampleShift = sin(row * 0.73 + animatedTime * 2.0) * u_speed * 0.006;
    vec2 liveUv = clamp(sourceUv + vec2(sampleShift, 0.0), 0.0, 1.0);
    vec4 sourceSample = fetchSource(liveUv);

    vec2 centered = sourcePoint - u_sourceRect.zw * 0.5;
    vec2 point = rotate2d(u_angle) * centered + u_sourceRect.zw * 0.5;

    vec2 cell = floor(point / u_scale);
    vec2 local = fract(point / u_scale) - 0.5;
    vec2 cellCenter = (cell + 0.5) * u_scale;
    vec2 unrotatedCenter = rotate2d(-u_angle) * (cellCenter - u_sourceRect.zw * 0.5) + u_sourceRect.zw * 0.5;
    vec2 cellUv = clamp(unrotatedCenter / u_sourceRect.zw + vec2(sampleShift, 0.0), 0.0, 1.0);
    vec3 cellColor = fetchSource(cellUv).rgb;
    float cellInk = 1.0 - luminance(cellColor);
    vec3 processed = sourceSample.rgb;

    if (u_mode < 0.5) {
      float radius = sqrt(clamp(cellInk, 0.0, 1.0)) * 0.69;
      float distanceToDot = length(local);
      float antialias = max(fwidth(distanceToDot), mix(0.09, 0.002, u_hardness));
      float dotShape = 1.0 - smoothstep(radius - antialias, radius + antialias, distanceToDot);
      vec3 halftone = mix(vec3(1.0), u_color, dotShape);
      processed = applyBlend(sourceSample.rgb, halftone);
    } else if (u_mode < 1.5) {
      float levels = mix(12.0, 3.0, u_hardness);
      vec3 pixelColor = quantize(cellColor, levels);
      float pixelInk = 1.0 - luminance(pixelColor);
      pixelColor = mix(pixelColor, u_color * max(luminance(pixelColor), 0.24), pixelInk * 0.62);
      processed = applyBlend(sourceSample.rgb, pixelColor);
    } else if (u_mode < 2.5) {
      float scanPhase = abs(local.y);
      float scanEdge = max(fwidth(scanPhase), mix(0.08, 0.006, u_hardness));
      float scan = mix(0.48, 1.0, smoothstep(0.08 - scanEdge, 0.38 + scanEdge, scanPhase));
      float sourceInk = 1.0 - luminance(sourceSample.rgb);
      vec3 scanColor = sourceSample.rgb * scan;
      scanColor = mix(scanColor, u_color * scan, sourceInk * 0.38);
      processed = applyBlend(sourceSample.rgb, scanColor);
    } else {
      ivec2 ditherCoordinate = ivec2(floor(point / max(1.0, u_scale * 0.22)));
      float threshold = bayerThreshold(ditherCoordinate);
      float temporalNoise = hash21(vec2(ditherCoordinate) + floor(animatedTime * 12.0)) - 0.5;
      threshold = clamp(threshold + temporalNoise * u_grain * 0.34, 0.0, 1.0);
      float levels = mix(8.0, 2.0, u_hardness);
      vec3 scaled = clamp(cellColor, 0.0, 1.0) * (levels - 1.0);
      vec3 dithered = (floor(scaled) + step(vec3(threshold), fract(scaled))) / (levels - 1.0);
      float ditherLuma = luminance(dithered);
      vec3 ditherColor = mix(u_color, vec3(1.0), ditherLuma);
      processed = applyBlend(sourceSample.rgb, ditherColor);
    }

    float fineNoise = hash21(gl_FragCoord.xy + floor(animatedTime * 18.0)) - 0.5;
    float sourceInk = 1.0 - luminance(sourceSample.rgb);
    processed += fineNoise * u_grain * 0.16 * (0.2 + sourceInk * 0.8);
    vec3 result = mix(sourceSample.rgb, processed, u_strength);
    outputColor = vec4(clamp(result, 0.0, 1.0), sourceSample.a);
  }
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function loadSettings(): ShaderSettings {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<ShaderSettings>) };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_SETTINGS;
  }
}

function findSourceCanvas(overlay: HTMLCanvasElement) {
  const overlayRect = overlay.getBoundingClientRect();
  let bestCanvas: HTMLCanvasElement | null = null;
  let bestArea = 0;

  document.querySelectorAll<HTMLCanvasElement>("canvas").forEach((candidate) => {
    if (candidate === overlay || candidate.classList.contains("shader-effects__canvas")) return;
    const rect = candidate.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, overlayRect.right) - Math.max(rect.left, overlayRect.left));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, overlayRect.bottom) - Math.max(rect.top, overlayRect.top));
    const area = visibleWidth * visibleHeight;
    if (area > bestArea && candidate.width > 0 && candidate.height > 0) {
      bestArea = area;
      bestCanvas = candidate;
    }
  });

  return bestCanvas;
}

export function ShaderEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<ShaderSettings>(DEFAULT_SETTINGS);
  const loadedRef = useRef(false);
  const [settings, setSettings] = useState<ShaderSettings>(DEFAULT_SETTINGS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const saved = loadSettings();
    settingsRef.current = saved;
    queueMicrotask(() => {
      setSettings(saved);
      loadedRef.current = true;
      window.dispatchEvent(new CustomEvent("trajectory:shader-state", { detail: { enabled: saved.enabled } }));
    });

    const togglePanel = () => setPanelOpen((open) => !open);
    const closePanel = () => setPanelOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f" && event.shiftKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setPanelOpen((open) => !open);
      }
    };
    window.addEventListener("trajectory:shader-panel-toggle", togglePanel);
    window.addEventListener("trajectory:shader-panel-close", closePanel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("trajectory:shader-panel-toggle", togglePanel);
      window.removeEventListener("trajectory:shader-panel-close", closePanel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    if (!loadedRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("trajectory:shader-state", { detail: { enabled: settings.enabled } }));
  }, [settings]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("trajectory:shader-panel-state", { detail: { open: panelOpen } }));
  }, [panelOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.error("[FX] WebGL2 context unavailable");
      queueMicrotask(() => setSupported(false));
      return;
    }

    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let sourceTexture: WebGLTexture | null = null;
    let animationFrame = 0;

    try {
      vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      if (!program) throw new Error("Unable to create shader program");
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Shader linking failed");
      }
      gl.useProgram(program);

      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const source = gl.getUniformLocation(program, "u_source");
      const sourceRect = gl.getUniformLocation(program, "u_sourceRect");
      const time = gl.getUniformLocation(program, "u_time");
      const mode = gl.getUniformLocation(program, "u_mode");
      const blend = gl.getUniformLocation(program, "u_blend");
      const scale = gl.getUniformLocation(program, "u_scale");
      const strength = gl.getUniformLocation(program, "u_strength");
      const hardness = gl.getUniformLocation(program, "u_hardness");
      const grain = gl.getUniformLocation(program, "u_grain");
      const angle = gl.getUniformLocation(program, "u_angle");
      const speed = gl.getUniformLocation(program, "u_speed");
      const color = gl.getUniformLocation(program, "u_color");
      sourceTexture = gl.createTexture();
      if (!sourceTexture) throw new Error("Unable to create source texture");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.uniform1i(source, 0);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const startedAt = window.performance.now();
      let pixelRatio = 1;
      let textureWidth = 0;
      let textureHeight = 0;
      let activeSource: HTMLCanvasElement | null = null;
      let frame = 0;

      const resize = () => {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
        const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      const render = (now: number) => {
        resize();
        const active = settingsRef.current;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (active.enabled) {
          if (!activeSource || !activeSource.isConnected || frame % 45 === 0) {
            activeSource = findSourceCanvas(canvas);
          }
          frame += 1;

          if (activeSource) {
            const [red, green, blue] = COLOR_VALUES[active.color];
            const overlayBounds = canvas.getBoundingClientRect();
            const sourceBounds = activeSource.getBoundingClientRect();
            const rectX = (sourceBounds.left - overlayBounds.left) * pixelRatio;
            const rectY = (overlayBounds.bottom - sourceBounds.bottom) * pixelRatio;
            const rectWidth = sourceBounds.width * pixelRatio;
            const rectHeight = sourceBounds.height * pixelRatio;

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
            if (textureWidth !== activeSource.width || textureHeight !== activeSource.height) {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, activeSource);
              textureWidth = activeSource.width;
              textureHeight = activeSource.height;
            } else {
              gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, activeSource);
            }

            gl.uniform4f(sourceRect, rectX, rectY, rectWidth, rectHeight);
            gl.uniform1f(time, reducedMotion ? 0 : (now - startedAt) / 1000);
            gl.uniform1f(mode, MODE_VALUES[active.mode]);
            gl.uniform1f(blend, BLEND_VALUES[active.blend]);
            gl.uniform1f(scale, active.cellSize * pixelRatio);
            gl.uniform1f(strength, active.strength / 100);
            gl.uniform1f(hardness, active.hardness / 100);
            gl.uniform1f(grain, active.grain / 100);
            gl.uniform1f(angle, active.angle * Math.PI / 180);
            gl.uniform1f(speed, active.speed / 100);
            gl.uniform3f(color, red, green, blue);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
        }

        animationFrame = window.requestAnimationFrame(render);
      };
      animationFrame = window.requestAnimationFrame(render);

      return () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        if (buffer) gl.deleteBuffer(buffer);
        if (sourceTexture) gl.deleteTexture(sourceTexture);
        if (program) gl.deleteProgram(program);
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
      };
    } catch (error) {
      console.error("[FX] Shader initialization failed", error);
      queueMicrotask(() => setSupported(false));
      if (buffer) gl.deleteBuffer(buffer);
      if (sourceTexture) gl.deleteTexture(sourceTexture);
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return;
    }
  }, []);

  const update = <Key extends keyof ShaderSettings>(key: Key, value: ShaderSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const reset = () => setSettings(DEFAULT_SETTINGS);

  return (
    <div className="shader-effects" data-enabled={settings.enabled && supported ? "true" : "false"}>
      <canvas
        ref={canvasRef}
        className="shader-effects__canvas"
        aria-hidden="true"
      />

      <aside
        id="global-shader-controls"
        className="shader-panel"
        hidden={!panelOpen}
        aria-label="Global shader effects"
      >
        <div className="shader-panel__head">
          <div>
            <span>Canvas pass</span>
            <strong>Signal Processor</strong>
          </div>
          <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close shader effects">
            Close
          </button>
        </div>

        <div className="shader-panel__power">
          <label className="toggle-row">
            <span>Post-process</span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
            />
            <span className="toggle-track" aria-hidden="true"><span /></span>
          </label>
          <span className={`shader-panel__status${settings.enabled && supported ? " is-live" : ""}`}>
            {supported ? (settings.enabled ? "Live" : "Bypass") : "Unavailable"}
          </span>
        </div>

        <div className="shader-panel__modes" role="group" aria-label="Shader pattern">
          {(["halftone", "pixel", "scanline", "dither"] as ShaderMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={settings.mode === mode ? "is-selected" : ""}
              aria-pressed={settings.mode === mode}
              onClick={() => update("mode", mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="shader-panel__selects">
          <label>
            <span>Blend</span>
            <select value={settings.blend} onChange={(event) => update("blend", event.target.value as ShaderBlend)}>
              <option value="multiply">Multiply</option>
              <option value="overlay">Overlay</option>
              <option value="screen">Screen</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <fieldset>
            <legend>Ink</legend>
            <div className="shader-panel__colors">
              {(["ink", "navy", "signal"] as ShaderColor[]).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`shader-color shader-color--${color}${settings.color === color ? " is-selected" : ""}`}
                  aria-label={`${color} shader color`}
                  aria-pressed={settings.color === color}
                  onClick={() => update("color", color)}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="shader-panel__ranges">
          <label className="range-row">
            <span>Cell size <output aria-hidden="true">{settings.cellSize}px</output></span>
            <input aria-label="Cell size" type="range" min="3" max="24" step="1" value={settings.cellSize} onInput={(event) => update("cellSize", Number(event.currentTarget.value))} />
          </label>
          <label className="range-row">
            <span>Strength <output aria-hidden="true">{settings.strength}%</output></span>
            <input aria-label="Strength" type="range" min="0" max="100" step="1" value={settings.strength} onInput={(event) => update("strength", Number(event.currentTarget.value))} />
          </label>
          <label className="range-row">
            <span>Edge <output aria-hidden="true">{settings.hardness}%</output></span>
            <input aria-label="Edge hardness" type="range" min="0" max="100" step="1" value={settings.hardness} onInput={(event) => update("hardness", Number(event.currentTarget.value))} />
          </label>
          <label className="range-row">
            <span>Grain <output aria-hidden="true">{settings.grain}%</output></span>
            <input aria-label="Grain" type="range" min="0" max="60" step="1" value={settings.grain} onInput={(event) => update("grain", Number(event.currentTarget.value))} />
          </label>
          <label className="range-row">
            <span>Angle <output aria-hidden="true">{settings.angle}°</output></span>
            <input aria-label="Angle" type="range" min="0" max="90" step="1" value={settings.angle} onInput={(event) => update("angle", Number(event.currentTarget.value))} />
          </label>
          <label className="range-row">
            <span>Motion <output aria-hidden="true">{settings.speed}%</output></span>
            <input aria-label="Motion" type="range" min="0" max="100" step="1" value={settings.speed} onInput={(event) => update("speed", Number(event.currentTarget.value))} />
          </label>
        </div>

        <div className="shader-panel__foot">
          <span>Shift + F</span>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      </aside>
    </div>
  );
}

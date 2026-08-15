"use client";

import { useEffect, useState } from "react";

const SITE_BASE = import.meta.env.BASE_URL || "/";

function routeHref(path = "") {
  return path ? `${SITE_BASE}${path.replace(/^\/+/, "")}` : SITE_BASE;
}

type ActivePage =
  | "live"
  | "compass"
  | "terrain"
  | "map"
  | "traffic"
  | "airspace"
  | "plotter"
  | "radar"
  | "drum"
  | "pulse"
  | "atlas"
  | "blank"
  | "archive";

export function SiteNavigation({
  active,
  controlsOpen = false,
  onControls,
}: {
  active: ActivePage;
  controlsOpen?: boolean;
  onControls?: () => void;
}) {
  const [shaderEnabled, setShaderEnabled] = useState(true);
  const [shaderPanelOpen, setShaderPanelOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("trajectory-shader-settings-v2");
    if (saved) {
      try {
        const settings = JSON.parse(saved) as { enabled?: boolean };
        queueMicrotask(() => setShaderEnabled(settings.enabled !== false));
      } catch {
        window.localStorage.removeItem("trajectory-shader-settings-v2");
      }
    }

    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      if (detail) setShaderEnabled(detail.enabled);
    };
    const onPanelState = (event: Event) => {
      const detail = (event as CustomEvent<{ open: boolean }>).detail;
      if (detail) setShaderPanelOpen(detail.open);
    };
    window.addEventListener("trajectory:shader-state", onState);
    window.addEventListener("trajectory:shader-panel-state", onPanelState);
    return () => {
      window.removeEventListener("trajectory:shader-state", onState);
      window.removeEventListener("trajectory:shader-panel-state", onPanelState);
    };
  }, []);

  const openShaderPanel = () => {
    if (controlsOpen && onControls) onControls();
    window.dispatchEvent(new Event("trajectory:shader-panel-toggle"));
  };

  const openGraphControls = () => {
    window.dispatchEvent(new Event("trajectory:shader-panel-close"));
    onControls?.();
  };

  return (
    <header className="site-nav">
      <div className="site-nav__inner">
        <a className="site-nav__brand" href={routeHref()} aria-label="Trajectory Field home">
          <span className="site-nav__mark" aria-hidden="true" />
          <span>Trajectory Field</span>
        </a>
        <nav className="site-nav__pages" aria-label="Instrument pages">
          <a className={active === "live" ? "is-active" : ""} href={routeHref()}>
            Trajectory
          </a>
          <a className={active === "compass" ? "is-active" : ""} href={routeHref("compass")}>
            Compass
          </a>
          <a className={active === "terrain" ? "is-active" : ""} href={routeHref("terrain")}>
            Terrain
          </a>
          <a className={active === "map" ? "is-active" : ""} href={routeHref("map")}>
            Map
          </a>
          <a className={active === "traffic" ? "is-active" : ""} href={routeHref("traffic")}>
            Traffic
          </a>
          <a className={active === "airspace" ? "is-active" : ""} href={routeHref("airspace")}>
            Airspace
          </a>
          <a className={active === "plotter" ? "is-active" : ""} href={routeHref("plotter")}>
            Plotter
          </a>
          <a className={active === "radar" ? "is-active" : ""} href={routeHref("radar")}>
            Radar
          </a>
          <a className={active === "drum" ? "is-active" : ""} href={routeHref("drum")}>
            Drum
          </a>
          <a className={active === "pulse" ? "is-active" : ""} href={routeHref("pulse")}>
            Pulse
          </a>
          <a className={active === "atlas" ? "is-active" : ""} href={routeHref("atlas")}>
            Atlas
          </a>
          <a className={active === "blank" ? "is-active" : ""} href={routeHref("blank")}>
            Blank
          </a>
          <a className={active === "archive" ? "is-active" : ""} href={routeHref("archive")}>
            Archive
          </a>
        </nav>
        <div className="site-nav__actions">
          {onControls && (
            <button
              type="button"
              className="controls-trigger"
              aria-expanded={controlsOpen}
              aria-controls="graph-controls"
              onClick={openGraphControls}
            >
              Controls
            </button>
          )}
          <button
            type="button"
            className={`shader-trigger${shaderEnabled ? " is-active" : ""}`}
            aria-expanded={shaderPanelOpen}
            aria-controls="global-shader-controls"
            onClick={openShaderPanel}
          >
            <span aria-hidden="true" />
            FX
          </button>
        </div>
      </div>
    </header>
  );
}

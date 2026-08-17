import { createRoot } from "react-dom/client";
import { AirspaceField } from "../app/airspace/airspace-field";
import { AtlasField } from "../app/atlas/atlas-field";
import { CompassField } from "../app/compass/compass-field";
import { DrumField } from "../app/drum/drum-field";
import "../app/globals.css";
import { MapField } from "../app/map/map-field";
import { MouseTrail } from "../app/mouse-trail";
import { PlotterField } from "../app/plotter/plotter-field";
import { PulseField } from "../app/pulse/pulse-field";
import { RadarField } from "../app/radar/radar-field";
import { ShaderEffects } from "../app/shader-effects";
import { SiteNavigation } from "../app/site-navigation";
import { SyntaxField } from "../app/syntax/syntax-field";
import { TerrainField } from "../app/terrain/terrain-field";
import { TrafficField } from "../app/traffic/traffic-field";
import { TrajectoryField } from "../app/trajectory-field";
import { VectorField } from "../app/vector/vector-field";

const ROUTE_TITLES: Record<string, string> = {
  "": "Trajectory Field",
  compass: "Compass — Trajectory Field",
  terrain: "Terrain — Trajectory Field",
  map: "Map — Trajectory Field",
  traffic: "Traffic — Trajectory Field",
  airspace: "Airspace — Trajectory Field",
  plotter: "Plotter — Trajectory Field",
  vector: "Vector — Trajectory Field",
  syntax: "Syntax — Trajectory Field",
  radar: "Radar — Trajectory Field",
  drum: "Drum — Trajectory Field",
  pulse: "Pulse — Trajectory Field",
  atlas: "Atlas — Trajectory Field",
  blank: "Blank — Trajectory Field",
  archive: "Archive — Trajectory Field",
};

const basePath = import.meta.env.BASE_URL;
const relativePath = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.slice(basePath.length)
  : window.location.pathname.replace(/^\/+/, "");
const route = relativePath.split("/").filter(Boolean)[0] || "";

document.title = ROUTE_TITLES[route] || ROUTE_TITLES[""];
document.documentElement.style.setProperty(
  "--flight-cursor-image",
  `url("${basePath}aircraft-cursor.svg")`,
);
document.documentElement.style.setProperty(
  "--flight-cursor-hover-image",
  `url("${basePath}aircraft-cursor-hover.svg")`,
);

function Route() {
  switch (route) {
    case "compass": return <main><CompassField /></main>;
    case "terrain": return <main><TerrainField /></main>;
    case "map": return <main><MapField /></main>;
    case "traffic": return <main><TrafficField /></main>;
    case "airspace": return <main><AirspaceField /></main>;
    case "plotter": return <main><PlotterField /></main>;
    case "vector": return <main><VectorField /></main>;
    case "syntax": return <main><SyntaxField /></main>;
    case "radar": return <main><RadarField /></main>;
    case "drum": return <main><DrumField /></main>;
    case "pulse": return <main><PulseField /></main>;
    case "atlas": return <main><AtlasField /></main>;
    case "blank": return (
      <main className="blank-shell">
        <SiteNavigation active="blank" />
        <div className="blank-field" aria-label="Blank canvas" />
      </main>
    );
    case "archive": return <main><TrajectoryField collection="archive" /></main>;
    default: return <main><TrajectoryField collection="featured" /></main>;
  }
}

createRoot(document.getElementById("root")!).render(
  <>
    <Route />
    <ShaderEffects />
    <MouseTrail />
  </>,
);

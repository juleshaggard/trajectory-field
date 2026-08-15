import type { Metadata } from "next";
import { TerrainField } from "./terrain-field";

export const metadata: Metadata = {
  title: "Terrain — Trajectory Field",
  description: "A rotating three-dimensional terrain sphere in the Trajectory Field visual system.",
};

export default function Terrain() {
  return (
    <main>
      <TerrainField />
    </main>
  );
}

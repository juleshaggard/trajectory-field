import type { Metadata } from "next";
import { MapField } from "./map-field";

export const metadata: Metadata = {
  title: "Map — Trajectory Field",
  description: "A three-dimensional topographic route map with compass bearings and points of interest.",
};

export default function MapPage() {
  return (
    <main>
      <MapField />
    </main>
  );
}

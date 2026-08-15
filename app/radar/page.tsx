import type { Metadata } from "next";
import { RadarField } from "./radar-field";

export const metadata: Metadata = {
  title: "Radar — Trajectory Field",
  description: "An animated mechanical aircraft radar and target acquisition display.",
};

export default function RadarPage() {
  return (
    <main>
      <RadarField />
    </main>
  );
}

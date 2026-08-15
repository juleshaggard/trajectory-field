import type { Metadata } from "next";
import { CompassField } from "./compass-field";

export const metadata: Metadata = {
  title: "Compass — Trajectory Field",
  description: "An animated aircraft compass in the Trajectory Field visual system.",
};

export default function Compass() {
  return (
    <main>
      <CompassField />
    </main>
  );
}

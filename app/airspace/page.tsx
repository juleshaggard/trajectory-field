import type { Metadata } from "next";
import { AirspaceField } from "./airspace-field";

export const metadata: Metadata = {
  title: "Airspace — Trajectory Field",
  description: "A live terminal airspace chart in the Trajectory Field visual system.",
};

export default function Airspace() {
  return (
    <main>
      <AirspaceField />
    </main>
  );
}

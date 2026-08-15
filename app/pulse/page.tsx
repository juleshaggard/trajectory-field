import type { Metadata } from "next";
import { PulseField } from "./pulse-field";

export const metadata: Metadata = {
  title: "Pulse — Trajectory Field",
  description: "An animated dot-matrix revenue pulse in the Trajectory Field visual system.",
};

export default function PulsePage() {
  return (
    <main>
      <PulseField />
    </main>
  );
}

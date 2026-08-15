import type { Metadata } from "next";
import { DrumField } from "./drum-field";

export const metadata: Metadata = {
  title: "Drum — Trajectory Field",
  description: "An interactive three-dimensional radial instrument drum with mechanical scales and inertia.",
};

export default function DrumPage() {
  return (
    <main>
      <DrumField />
    </main>
  );
}

import type { Metadata } from "next";
import { PlotterField } from "./plotter-field";

export const metadata: Metadata = {
  title: "Plotter — Trajectory Field",
  description: "A modular family of live navigation plotting boards.",
};

export default function Plotter() {
  return (
    <main>
      <PlotterField />
    </main>
  );
}

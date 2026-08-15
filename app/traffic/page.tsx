import type { Metadata } from "next";
import { TrafficField } from "./traffic-field";

export const metadata: Metadata = {
  title: "Traffic — Trajectory Field",
  description: "A live animated air traffic control field in the Trajectory Field visual system.",
};

export default function Traffic() {
  return (
    <main>
      <TrafficField />
    </main>
  );
}

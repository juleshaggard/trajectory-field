import type { Metadata } from "next";
import { VectorField } from "./vector-field";

export const metadata: Metadata = {
  title: "Vector — Trajectory Field",
  description: "An interactive two-node vector-flow field with independently controllable layers.",
};

export default function Vector() {
  return (
    <main>
      <VectorField />
    </main>
  );
}

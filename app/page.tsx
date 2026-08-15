import type { Metadata } from "next";
import { TrajectoryField } from "./trajectory-field";

export const metadata: Metadata = {
  title: "Trajectory Field",
  description: "An animated field of projectile-motion studies.",
};

export default function Home() {
  return (
    <main>
      <TrajectoryField collection="featured" />
    </main>
  );
}

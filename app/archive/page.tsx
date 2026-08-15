import type { Metadata } from "next";
import { TrajectoryField } from "../trajectory-field";

export const metadata: Metadata = {
  title: "Archive — Trajectory Field",
  description: "Archived animated projectile-motion studies.",
};

export default function Archive() {
  return (
    <main>
      <TrajectoryField collection="archive" />
    </main>
  );
}

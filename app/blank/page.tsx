import type { Metadata } from "next";
import { SiteNavigation } from "../site-navigation";

export const metadata: Metadata = {
  title: "Blank — Trajectory Field",
  description: "An empty canvas in the Trajectory Field visual system.",
};

export default function Blank() {
  return (
    <main className="blank-shell">
      <SiteNavigation active="blank" />
      <div className="blank-field" aria-label="Blank canvas" />
    </main>
  );
}

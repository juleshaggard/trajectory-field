import type { Metadata } from "next";
import { SyntaxField } from "./syntax-field";

export const metadata: Metadata = {
  title: "Syntax — Trajectory Field",
  description: "A rhythmic field of connected words and tracked organic forms.",
};

export default function Syntax() {
  return (
    <main>
      <SyntaxField />
    </main>
  );
}

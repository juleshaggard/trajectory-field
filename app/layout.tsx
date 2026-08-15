import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trajectory Field",
  description: "An animated field of projectile-motion studies.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

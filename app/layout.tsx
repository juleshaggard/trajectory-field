import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MouseTrail } from "./mouse-trail";
import { ShaderEffects } from "./shader-effects";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body className={`${geist.variable} ${geistMono.variable}`}>
        {children}
        <ShaderEffects />
        <MouseTrail />
      </body>
    </html>
  );
}

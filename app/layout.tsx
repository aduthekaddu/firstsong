import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MotionProvider } from "../components/motion-provider";
import "./globals.css";

const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-opsz-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/fraunces-latin-opsz-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  preload: true,
});

const hankenGrotesk = localFont({
  src: "./fonts/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-hanken",
  display: "swap",
  preload: true,
});

const chivoMono = localFont({
  src: "./fonts/chivo-mono-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-chivo-mono",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://aduthekaddu.github.io/firstsong/"
  ),
  title: {
    default: "FIRSTSONG — From Your First Chord to Your First Original Song",
    template: "%s · FIRSTSONG",
  },
  description:
    "A free six-week guitar and songwriting field manual for complete beginners. Pluck your first strings, learn Em, write one true line, and record a personal hook in 15 minutes — no account required.",
  openGraph: {
    title: "FIRSTSONG — From Your First Chord to Your First Original Song",
    description:
      "Six weeks, free, no account required. Open the page with a guitar and record your first 15-second hook in one sitting.",
    type: "website",
    siteName: "FIRSTSONG",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/og-image.png`, width: 1200, height: 630, alt: "FIRSTSONG — Six strings. One chord. Your first song." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FIRSTSONG — Guitar & Songwriting Field Manual",
    description:
      "Pluck six open strings, play E minor, write one concrete line, and record your first original hook in 15 minutes.",
    images: [`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/og-image.png`],
  },
};

export const viewport: Viewport = {
  themeColor: "#182b49",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hankenGrotesk.variable} ${chivoMono.variable}`}
    >
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

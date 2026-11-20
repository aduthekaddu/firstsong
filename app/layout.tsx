import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const ibmPlexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aduthekaddu.github.io/firstsong";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Firstsong: Learn guitar and write your first song",
    template: "%s · Firstsong",
  },
  description:
    "Free six-week beginner guitar and songwriting course. Tune six strings, learn open chords, write one concrete line, and record a 20-second hook in your browser.",
  openGraph: {
    title: "Firstsong: Learn guitar and write your first song",
    description:
      "Tune six strings, play E minor, write one concrete line, and record your first 20-second hook in fifteen minutes.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Firstsong interactive guitar and songwriting studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Firstsong: Learn guitar and write your first song",
    description:
      "Six-week beginner guitar and songwriting studio with acoustic reference audio, live microphone tuning, and local recording.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" },
  ],
};

/**
 * Tiny synchronous FOUC-prevention script directly after <meta name="color-scheme">
 * per modern-web-guidance (dark-mode-toggle).
 */
const colorSchemeInitScript = `(function(){try{var s=localStorage.getItem("color-scheme");if(s==="light"||s==="dark"){var m=document.querySelector('meta[name="color-scheme"]');if(m)m.setAttribute("content",s);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${ibmPlexMono.variable}`}>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: colorSchemeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

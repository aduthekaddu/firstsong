import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FIRSTSONG", template: "%s | FIRSTSONG" },
  description: "A free interactive course in guitar and songwriting. Make your first personal hook in 15 minutes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen">{children}</body></html>;
}

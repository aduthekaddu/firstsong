import Link from "next/link";
import { Guitar } from "lucide-react";
import type { ReactNode } from "react";

const links = [
  { path: "/", text: "Stage 0" },
  { path: "/week-1/", text: "Week 1" },
  { path: "/chords/", text: "Chord library" },
];

export function SiteFrame({ path, children }: { path: string; children: ReactNode }) {
  return (
    <>
      <a href="#content" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="site-inner">
          <Link className="brand" href="/">
            <span className="brand-icon"><Guitar size={20} aria-hidden="true" /></span>
            FIRSTSONG
          </Link>
          <nav aria-label="Primary">
            {links.map((link) => (
              <Link key={link.path} href={link.path} aria-current={link.path === path ? "page" : undefined}>
                {link.text}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="page-shell" id="content" tabIndex={-1}>{children}</main>
      <footer className="site-footer">
        <div className="site-inner">
          <span className="footer-brand">FIRSTSONG</span>
          <span>Free and open source under the MIT License.</span>
        </div>
      </footer>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { course } from "../lib/lessons";
import { BrandMark, IconArrowUpRight, IconClose, IconList } from "./icons";
import { Magnetic } from "./motion-primitives";
import { useMotionSystem } from "./motion-provider";

const navLinks = [
  { path: "/", code: "00", label: "Stage 0" },
  { path: "/week-1/", code: "01", label: "Week 1" },
  { path: "/chords/", code: "10", label: "Chords" },
] as const;

const fretMarks = ["00", "I", "II", "III", "IV"] as const;

export function SiteFrame({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const [indexOpen, setIndexOpen] = useState(false);
  const [headerReady, setHeaderReady] = useState(false);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const fretBeadRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const { subscribeScroll } = useMotionSystem();

  // Orchestrated header hairline entrance
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHeaderReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Zero-re-render GPU scroll progress bar + right-edge fret bead
  useEffect(() => {
    return subscribeScroll(({ progress }) => {
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scale3d(${progress.toFixed(4)}, 1, 1)`;
      }
      if (fretBeadRef.current) {
        const y = progress * 156;
        fretBeadRef.current.style.transform = `translate3d(-50%, ${y.toFixed(1)}px, 0)`;
      }
    });
  }, [subscribeScroll]);

  // Escape key & focus management for the 6-Week Curriculum Drawer
  useEffect(() => {
    if (!indexOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndexOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [indexOpen]);

  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-[var(--z-header)] bg-[var(--paper)]">
        <div className="urtext-container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3.5 md:flex-nowrap md:py-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-[var(--prussian)] focus-visible:rounded-[2px]"
          >
            <span className="tactile inline-flex group-hover:translate-x-[1px]">
              <BrandMark className="h-[19px] w-[28px]" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-mono-score text-[12px] font-medium tracking-[0.22em] text-[var(--ink)]">
                FIRSTSONG
              </span>
              <span className="font-mono-score mt-0.5 hidden text-[9px] uppercase tracking-[0.16em] text-[var(--ink-muted)] sm:block">
                Urtext Edition · Six Weeks
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="order-last flex w-full items-center gap-6 border-t border-[var(--rule)] pt-2.5 md:order-none md:w-auto md:gap-9 md:border-t-0 md:pt-0"
          >
            {navLinks.map((item) => {
              const active = item.path === path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`group relative inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap text-sm transition-colors duration-200 ${
                    active
                      ? "font-semibold text-[var(--prussian)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    className={`font-mono-score text-[10px] ${
                      active ? "text-[var(--cinnabar)]" : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 -bottom-[11px] h-[2px] origin-left bg-[var(--cobalt)] transition-transform duration-300 ease-[var(--ease-out-expo)] md:-bottom-[17px] ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-5">
            <span className="font-mono-score hidden text-[10px] uppercase text-[var(--ink-muted)] lg:inline">
              No account · Saved on device
            </span>
            <Magnetic strength={5}>
              <button
                type="button"
                onClick={() => setIndexOpen(true)}
                aria-expanded={indexOpen}
                aria-controls="curriculum-drawer"
                className="tactile font-mono-score inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--folio)] px-3.5 py-2 text-[11px] font-medium uppercase text-[var(--prussian)] hover:bg-[var(--prussian)] hover:text-[var(--prussian-ink)]"
              >
                <IconList size={14} />
                <span>6-Week Index</span>
              </button>
            </Magnetic>
          </div>
        </div>

        {/* Engraved bottom stave + live GPU scroll-progress hair */}
        <div className="relative h-px w-full bg-[var(--rule)] overflow-hidden">
          <div
            aria-hidden="true"
            className={`absolute inset-0 origin-left bg-[var(--rule-mid)] transition-transform duration-700 ease-[var(--ease-out-expo)] ${
              headerReady ? "scale-x-100" : "scale-x-0"
            }`}
          />
          <div
            ref={progressBarRef}
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-full origin-left bg-[var(--cobalt)]"
            style={{ transform: "scale3d(0, 1, 1)" }}
          />
        </div>
      </header>

      {/* Right-margin acoustic fret inlay scroll indicator (desktop >= 1400px) */}
      <aside
        aria-hidden="true"
        className="pointer-events-none fixed right-4 top-1/2 z-[var(--z-rail)] hidden -translate-y-1/2 flex-col items-center 2xl:flex"
      >
        <div className="relative flex h-[172px] w-7 flex-col items-center justify-between py-2">
          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-[var(--rule-mid)]" />
          <div
            ref={fretBeadRef}
            className="absolute left-1/2 top-2 h-2.5 w-2.5 rounded-full border border-[var(--folio)] bg-[var(--cinnabar)]"
            style={{ transform: "translate3d(-50%, 0, 0)" }}
          />
          {fretMarks.map((mark) => (
            <span
              key={mark}
              className="font-mono-score relative bg-[var(--paper)] px-1 text-[9px] text-[var(--ink-muted)]"
            >
              {mark}
            </span>
          ))}
        </div>
      </aside>

      <main id="content" tabIndex={-1} className="outline-none">
        {children}
      </main>

      {/* Engraved Sheet-Music Colophon Footer */}
      <footer className="surface-prussian mt-20 border-t border-[var(--prussian-deep)] bg-[var(--prussian)] text-[var(--prussian-ink)]">
        <div className="urtext-container py-14 md:py-16">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="space-y-4 md:col-span-6">
              <div className="flex items-center gap-3 text-[var(--prussian-ink)]">
                <BrandMark className="h-5 w-7" />
                <span className="font-mono-score text-xs font-medium tracking-[0.22em]">
                  FIRSTSONG
                </span>
              </div>
              <p className="font-display max-w-md text-2xl leading-snug text-[var(--prussian-ink)] md:text-3xl">
                Six weeks from an open E string to a finished original recording.
              </p>
              <p className="max-w-md text-sm text-[var(--prussian-muted)]">
                Free, open source under the MIT License, with zero accounts. Your lyric, rhythm takes, and session progress stay right in this browser.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 md:col-span-6 md:justify-items-end">
              <div className="space-y-3">
                <p className="font-mono-score text-[10px] uppercase text-[var(--bronze)]">
                  Plates
                </p>
                <ul className="space-y-2 text-sm">
                  {navLinks.map((item) => (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        className="score-link text-[var(--prussian-ink)]/90 hover:text-[var(--folio)]"
                      >
                        <span className="font-mono-score text-[10px] text-[var(--bronze)]">
                          {item.code}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="font-mono-score text-[10px] uppercase text-[var(--bronze)]">
                  Colophon
                </p>
                <p className="text-xs leading-relaxed text-[var(--prussian-muted)]">
                  Set in Fraunces, Hanken Grotesk, and Chivo Mono (SIL OFL 1.1).
                  <br />
                  Reference pitch A4 = 440 Hz.
                </p>
                <button
                  type="button"
                  onClick={() => setIndexOpen(true)}
                  className="score-link font-mono-score cursor-pointer text-[11px] uppercase text-[var(--bronze)] hover:text-[var(--prussian-ink)]"
                >
                  Open full 6-week syllabus
                  <IconArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 6-Week Curriculum Drawer (pure transform + opacity, zero backdrop-filter, inert when closed) */}
      <div
        inert={!indexOpen}
        className={`fixed inset-0 z-[var(--z-drawer)] transition-[opacity,visibility] duration-300 ease-[var(--ease-out-quint)] ${
          indexOpen ? "visible pointer-events-auto opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-[var(--prussian-deep)]/60"
          onClick={() => setIndexOpen(false)}
        />
        <div
          id="curriculum-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="curriculum-drawer-title"
          className={`absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-[var(--prussian)] bg-[var(--folio)] transition-transform duration-[420ms] ease-[var(--ease-out-expo)] ${
            indexOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between gap-6 border-b border-[var(--rule-strong)] bg-[var(--paper)] px-6 py-6 md:px-9">
            <div>
              <p className="font-mono-score text-[11px] uppercase text-[var(--cobalt)]">
                Urtext Syllabus · Stage 00 — Optional Weeks 7 &amp; 8
              </p>
              <h2
                id="curriculum-drawer-title"
                className="font-display mt-1.5 text-3xl text-[var(--ink)] md:text-4xl"
              >
                One recorded artifact every week
              </h2>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setIndexOpen(false)}
              className="tactile inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] text-[var(--ink)] hover:border-[var(--prussian)] hover:bg-[var(--prussian)] hover:text-[var(--prussian-ink)]"
              aria-label="Close 6-week curriculum index"
            >
              <IconClose size={17} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-6 py-6 md:px-9"
            data-lenis-prevent
          >
            <ol className="divide-y divide-[var(--rule)] border-b border-[var(--rule)]">
              {course.map((unit, idx) => {
                const route = idx === 0 ? "/" : idx === 1 ? "/week-1/" : null;
                return (
                  <li
                    key={unit.id}
                    className="grid gap-3 py-5 md:grid-cols-[120px_1fr_auto] md:items-start md:gap-6"
                  >
                    <div>
                      <span className="font-mono-score block text-[10px] uppercase text-[var(--cinnabar)]">
                        Plate {String(idx).padStart(2, "0")}
                      </span>
                      <span className="font-mono-score text-xs font-medium text-[var(--ink)]">
                        {unit.stage}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">
                        {unit.title}
                      </h3>
                      <p className="text-sm text-[var(--ink-muted)]">{unit.objective}</p>
                      <p className="pt-1 text-xs leading-relaxed text-[var(--ink)]">
                        <span className="font-mono-score mr-2 inline-block rounded-[2px] bg-[var(--verdigris-tint)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--verdigris)]">
                          Keep
                        </span>
                        {unit.checkpoint}
                      </p>
                    </div>

                    <div className="pt-1">
                      {route ? (
                        <Link
                          href={route}
                          onClick={() => setIndexOpen(false)}
                          className="tactile font-mono-score inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-3.5 py-1.5 text-[10px] uppercase text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
                        >
                          Open <IconArrowUpRight size={12} />
                        </Link>
                      ) : (
                        <span className="font-mono-score inline-block rounded-[var(--radius-control)] border border-[var(--rule)] bg-[var(--paper)] px-2.5 py-1 text-[10px] uppercase text-[var(--ink-muted)]">
                          Outline
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

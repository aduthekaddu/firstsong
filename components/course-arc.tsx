"use client";

import Link from "next/link";
import { course } from "../lib/lessons";
import { IconArrowUpRight } from "./icons";
import { PlateEyebrow } from "./ui";
import { RevealPlate, SplitReveal, StaveRule } from "./motion-primitives";

export function CourseArc() {
  return (
    <section
      aria-labelledby="course-arc-title"
      className="urtext-container pt-20 pb-8 md:pt-28"
    >
      <StaveRule className="mb-10" />

      <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
        <div className="space-y-3 md:col-span-7">
          <PlateEyebrow index="Plate 03" label="The Six-Week Score" />
          <SplitReveal
            as="h2"
            className="font-display-section text-[var(--ink)]"
            lines={[
              "One kept recording,",
              <em key="em" className="text-[var(--cobalt)]">
                every single week.
              </em>,
            ]}
          />
        </div>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)] md:col-span-5 md:text-base">
          Most guitar courses pile up exercises until you quit. FIRSTSONG is built backward from finished songs: six focused weeks, one tangible audio artifact per week, and zero accounts standing between you and the instrument.
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {course.map((unit, idx) => {
          const route = idx === 0 ? "#lesson" : idx === 1 ? "/week-1/" : null;
          const isLive = idx <= 1;
          return (
            <li key={unit.id}>
              <RevealPlate index={idx} className="h-full">
                <article
                  className={`flex h-full flex-col justify-between rounded-[var(--radius-plate)] border p-6 transition-colors duration-200 ${
                    isLive
                      ? "border-[var(--prussian)]/35 bg-[var(--folio)] hover:border-[var(--cobalt)]"
                      : "border-[var(--rule)] bg-[var(--paper)]"
                  }`}
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between border-b border-[var(--rule)] pb-3">
                      <span className="font-mono-score text-[11px] font-medium uppercase text-[var(--cinnabar)]">
                        {unit.stage}
                      </span>
                      <span className="font-mono-score text-[10px] text-[var(--ink-muted)]">
                        {String(idx).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">
                      {unit.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-muted)]">
                      {unit.objective}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4 border-t border-[var(--rule)] pt-4">
                    <p className="text-xs leading-relaxed text-[var(--ink)]">
                      <span className="font-mono-score mr-2 inline-block rounded-[2px] bg-[var(--verdigris-tint)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--verdigris)]">
                        Keep
                      </span>
                      {unit.checkpoint}
                    </p>

                    {route === "/week-1/" ? (
                      <Link
                        href={route}
                        className="score-link font-mono-score text-[11px] font-medium uppercase text-[var(--cobalt)]"
                      >
                        Open Week 1
                        <IconArrowUpRight size={13} />
                      </Link>
                    ) : route === "#lesson" ? (
                      <a
                        href={route}
                        className="score-link font-mono-score text-[11px] font-medium uppercase text-[var(--cobalt)]"
                      >
                        Practice above
                        <IconArrowUpRight size={13} />
                      </a>
                    ) : (
                      <span className="font-mono-score text-[10px] uppercase text-[var(--ink-muted)]/80">
                        Curriculum outline
                      </span>
                    )}
                  </div>
                </article>
              </RevealPlate>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

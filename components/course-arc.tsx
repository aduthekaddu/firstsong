"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { course } from "../lib/lessons";

const liveRoutes: Record<string, { href: string; action: string }> = {
  "stage-0": { href: "#lesson", action: "Open Stage 0" },
  "week-1": { href: "/week-1/", action: "Open Week 1" },
};

/**
 * Six-week curriculum ledger (Harry Atkins / Gregor Collienne hairline index style).
 * Replaces the generic 8-card grid with a calm, borderless, scannable ledger
 * where upcoming weeks expand cleanly in place via native <details>.
 */
export function CourseArc() {
  return (
    <section
      id="curriculum"
      aria-labelledby="curriculum-heading"
      className="mt-24 border-t border-[var(--line)] pt-16 sm:mt-28 sm:pt-20"
    >
      <div className="shell-wrap">
        <div className="grid gap-6 pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="curriculum-heading" className="type-h2 text-[var(--ink)]">
              Six weeks from one chord to a finished recording
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="type-lead max-w-[46ch]">
              Every week ends with one concrete artifact you can play back. Stage 0 and Week 1 run live in this browser; Weeks 2 through 8 lay out the full roadmap.
            </p>
          </div>
        </div>

        {/* Hairline Ledger */}
        <ol className="m-0 list-none divide-y divide-[var(--line)] border-y border-[var(--line)] p-0">
          {course.map((lesson, idx) => {
            const live = liveRoutes[lesson.id];
            const indexLabel = String(idx).padStart(2, "0");

            if (live) {
              return (
                <li
                  key={lesson.id}
                  className="grid gap-4 py-6 sm:grid-cols-12 sm:items-baseline sm:gap-6"
                >
                  <div className="flex items-baseline gap-3 sm:col-span-3">
                    <span className="font-mono-num text-[13px] text-[var(--muted)]">
                      {indexLabel}
                    </span>
                    <span className="text-[15px] font-medium text-[var(--ink)]">
                      {lesson.stage}
                    </span>
                  </div>

                  <div className="space-y-1 sm:col-span-6">
                    <h3 className="text-[18px] font-normal tracking-[-0.02em] text-[var(--ink)]">
                      {lesson.title}
                    </h3>
                    <p className="text-[14px] text-[var(--muted)]">{lesson.checkpoint}</p>
                  </div>

                  <div className="sm:col-span-3 sm:text-right">
                    {live.href.startsWith("#") ? (
                      <a href={live.href} className="ui-link text-[14px]">
                        <span>{live.action}</span>
                        <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
                      </a>
                    ) : (
                      <Link href={live.href} className="ui-link text-[14px]">
                        <span>{live.action}</span>
                        <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            }

            return (
              <li key={lesson.id} className="py-1">
                <details className="ledger-disclosure group">
                  <summary className="grid cursor-pointer gap-4 py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6">
                    <div className="flex items-baseline gap-3 sm:col-span-3">
                      <span className="font-mono-num text-[13px] text-[var(--muted)]">
                        {indexLabel}
                      </span>
                      <span className="text-[15px] font-medium text-[var(--ink-soft)]">
                        {lesson.stage}
                      </span>
                    </div>

                    <div className="space-y-1 sm:col-span-6">
                      <span className="block text-[18px] font-normal tracking-[-0.02em] text-[var(--ink)]">
                        {lesson.title}
                      </span>
                      <span className="block text-[14px] text-[var(--muted)]">
                        {lesson.checkpoint}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--ink-soft)] group-hover:text-[var(--ink)] sm:col-span-3 sm:justify-end">
                      <span>Preview steps</span>
                      <Plus
                        size={15}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="transition-transform duration-200 ease-[var(--ease-ui)] group-open:rotate-45"
                      />
                    </div>
                  </summary>

                  <div className="grid gap-6 pb-6 pt-2 sm:grid-cols-12">
                    <div className="space-y-4 sm:col-span-6 sm:col-start-4">
                      <p className="text-[15px] text-[var(--ink-soft)]">{lesson.objective}</p>
                      <ul className="m-0 list-none space-y-3 border-t border-[var(--line)] pt-4 p-0">
                        {lesson.steps.map((step) => (
                          <li key={step.id} className="space-y-0.5">
                            <p className="text-[14px] font-medium text-[var(--ink)]">
                              {step.title}
                            </p>
                            <p className="text-[14px] text-[var(--muted)]">{step.instruction}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {lesson.stallResponses.length > 0 && (
                      <div className="space-y-2 border-t border-[var(--line)] pt-4 sm:col-span-3 sm:border-t-0 sm:pt-0">
                        <p className="text-[13px] font-medium text-[var(--ink)]">If you stall</p>
                        <p className="text-[13px] leading-relaxed text-[var(--muted)]">
                          {lesson.stallResponses[0]}
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { course, lessonHref } from "../lib/lessons";

export function CourseArc() {
  return (
    <section id="curriculum" aria-labelledby="curriculum-heading" className="mt-24 border-t border-[var(--line)] pt-16 sm:mt-28 sm:pt-20">
      <div className="shell-wrap">
        <div className="grid gap-6 pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="curriculum-heading" className="type-h2 text-[var(--ink)]">Six weeks from one chord to a finished recording</h2>
          </div>
          <div className="lg:col-span-5">
            <p className="type-lead max-w-[46ch]">Make something you can keep each week. Go at your own pace: your words and takes stay in this browser.</p>
          </div>
        </div>
        <ol className="m-0 list-none divide-y divide-[var(--line)] border-y border-[var(--line)] p-0">
          {course.map((lesson, idx) => (
            <li key={lesson.id} className="grid gap-3 py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6">
              <div className="flex items-baseline gap-3 sm:col-span-3">
                <span className="font-mono-num text-[13px] text-[var(--muted)]" aria-hidden="true">{String(idx).padStart(2, "0")}</span>
                <span className="text-[15px] font-medium text-[var(--ink)]">{lesson.stage}</span>
              </div>
              <div className="space-y-1 sm:col-span-6">
                <h3 className="text-[18px] font-normal tracking-[-0.02em] text-[var(--ink)]">{lesson.title}</h3>
                <p className="text-[14px] text-[var(--muted)]">{lesson.checkpoint}</p>
              </div>
              <div className="sm:col-span-3 sm:text-right">
                <Link href={lessonHref(lesson.id)} className="ui-link min-h-11 text-[14px]">
                  <span>{idx === course.length - 1 ? "Open optional lessons" : `Open ${lesson.stage}`}</span>
                  <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

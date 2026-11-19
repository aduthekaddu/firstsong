import Link from "next/link";
import { IconArrowLeft } from "../components/icons";
import { SiteFrame } from "../components/site-frame";
import { PlateEyebrow } from "../components/ui";

export default function NotFound() {
  return (
    <SiteFrame path="">
      <section className="urtext-container flex min-h-[68svh] flex-col justify-center py-20">
        <div className="max-w-xl space-y-6">
          <PlateEyebrow index="Rest · 404" label="Measure not found" tone="cinnabar" />
          <h1 className="font-display-hero text-[var(--ink)]">
            A silent <em className="text-[var(--cobalt)]">bar.</em>
          </h1>
          <p className="text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
            There is no lesson plate at this address. Head back to Stage 0 to pick up your guitar, or jump straight into the 10-chord reference library.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/"
              className="tactile inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-6 py-2.5 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
            >
              <IconArrowLeft size={15} />
              <span>Return to Stage 0</span>
            </Link>
            <Link
              href="/chords/"
              className="score-link font-mono-score px-2 py-2 text-xs uppercase text-[var(--cobalt)]"
            >
              Open Chord Library
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}

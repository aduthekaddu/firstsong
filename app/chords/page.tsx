import type { Metadata } from "next";
import { ChordDiagram } from "../../components/chord-diagram";
import { ChordStage } from "../../components/chord-stage";
import { RevealPlate, SplitReveal, StaveRule } from "../../components/motion-primitives";
import { SiteFrame } from "../../components/site-frame";
import { PlateEyebrow } from "../../components/ui";
import { chords } from "../../lib/chords";

export const metadata: Metadata = { title: "Chord library" };

function tabString(chord: (typeof chords)[number]) {
  return chord.strings
    .map((pos) => (pos === "x" ? "×" : pos === 0 ? "0" : String(pos[0])))
    .join("–");
}

export default function ChordsPage() {
  return (
    <SiteFrame path="/chords/">
      <div className="urtext-container space-y-12 pt-10 pb-8 md:space-y-16 md:pt-14">
        <header className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="space-y-4 lg:col-span-8">
            <RevealPlate immediate delayMs={40}>
              <PlateEyebrow index="Plate 10" label="Guitar Reference · 10 Open Chords" />
            </RevealPlate>
            <SplitReveal
              as="h1"
              immediate
              delayMs={90}
              className="font-display-hero text-[var(--ink)]"
              lines={[
                "Ten shapes that",
                <em key="em" className="text-[var(--cobalt)]">
                  carry a song.
                </em>,
              ]}
            />
          </div>

          <RevealPlate immediate delayMs={250} className="space-y-3 lg:col-span-4 lg:pb-2">
            <p className="text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
              Every open chord in the six-week curriculum, playable string by string. Start with{" "}
              <strong className="font-semibold text-[var(--ink)]">Em</strong> for Stage 0, then hear how it steps cleanly into{" "}
              <strong className="font-semibold text-[var(--ink)]">Asus2</strong>.
            </p>
          </RevealPlate>
        </header>

        <StaveRule immediate delayMs={200} />

        {/* Live Morphing Chord Progression Stage */}
        <ChordStage />

        {/* Engraved Diagram Reading Key */}
        <aside
          aria-label="How to read chord diagrams"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--rule-mid)] sm:grid-cols-4"
        >
          <p className="flex items-center gap-3 bg-[var(--folio)] px-4 py-3.5 text-xs text-[var(--ink-soft)]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--bronze)]" aria-hidden="true" />
            <span>
              <strong className="block font-medium text-[var(--ink)]">Open string</strong>
              Let ring without pressing
            </span>
          </p>
          <p className="flex items-center gap-3 bg-[var(--folio)] px-4 py-3.5 text-xs text-[var(--ink-soft)]">
            <span className="font-mono-score flex h-6 w-6 shrink-0 items-center justify-center text-base font-medium text-[var(--ink-muted)]" aria-hidden="true">
              ×
            </span>
            <span>
              <strong className="block font-medium text-[var(--ink)]">Muted string</strong>
              Skip on the strum
            </span>
          </p>
          <p className="flex items-center gap-3 bg-[var(--folio)] px-4 py-3.5 text-xs text-[var(--ink-soft)]">
            <span className="font-mono-score flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cinnabar)] text-[10px] font-bold text-[var(--folio)]" aria-hidden="true">
              1–4
            </span>
            <span>
              <strong className="block font-medium text-[var(--ink)]">Fret fingers</strong>
              Index (1) to pinky (4)
            </span>
          </p>
          <p className="flex items-center gap-3 bg-[var(--folio)] px-4 py-3.5 text-xs text-[var(--ink-soft)]">
            <span className="font-mono-score shrink-0 rounded-[2px] border border-[var(--rule-mid)] bg-[var(--paper)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--prussian)]" aria-hidden="true">
              E → e
            </span>
            <span>
              <strong className="block font-medium text-[var(--ink)]">String order</strong>
              Thickest left to thinnest right
            </span>
          </p>
        </aside>

        {/* 10 Engraved Chord Plates (Asymmetric featured first pair + clean 4-col gallery) */}
        <section aria-label="All ten open chord diagrams" className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-3">
            <h2 className="font-display text-3xl text-[var(--ink)]">Complete Open Voicings</h2>
            <span className="font-mono-score text-[11px] uppercase text-[var(--ink-muted)]">
              Plates 01 — 10
            </span>
          </div>

          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            role="list"
          >
            {chords.map((chord, idx) => {
              const isStarter = idx === 0;
              return (
                <li key={chord.name}>
                  <RevealPlate index={idx} className="h-full">
                    <article
                      className={`flex h-full flex-col items-center justify-between rounded-[var(--radius-plate)] border p-5 transition-colors duration-200 ${
                        isStarter
                          ? "border-[var(--prussian)] bg-[var(--folio)]"
                          : "border-[var(--rule-mid)] bg-[var(--folio)] hover:border-[var(--cobalt)]"
                      }`}
                    >
                      <div className="mb-4 flex w-full items-start justify-between border-b border-[var(--rule)] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-3xl leading-none text-[var(--prussian)]">
                              {chord.name}
                            </h3>
                            {isStarter && (
                              <span className="font-mono-score rounded-[2px] bg-[var(--cinnabar-tint)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--cinnabar)]">
                                Start
                              </span>
                            )}
                          </div>
                          <p className="font-mono-score mt-1 text-[10px] uppercase text-[var(--ink-muted)]">
                            {chord.fullName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-score block text-[10px] text-[var(--ink-muted)]">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="font-mono-score mt-0.5 block text-[10px] text-[var(--cobalt)]">
                            {tabString(chord)}
                          </span>
                        </div>
                      </div>

                      <ChordDiagram chord={chord} showStrum compact />
                    </article>
                  </RevealPlate>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </SiteFrame>
  );
}

"use client";

import { useId, useState } from "react";
import { RecordingLink as Link } from "./recording-navigation";
import { Download } from "lucide-react";
import { buildSongSheet, downloadFile } from "../lib/studio-audio";
import { songFieldLimit, studioTakes, type SongField, type TakeSpec } from "../lib/song-project";
import { useSongProject } from "../lib/use-song-project";
import { chords } from "../lib/chords";
import { ChordDiagram } from "./chord-diagram";
import { SongBackup } from "./song-backup";
import { StudioTake } from "./studio-take";
import { LegacyTakeShelf } from "./recordings";

const fields: Record<SongField, { label: string; hint: string; rows?: number }> = {
  title: { label: "Song title", hint: "A working title is enough." },
  hook: { label: "Title line", hint: "A short line that sounds like you." },
  keyword: { label: "Word to land on", hint: "Which word gets the longest note or the pause?" },
  details: { label: "Four sensory details", hint: "What does the object look, feel, smell or sound like?", rows: 4 },
  verseOne: { label: "Verse 1", hint: "Four short lines. Put a person somewhere and let one thing happen.", rows: 5 },
  verseTwo: { label: "Verse 2", hint: "Move the scene in time, place, or point of view.", rows: 5 },
  chorus: { label: "Chorus", hint: "Keep the title line. Let one word or strum sound different.", rows: 5 },
  chords: { label: "Chords by section", hint: "Example: Verse: Em | Asus2. Chorus: Asus2 | Em.", rows: 3 },
  ending: { label: "How it ends", hint: "Let Em ring, stop together, or say the last word alone.", rows: 2 },
  arrangement: { label: "Arrangement map", hint: "Example: verse one soft, chorus fuller, leave beat four empty before the last line.", rows: 4 },
  revision: { label: "One thing to keep", hint: "Name what you heard and what you’ll use in the final take.", rows: 2 },
};

type Exercise = { fields?: SongField[]; takes?: TakeSpec[]; chord?: boolean; sheet?: boolean; backup?: boolean; cue?: string };
const exercises: Record<string, Exercise> = {
  "week-1:title": { fields: ["details", "hook"] },
  "week-1:melody": { fields: ["hook", "keyword"], takes: [studioTakes.melody] },
  "week-1:memo": { fields: ["hook", "keyword"], takes: [studioTakes.memo] },
  "week-2:change": { chord: true, fields: ["chords"], cue: "Em: strum all six strings. Asus2: keep the low E quiet and start on A. Move slowly enough to keep counting." },
  "week-2:scene": { fields: ["verseOne"], takes: [studioTakes.verse] },
  "week-3:contrast": { fields: ["chorus"], cue: "Play one verse line and one chorus line in a row. Try just one contrast: longer, higher, or fuller." },
  "week-3:rhyme": { fields: ["chorus"], takes: [studioTakes.contrast] },
  "week-4:form": { fields: ["title", "verseOne", "chorus", "verseTwo", "chords"], sheet: true },
  "week-4:finish": { fields: ["ending"], takes: [studioTakes.draft], sheet: true },
  "week-5:map": { fields: ["arrangement"] },
  "week-5:versions": { takes: [studioTakes.chorusA, studioTakes.chorusB], fields: ["revision"] },
  "week-6:test": { takes: [studioTakes.soundcheck], cue: "Listen for a comfortable balance and clean sound. If the voice disappears, angle the phone closer to your mouth and try again." },
  "week-6:export": { takes: [studioTakes.final], sheet: true, backup: true },
  "weeks-7-8:layers": { takes: [studioTakes.guitar, studioTakes.vocal], cue: "Prepare a WAV for each pass, then import them into your recording program. These takes aren’t synced. Use headphones to record against a guide track and line up the passes by ear." },
  "weeks-7-8:mix": { sheet: true, cue: "In your recording program, bring the vocal forward, then bring the guitar up until it supports it. Export a lossless master and a smaller listening copy. Open both files before starting your next song." },
};

const checkpoints: Record<string, Exercise> = {
  "week-1": { fields: ["hook", "keyword"], takes: [studioTakes.memo] },
  "week-2": { fields: ["verseOne", "chords"], takes: [studioTakes.verse] },
  "week-3": { fields: ["verseOne", "chorus"], takes: [studioTakes.contrast] },
  "week-4": { fields: ["title", "ending"], takes: [studioTakes.draft], sheet: true },
  "week-5": { fields: ["arrangement", "revision"], takes: [studioTakes.chorusA, studioTakes.chorusB] },
  "week-6": { takes: [studioTakes.final], sheet: true, backup: true },
  "weeks-7-8": { takes: [studioTakes.guitar, studioTakes.vocal], sheet: true },
};

export function SongWorkbench({ lessonId, stepId, firstLine = "", oldNotes = "", onBusy, onSaved, archive = false }: {
  lessonId: string; stepId: string; firstLine?: string; oldNotes?: string;
  onBusy?: (busy: boolean) => void; onSaved?: () => void; archive?: boolean;
}) {
  const readOnly = stepId === "checkpoint" || archive;
  const exercise: Exercise | undefined = archive
    ? { fields: ["title", "hook", "verseOne", "chorus", "verseTwo", "chords", "ending", "arrangement", "revision"] as SongField[], takes: Object.values(studioTakes), sheet: true, backup: true }
    : readOnly ? checkpoints[lessonId] : exercises[`${lessonId}:${stepId}`];
  const song = useSongProject();
  const [active, setActive] = useState<string | null>(null);
  const id = useId();
  if (!exercise) return null;

  function saveField(field: SongField, text: string) {
    if (song.save(field, text)) onSaved?.();
  }

  function exportSheet() {
    const sheet = buildSongSheet(song.value);
    const stem = song.value.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "firstsong";
    downloadFile(new Blob([sheet], { type: "text/plain;charset=utf-8" }), `${stem}-lyrics-and-chords.txt`);
  }

  return (
    <div className="min-w-0 space-y-6">
      {!readOnly && lessonId === "week-1" && stepId === "title" && (firstLine.trim() || oldNotes.trim()) && (
        <div className="space-y-2 border-y border-[var(--line)] py-4">
          <p className="text-[13px] font-medium text-[var(--ink)]">From your earlier practice</p>
          {firstLine.trim() && <p className="whitespace-pre-wrap break-words text-[15px] text-[var(--ink-soft)]">{firstLine}</p>}
          {oldNotes.trim() && <p className="whitespace-pre-wrap break-words text-[14px] text-[var(--muted)]">{oldNotes}</p>}
          {firstLine.trim() && !song.value.hook && <button type="button" className="btn-secondary" disabled={!song.ready} onClick={() => saveField("hook", firstLine)}>Use your Stage 0 line</button>}
        </div>
      )}

      {exercise.cue && <p className="border-l-2 border-[var(--line-strong)] pl-4 text-[14px] leading-relaxed text-[var(--ink-soft)]">{exercise.cue}</p>}
      {exercise.chord && (
        <div className="space-y-3 border-t border-[var(--line)] pt-4">
          <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 sm:max-w-[440px] sm:gap-6">
            {chords.filter((chord) => chord.name === "Em" || chord.name === "Asus2").map((chord) => (
              <div key={chord.name} className="min-w-0">
                <p className="text-[14px] font-medium">{chord.name}</p>
                <ChordDiagram chord={chord} compact showStrum />
              </div>
            ))}
          </div>
          <Link href="/chords/" className="ui-link text-[14px]">Open the chord library</Link>
        </div>
      )}

      {lessonId === "weeks-7-8" && (stepId === "mix" || stepId === "checkpoint") && (
        <Link href="/songbook/#new-song" className="ui-link text-[15px]">Start your next song</Link>
      )}

      {exercise.backup && <SongBackup key={active ?? "idle"} song={song.value} ready={song.ready} notesUnreadable={song.readWarning} recording={active !== null} />}

      {exercise.fields?.length ? (
        <div className="grid min-w-0 gap-5 border-t border-[var(--line)] pt-5">
          {exercise.fields.map((field) => {
            const copy = fields[field];
            const fieldId = `${id}-${field}`;
            const limit = songFieldLimit(field);
            const inputClass = "w-full min-w-0 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--ink)]";
            const props = {
              id: fieldId,
              "aria-describedby": `${fieldId}-hint`,
              value: song.value[field],
              maxLength: limit,
              disabled: !song.ready,
              className: inputClass,
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => saveField(field, event.target.value),
            };
            return readOnly ? song.value[field].trim() && (
              <div key={field} className="space-y-1">
                <p className="text-[13px] text-[var(--muted)]">{copy.label}</p>
                <p className="whitespace-pre-wrap break-words text-[16px] text-[var(--ink)]">{song.value[field]}</p>
              </div>
            ) : (
              <div key={field} className="grid gap-1.5">
                <label htmlFor={fieldId} className="text-[14px] font-medium text-[var(--ink)]">{copy.label}</label>
                <p id={`${fieldId}-hint`} className="text-[13px] leading-snug text-[var(--muted)]">{copy.hint}</p>
                {copy.rows ? <textarea {...props} rows={copy.rows} /> : <input {...props} type="text" />}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-5" onPlay={(event) => event.currentTarget.querySelectorAll("audio").forEach((audio) => {
        if (audio !== event.target) audio.pause();
      })}>
        {archive && <LegacyTakeShelf />}
        {exercise.takes?.map((spec) => <StudioTake key={spec.id} spec={spec} readOnly={readOnly} hideEmpty={archive}
          disabled={active !== null && active !== spec.id} onSaved={onSaved}
          onBusy={(busy) => {
            setActive(busy ? spec.id : null);
            onBusy?.(busy);
            if (busy) document.querySelectorAll<HTMLAudioElement>("#lesson audio").forEach((audio) => audio.pause());
          }} />)}
      </div>

      {archive && <p className="text-[13px] text-[var(--muted)]">Recordings appear here as you make them.</p>}

      {exercise.sheet && (
        <div className="space-y-2 border-t border-[var(--line)] pt-4">
          <button type="button" className="btn-secondary" disabled={!song.ready || !["title", "hook", "verseOne", "chorus", "verseTwo", "chords", "ending", "arrangement"].some((field) => song.value[field as SongField].trim())} onClick={exportSheet}>
            <Download size={14} aria-hidden="true" /> Download lyrics and chords
          </button>

        </div>
      )}
      {song.warning && <p role="status" className="text-[13px] text-[var(--accent)]">{song.warning}</p>}
    </div>
  );
}

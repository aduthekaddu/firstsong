"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type SongField, songFieldLimit } from "../lib/song-project";
import { useSongProject } from "../lib/use-song-project";
import { findWritingProject, writingTake, writingTakeId } from "../lib/writing-room";
import { RecordingLink as Link, useRecordingNavigation } from "./recording-navigation";
import { SongBackup } from "./song-backup";
import { StudioTake } from "./studio-take";

const fields: { name: SongField; label: string; hint: string; rows?: number }[] = [
  { name: "title", label: "Song title", hint: "A working title is fine." },
  { name: "hook", label: "First line", hint: "A phrase or melody you want to keep." },
  { name: "verseOne", label: "Verse 1", hint: "Set a scene.", rows: 4 },
  { name: "chorus", label: "Chorus", hint: "What do you want to hear again?", rows: 4 },
  { name: "verseTwo", label: "Verse 2", hint: "Let something change.", rows: 4 },
  { name: "chords", label: "Chords by section", hint: "For example: Verse: Em | Asus2.", rows: 3 },
  { name: "ending", label: "Ending and arrangement", hint: "How should the song end? What changes on the way there?", rows: 3 },
];

export function WritingRoom() {
  const id = useSearchParams().get("song");
  return <DraftSlot key={id ?? ""} id={id} />;
}

function DraftSlot({ id }: { id: string | null }) {
  const [state, setState] = useState<"loading" | "open" | "missing" | "blocked">("loading");

  useEffect(() => {
    try {
      setState(id && findWritingProject(id) !== null ? "open" : "missing");
    } catch {
      setState("blocked");
    }
  }, [id]);

  if (state === "loading") return <p role="status" className="text-[15px]">Opening your song…</p>;
  if (state === "open" && id) return <DraftEditor id={id} />;

  return (
    <div className="space-y-4 border-t border-[var(--line)] pt-5">
      <p className="text-[15px] text-[var(--ink-soft)]">{state === "missing"
        ? "This song isn’t saved in this browser. Open one from your songbook or start a new one."
        : "Your browser didn’t let us open saved songs."}</p>
      <Link href="/songbook/#new-song" className="btn-secondary">Open your songbook</Link>
    </div>
  );
}

function DraftEditor({ id }: { id: string }) {
  const song = useSongProject(id);
  const fieldBase = useId();
  const [recording, setRecording] = useState(false);
  const { setRecording: protectRecording } = useRecordingNavigation();

  return (
    <div className="space-y-8">
      <div className="grid gap-5 border-t border-[var(--line)] pt-6">
        {fields.map(({ name, label, hint, rows }) => {
          const fieldId = `${fieldBase}-${name}`;
          const props = {
            id: fieldId,
            "aria-describedby": `${fieldId}-hint`,
            value: song.value[name],
            maxLength: songFieldLimit(name),
            disabled: !song.ready,
            className: "w-full min-w-0 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--ink)]",
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => song.save(name, event.target.value),
          };
          return (
            <div key={name} className="grid gap-1.5">
              <label htmlFor={fieldId} className="text-[14px] font-medium text-[var(--ink)]">{label}</label>
              <p id={`${fieldId}-hint`} className="text-[13px] text-[var(--muted)]">{hint}</p>
              {rows ? <textarea {...props} rows={rows} /> : <input {...props} type="text" />}
            </div>
          );
        })}
        {song.warning && <p role="status" className="text-[14px] text-[var(--accent)]">{song.warning}</p>}
      </div>
      <StudioTake spec={{ ...writingTake, id: writingTakeId(id) }} filenameId={writingTake.id} heading="h2"
        onBusy={(active) => { setRecording(active); protectRecording(active); }} />
      <SongBackup key={String(recording)} song={song.value} ready={song.ready} notesUnreadable={song.readWarning} recording={recording} projectId={id} />
    </div>
  );
}

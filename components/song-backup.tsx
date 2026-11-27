"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { type SongProject } from "../lib/song-project";
import { downloadFile } from "../lib/studio-audio";

type Preparation = { kind: "idle" | "busy" | "error" | "empty" }
  | { kind: "ready"; blob: Blob; filename: string; takeCount: number };

export function SongBackup({ song, ready, recording }: { song: SongProject; ready: boolean; recording: boolean }) {
  const [preparation, setPreparation] = useState<Preparation>({ kind: "idle" });

  async function prepare() {
    setPreparation({ kind: "busy" });
    try {
      const { buildSongBackup } = await import("../lib/song-backup");
      const result = await buildSongBackup(song);
      const date = new Date().toISOString().slice(0, 10);
      setPreparation(result ? { kind: "ready", filename: `firstsong-backup-${date}.zip`, ...result } : { kind: "empty" });
    } catch {
      setPreparation({ kind: "error" });
    }
  }

  function save() {
    if (preparation.kind !== "ready") return;
    downloadFile(preparation.blob, preparation.filename);
    setPreparation({ kind: "idle" });
  }

  const status = preparation.kind === "error"
    ? "Couldn’t prepare the ZIP. You can still try saving the lyrics and individual takes below."
    : preparation.kind === "empty"
      ? "There’s nothing to back up yet. Write a line or record a take first."
      : preparation.kind === "ready"
        ? `Ready to save: your song notes and ${preparation.takeCount === 1 ? "1 original take" : `${preparation.takeCount} original takes`}.`
        : "";

  return (
    <section className="space-y-2 border-t border-[var(--line)] pt-4" aria-label="Song backup">
      <button type="button" className="btn-secondary" disabled={!ready || recording || preparation.kind === "busy"}
        onClick={preparation.kind === "ready" ? save : prepare}>
        <Download size={14} aria-hidden="true" />
        {preparation.kind === "ready" ? "Save ZIP" : preparation.kind === "busy" ? "Preparing backup…" : "Back up your song"}
      </button>
      <p className="text-[13px] text-[var(--muted)]">One ZIP with your lyrics, chords and original recordings. Open it outside Firstsong.</p>
      <p role="status" className="empty:hidden text-[13px] text-[var(--ink-soft)]">{status}</p>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { type SongProject } from "../lib/song-project";
import { downloadFile } from "../lib/studio-audio";

type Preparation = { kind: "idle" | "busy" | "error" | "empty" }
  | { kind: "ready"; blob: Blob; filename: string; takeCount: number; snapshot: SongProject };

export function SongBackup({ song, ready, recording, projectId }: { song: SongProject; ready: boolean; recording: boolean; projectId?: string }) {
  const [preparation, setPreparation] = useState<Preparation>({ kind: "idle" });
  const current = preparation.kind === "ready" && preparation.snapshot !== song ? { kind: "idle" as const } : preparation;

  async function prepare() {
    setPreparation({ kind: "busy" });
    try {
      const { buildSongBackup } = await import("../lib/song-backup");
      const result = await buildSongBackup(song, projectId);
      const date = new Date().toISOString().slice(0, 10);
      const title = projectId ? song.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) : "";
      setPreparation(result ? { kind: "ready", filename: `firstsong-${title || "backup"}-${date}.zip`, snapshot: song, ...result } : { kind: "empty" });
    } catch {
      setPreparation({ kind: "error" });
    }
  }

  function save() {
    if (current.kind !== "ready") return;
    downloadFile(current.blob, current.filename);
    setPreparation({ kind: "idle" });
  }

  const status = current.kind === "error"
    ? "Couldn’t prepare the ZIP. You can still try copying your lyrics and downloading individual takes."
    : current.kind === "empty"
      ? "There’s nothing to back up yet. Write a line or record a take first."
      : current.kind === "ready"
        ? `Ready to save: your song notes and ${current.takeCount === 1 ? "1 original take" : `${current.takeCount} original takes`}.`
        : "";

  return (
    <section className="space-y-2 border-t border-[var(--line)] pt-4" aria-label="Song backup">
      <button type="button" className="btn-secondary" disabled={!ready || recording || current.kind === "busy"}
        onClick={current.kind === "ready" ? save : prepare}>
        <Download size={14} aria-hidden="true" />
        {current.kind === "ready" ? "Save ZIP" : current.kind === "busy" ? "Preparing backup…" : "Back up your song"}
      </button>
      <p className="text-[13px] text-[var(--muted)]">One ZIP with your lyrics, chords and original recordings. Open it outside Firstsong.</p>
      <p role="status" className="empty:hidden text-[13px] text-[var(--ink-soft)]">{status}</p>
    </section>
  );
}

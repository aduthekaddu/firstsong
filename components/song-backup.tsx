"use client";

import { useEffect, useRef, useState } from "react";
import { songFileStem } from "../lib/export-names";
import { Download } from "lucide-react";
import { subscribeToLegacyTakeChanges } from "../lib/legacy-takes";
import type { BackupOmission } from "../lib/song-backup";
import { studioTakes, type SongProject } from "../lib/song-project";
import { stageZeroWritingKeys } from "../lib/stage-zero";
import { writingTakeId } from "../lib/writing-room";
import { downloadFile, subscribeToPageReturn, subscribeToTakeChanges } from "../lib/studio-audio";

type Preparation = { kind: "idle" | "busy" | "error" | "empty" }
  | { kind: "unreadable"; omissions: BackupOmission[] }
  | { kind: "ready"; blob: Blob; filename: string; takeCount: number; omissions: BackupOmission[]; snapshot: SongProject; revision: number };

export function SongBackup({ song, ready, recording, projectId, notesUnreadable = false }: {
  song: SongProject; ready: boolean; recording: boolean; projectId?: string; notesUnreadable?: boolean;
}) {
  const [preparation, setPreparation] = useState<Preparation>({ kind: "idle" });
  const revision = useRef(0);
  const current = preparation.kind === "ready" && preparation.snapshot !== song ? { kind: "idle" as const } : preparation;
  useEffect(() => {
    const relevant = new Set(projectId ? [writingTakeId(projectId)] : Object.values(studioTakes).map((slot) => slot.id));
    function invalidate() {
      revision.current++;
      setPreparation((prior) => prior.kind === "idle" ? prior : { kind: "idle" });
    }
    function legacyChanged(event: StorageEvent) {
      if (!projectId && event.storageArea === localStorage && (event.key === null || event.key.startsWith("firstsong:v1:take:") || stageZeroWritingKeys.includes(event.key))) invalidate();
    }
    const stopWatching = subscribeToTakeChanges((id) => { if (relevant.has(id)) invalidate(); });
    const stopLegacy = !projectId ? subscribeToLegacyTakeChanges(invalidate) : undefined;
    const stopPageReturn = subscribeToPageReturn(invalidate);
    window.addEventListener("storage", legacyChanged);
    return () => {
      revision.current++;
      stopWatching();
      stopLegacy?.();
      stopPageReturn();
      window.removeEventListener("storage", legacyChanged);
    };
  }, [projectId]);

  async function prepare() {
    const started = ++revision.current;
    setPreparation({ kind: "busy" });
    try {
      const { buildSongBackup } = await import("../lib/song-backup");
      const result = await buildSongBackup(song, projectId, notesUnreadable);
      if (revision.current !== started) return;
      if (result.kind !== "archive") {
        setPreparation(result);
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      const title = projectId ? songFileStem(song.title, 48) : "";
      const { blob, takeCount, omissions } = result;
      const suffix = omissions.length ? "-partial.zip" : ".zip";
      setPreparation({ kind: "ready", filename: `firstsong-${title || "backup"}-${date}${suffix}`, snapshot: song, revision: started, blob, takeCount, omissions });
    } catch {
      if (revision.current === started) setPreparation({ kind: "error" });
    }
  }

  function save() {
    if (current.kind !== "ready" || current.revision !== revision.current) return;
    downloadFile(current.blob, current.filename);
    setPreparation({ kind: "idle" });
  }

  const omissions = current.kind === "ready" || current.kind === "unreadable" ? current.omissions : [];
  function statusText() {
    switch (current.kind) {
      case "error": return "Couldn’t prepare the ZIP. You can still try copying your lyrics and downloading individual takes.";
      case "empty": return "There’s nothing to back up yet. Write a line or record a take first.";
      case "unreadable": return "Couldn’t read enough saved work to make a ZIP. Nothing was deleted.";
      case "ready": {
        if (omissions.length) return "Partial backup ready. The ZIP lists what couldn’t be read.";
        return `Ready to save: your song notes and ${current.takeCount === 1 ? "1 original take" : `${current.takeCount} original takes`}.`;
      }
      default: return "";
    }
  }

  return (
    <section className="space-y-2 border-t border-[var(--line)] pt-4" aria-label="Song backup">
      <button type="button" className="btn-secondary" disabled={!ready || recording || current.kind === "busy"}
        onClick={current.kind === "ready" ? save : prepare}>
        <Download size={14} aria-hidden="true" />
        {current.kind === "ready" ? (omissions.length ? "Save partial ZIP" : "Save ZIP") : current.kind === "busy" ? "Preparing backup…" : "Back up your song"}
      </button>
      <p className="text-[13px] text-[var(--muted)]">One ZIP with your lyrics, chords and original recordings. Open it outside Firstsong.</p>
      <p role="status" className="empty:hidden text-[13px] text-[var(--ink-soft)]">{statusText()}</p>
      {!!omissions.length && (
        <details className="text-[13px] text-[var(--muted)]">
          <summary className="min-h-11 cursor-pointer py-2">What couldn’t be read</summary>
          <ul className="list-disc space-y-1 pl-5">
            {omissions.map(({ id, label }) => <li key={id}>{label}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

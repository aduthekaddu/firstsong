import { strToU8, zipSync, type Zippable } from "fflate";
import { legacyTakes, readLegacyTake } from "./legacy-takes";
import { studioTakes, type SongProject } from "./song-project";
import { firstLineKey, readStageZeroWriting } from "./stage-zero";
import { audioExtension, buildSongSheet, getTake } from "./studio-audio";
import { writingTake, writingTakeId } from "./writing-room";

type RecordingFile = {
  id: string; label: string; file: string; mimeType: string; seconds: number;
  createdAt?: number; caption?: string;
};
export type BackupOmission = { id: string; label: string };
type Backup =
  | { kind: "empty" }
  | { kind: "unreadable"; omissions: BackupOmission[] }
  | { kind: "archive"; blob: Blob; takeCount: number; omissions: BackupOmission[] };

function readLocal(key: string) {
  return localStorage.getItem(key);
}

export async function buildSongBackup(song: SongProject, projectId?: string, notesUnreadable = false): Promise<Backup> {
  const recordings: RecordingFile[] = [];
  const omissions: BackupOmission[] = [];
  if (notesUnreadable) omissions.push({ id: "song-notes", label: "Some song notes" });
  const earlier = projectId ? null : readStageZeroWriting({ getItem: readLocal }, (key) => {
    omissions.push({ id: `stage-0-${key}`, label: key === firstLineKey ? "Stage 0 first line" : "Stage 0 rhythm choice" });
  });
  // Store already encoded audio without recompressing it and keep each original intact.
  const files: Zippable = { "manifest.json": new Uint8Array(), "lyrics-and-chords.txt": strToU8(buildSongSheet(song, { stageZeroLine: earlier?.firstLine, independent: !!projectId })) };

  for (const { id, label } of (projectId ? [] : legacyTakes)) {
    try {
      const { value: saved } = readLegacyTake(id);
      if (!saved) continue;
      const comma = saved.audio.indexOf(",");
      const mimeType = saved.audio.slice(5, comma - ";base64".length);
      const file = `takes/stage-0-${id}.${audioExtension(mimeType)}`;
      files[file] = Uint8Array.from(atob(saved.audio.slice(comma + 1)), (character) => character.charCodeAt(0));
      recordings.push({ id: `stage-0-${id}`, label, file, mimeType, seconds: saved.seconds, caption: saved.caption });
    } catch {
      omissions.push({ id: `stage-0-${id}`, label });
    }
  }
  for (const { id, label } of (projectId ? [writingTake] : Object.values(studioTakes))) {
    try {
      const saved = await getTake(projectId ? writingTakeId(projectId) : id);
      if (!saved) continue;
      const mimeType = saved.blob.type;
      const file = `takes/${id}.${audioExtension(mimeType)}`;
      files[file] = new Uint8Array(await saved.blob.arrayBuffer());
      recordings.push({ id, label, file, mimeType, seconds: saved.seconds, createdAt: saved.createdAt });
    } catch {
      omissions.push({ id, label });
    }
  }

  const hasEarlierWriting = earlier && (earlier.firstLine.trim() || earlier.rhythm);
  if (!recordings.length && !hasEarlierWriting && !Object.values(song).some((value) => value.trim())) {
    return omissions.length ? { kind: "unreadable", omissions } : { kind: "empty" };
  }
  files["manifest.json"] = strToU8(JSON.stringify({
    format: "firstsong-song-backup", version: 1, exportedAt: new Date().toISOString(), song,
    ...(hasEarlierWriting ? { stageZero: earlier } : {}), recordings,
    ...(omissions.length ? { omissions } : {}),
  }, null, 2) + "\n");
  if (omissions.length) {
    files["backup-notes.txt"] = strToU8([
      "Partial Firstsong backup", "",
      "These items could not be checked or read, so this ZIP may not include them:", "",
      ...omissions.map(({ label }) => `- ${label}`), "",
      "Nothing was deleted. Open Firstsong in the browser that saved the work to try again.", "",
    ].join("\n"));
  }
  const bytes = zipSync(files, { level: 0 });
  return { kind: "archive", blob: new Blob([bytes], { type: "application/zip" }), takeCount: recordings.length, omissions };
}

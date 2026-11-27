import { strToU8, zipSync, type Zippable } from "fflate";
import { legacyTakes, parseLegacyTake } from "./legacy-takes";
import { studioTakes, type SongProject } from "./song-project";
import { readStageZeroWriting } from "./stage-zero";
import { audioExtension, buildSongSheet, getTake } from "./studio-audio";

import { writingTake, writingTakeId } from "./writing-room";

type RecordingFile = {
  id: string; label: string; file: string; mimeType: string; seconds: number;
  createdAt?: number; caption?: string;
};

export async function buildSongBackup(song: SongProject, projectId?: string) {
  const recordings: RecordingFile[] = [];
  const earlier = projectId ? null : readStageZeroWriting(localStorage);
  // Store already encoded audio without recompressing it and keep each original intact.
  const files: Zippable = { "manifest.json": new Uint8Array(), "lyrics-and-chords.txt": strToU8(buildSongSheet(song, earlier?.firstLine)) };

  for (const { id, label } of (projectId ? [] : legacyTakes)) {
    const stored = localStorage.getItem(`firstsong:v1:take:${id}`);
    if (stored === null) continue;
    const saved = parseLegacyTake(JSON.parse(stored));
    if (!saved) throw new Error("Could not read Stage 0 recording.");
    const comma = saved.audio.indexOf(",");
    const mimeType = saved.audio.slice(5, comma - ";base64".length);
    const file = `takes/stage-0-${id}.${audioExtension(mimeType)}`;
    files[file] = Uint8Array.from(atob(saved.audio.slice(comma + 1)), (character) => character.charCodeAt(0));
    recordings.push({ id: `stage-0-${id}`, label, file, mimeType, seconds: saved.seconds, caption: saved.caption });
  }
  for (const { id, label } of (projectId ? [writingTake] : Object.values(studioTakes))) {
    const saved = await getTake(projectId ? writingTakeId(projectId) : id);
    if (!saved) continue;
    const mimeType = saved.blob.type;
    const file = `takes/${id}.${audioExtension(mimeType)}`;
    files[file] = new Uint8Array(await saved.blob.arrayBuffer());
    recordings.push({ id, label, file, mimeType, seconds: saved.seconds, createdAt: saved.createdAt });
  }

  const hasEarlierWriting = earlier && (earlier.firstLine.trim() || earlier.rhythm);
  if (!recordings.length && !hasEarlierWriting && !Object.values(song).some((value) => value.trim())) return null;
  files["manifest.json"] = strToU8(JSON.stringify({
    format: "firstsong-song-backup", version: 1, exportedAt: new Date().toISOString(), song,
    ...(hasEarlierWriting ? { stageZero: earlier } : {}), recordings,
  }, null, 2) + "\n");
  const bytes = zipSync(files, { level: 0 });
  return { blob: new Blob([bytes], { type: "application/zip" }), takeCount: recordings.length };
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { audioExtension, buildSongSheet, encodeWav, formatClock, getTake, saveTake } from "../lib/studio-audio.ts";
import { emptySong, parseSong, studioTakes } from "../lib/song-project.ts";

test("WAV trim uses sample boundaries, interleaves stereo and clips safely", async () => {
  const blob = encodeWav([new Float32Array([0, -1, 2, 0]), new Float32Array([0, 1, -2, 0])], 4, 0.25, 0.75);
  assert.equal(blob.type, "audio/wav");
  const data = await blob.arrayBuffer();
  const bytes = new DataView(data);
  assert.equal(Buffer.from(data).toString("ascii", 0, 12).slice(0, 4), "RIFF");
  assert.equal(Buffer.from(data).toString("ascii", 8, 12), "WAVE");
  assert.equal(bytes.getUint16(22, true), 2);
  assert.equal(bytes.getUint32(24, true), 4);
  assert.equal(bytes.getUint32(40, true), 8);
  assert.deepEqual([44, 46, 48, 50].map((i) => bytes.getInt16(i, true)), [-32768, 32767, 32767, -32768]);
  assert.throws(() => encodeWav([new Float32Array(4)], 4, 0.5, 0.5), /nonempty/);
});

test("song sheet keeps its form, section copy and Unicode", () => {
  const sheet = buildSongSheet({ ...emptySong, title: "  Rañn  ", hook: "rain on the coat", verseOne: "a bus in Pune", verseTwo: "the next morning", chords: "Em | Asus2", arrangement: "softer" });
  assert.match(sheet, /^Rañn\n\nForm:/);
  assert.match(sheet, /Verse 1\na bus in Pune\n\nChorus\nrain on the coat\n\nVerse 2\nthe next morning/);
  assert.match(sheet, /Arrangement notes\nsofter/);
  assert.doesNotMatch(sheet, /Ending/);
});

test("song parser coerces nothing and limits persisted field sizes", () => {
  const actual = parseSong({ title: "a".repeat(250), hook: 123, verseOne: "line", unexpected: "ignore" });
  assert.equal(actual.title.length, 100);
  assert.equal(actual.hook, "");
  assert.equal(actual.verseOne, "line");
  assert.equal(Object.hasOwn(actual, "unexpected"), false);
});

test("unsupported persistent storage still leaves the current take downloadable", async () => {
  const take = { blob: new Blob(["sample"], { type: "audio/webm" }), seconds: 1, createdAt: 10 };
  await assert.rejects(saveTake("unit-test", take));
  assert.equal(await getTake("unit-test"), take);
});

test("format-specific original downloads and unique recording slots", () => {
  assert.equal(audioExtension("audio/webm;codecs=opus"), "webm");
  assert.equal(audioExtension("audio/mp4;codecs=mp4a.40.2"), "m4a");
  assert.equal(audioExtension("audio/ogg"), "ogg");
  assert.equal(formatClock(65.9), "1:05");
  const names = Object.values(studioTakes).map(({ id }) => id);
  assert.equal(names.length, new Set(names).size);
});

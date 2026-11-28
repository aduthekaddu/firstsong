import assert from "node:assert/strict";
import test from "node:test";
import { firstLineKey, isStageZeroWritingTemporary, maxLineLength, readStageZeroWriting, rhythmKey, writeStageZeroField } from "../lib/stage-zero.ts";

function storage(values) {
  return { getItem: (key) => values[key] ?? null };
}

test("Stage 0 backup reads the existing first-line and rhythm keys", () => {
  assert.deepEqual(readStageZeroWriting(storage({
    "firstsong:v1:line": JSON.stringify("बारिश on the windowsill"),
    "firstsong:v1:rhythm": JSON.stringify("rhythm-b"),
  })), { firstLine: "बारिश on the windowsill", rhythm: "rhythm-b" });
});

test("one damaged Stage 0 value does not hide the other", () => {
  assert.deepEqual(readStageZeroWriting(storage({
    "firstsong:v1:line": "{invalid",
    "firstsong:v1:rhythm": JSON.stringify("rhythm-a"),
  })), { firstLine: "", rhythm: "rhythm-a" });
  assert.deepEqual(readStageZeroWriting(storage({
    "firstsong:v1:line": JSON.stringify("a".repeat(250)),
    "firstsong:v1:rhythm": JSON.stringify("rhythm-z"),
  })), { firstLine: "a".repeat(maxLineLength), rhythm: null });
});

test("a rejected Stage 0 write overrides only its field until that field saves", () => {
  const persisted = {
    "firstsong:v1:line": JSON.stringify("Old line"),
    "firstsong:v1:rhythm": JSON.stringify("rhythm-a"),
  };
  const denied = { setItem: () => { throw new Error("Storage is full"); } };
  const writable = { setItem: (key, value) => { persisted[key] = value; } };
  try {
    writeStageZeroField(firstLineKey, "", denied);
    writeStageZeroField(rhythmKey, "rhythm-b", denied);
    assert.equal(isStageZeroWritingTemporary(firstLineKey), true);
    assert.deepEqual(readStageZeroWriting(storage(persisted)), { firstLine: "", rhythm: "rhythm-b" });
    assert.equal(persisted["firstsong:v1:line"], '"Old line"');
    writeStageZeroField(firstLineKey, "New line", writable);
    assert.equal(isStageZeroWritingTemporary(firstLineKey), false);
    assert.equal(isStageZeroWritingTemporary(rhythmKey), true);
    assert.equal(persisted["firstsong:v1:rhythm"], '"rhythm-a"');
    assert.deepEqual(readStageZeroWriting(storage(persisted)), { firstLine: "New line", rhythm: "rhythm-b" });
  } finally {
    writeStageZeroField(firstLineKey, "New line", writable);
    writeStageZeroField(rhythmKey, "rhythm-b", writable);
  }
  assert.equal(isStageZeroWritingTemporary(rhythmKey), false);
  assert.equal(persisted["firstsong:v1:rhythm"], '"rhythm-b"');
});

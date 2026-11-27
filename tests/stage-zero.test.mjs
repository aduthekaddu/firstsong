import assert from "node:assert/strict";
import test from "node:test";
import { maxLineLength, readStageZeroWriting } from "../lib/stage-zero.ts";

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

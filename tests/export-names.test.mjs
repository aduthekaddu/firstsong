import assert from "node:assert/strict";
import test from "node:test";
import { songFileStem } from "../lib/export-names.ts";

test("export names keep Unicode titles and drop path punctuation", () => {
  assert.equal(songFileStem("Blue Cup", 60), "blue-cup");
  assert.equal(songFileStem("   E\u0301te\u0301 / à: Goa  ", 60), "été-à-goa");
  assert.equal(songFileStem("बारिश", 48), "बारिश");
  assert.equal(songFileStem("नई धुन", 48), "नई-धुन");
  assert.equal(songFileStem("../a\\b:*?\u0000c", 48), "a-b-c");
  assert.equal(songFileStem(" / ... 🎵 ", 48), "");
});

test("export names clip long titles without splitting marks or leaving a separator", () => {
  assert.equal(songFileStem("rain at night", 5), "rain");
  assert.equal(songFileStem("aधुन", 2), "a");
  assert.equal(songFileStem("𐐷".repeat(45), 60), "𐐷".repeat(30));
});

import assert from "node:assert/strict";
import test from "node:test";
import { readReturnLesson, readLessonProgress, writeLessonProgress } from "../lib/lesson-progress.ts";

const lesson = { id: "example", steps: [{ id: "start" }, { id: "middle" }, { id: "end" }] };
const key = "firstsong:v1:lesson:example";
function storage(entries = []) {
  const data = new Map(entries);
  return { getItem: (name) => data.get(name) ?? null, setItem: (name, value) => data.set(name, value) };
}

test("late position changes never undo completed steps or the checkpoint", () => {
  const source = storage();
  writeLessonProgress(source, lesson, "middle", "start");
  writeLessonProgress(source, lesson, "end", "middle");
  writeLessonProgress(source, lesson, "end", "end", true);
  writeLessonProgress(source, lesson, "start");
  writeLessonProgress(source, lesson, "middle", "start");
  assert.deepEqual(readLessonProgress(source, lesson), {
    current: "middle", visited: ["start", "middle", "end"], checkpoint: true, damaged: false,
  });
});

test("new progress combines with legacy marks and ignores retired step IDs", () => {
  const source = storage([[key, JSON.stringify({ current: "middle", visited: ["start", "retired", 1], finished: true })]]);
  assert.deepEqual(readLessonProgress(source, lesson), {
    current: "middle", visited: ["start"], checkpoint: true, damaged: false,
  });
  writeLessonProgress(source, lesson, "end", "middle");
  assert.deepEqual(readLessonProgress(source, lesson), {
    current: "end", visited: ["start", "middle"], checkpoint: true, damaged: false,
  });
});

test("the home shortcut ignores an old route-only hint and keeps valid review history", () => {
  const weekSix = { ...lesson, id: "week-6" };
  const lessons = [lesson, weekSix];
  const last = "firstsong:v1:last-course-lesson";
  const source = storage([[last, weekSix.id]]);
  assert.equal(readReturnLesson(source, lessons), null);
  writeLessonProgress(source, lesson, "end", "end", true);
  source.setItem(last, weekSix.id); // A legacy build visited here without saving.
  assert.deepEqual(readReturnLesson(source, lessons), { lesson, checkpoint: true });
  writeLessonProgress(source, weekSix, "start");
  assert.deepEqual(readReturnLesson(source, lessons), { lesson: weekSix, checkpoint: false });
  writeLessonProgress(source, lesson, "middle");
  assert.deepEqual(readReturnLesson(source, lessons), { lesson, checkpoint: true });
});

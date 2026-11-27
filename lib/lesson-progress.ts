import type { Lesson } from "./lessons";

const baseKey = (lesson: Lesson) => `firstsong:v1:lesson:${lesson.id}`;
const positionKey = (lesson: Lesson) => `${baseKey(lesson)}:position`;
const checkpointKey = (lesson: Lesson) => `${baseKey(lesson)}:checkpoint`;
const doneKey = (lesson: Lesson, step: string) => `${baseKey(lesson)}:done:${step}`;

export type LessonProgress = { current: string; visited: string[]; checkpoint: boolean };
export const emptyLessonProgress: LessonProgress = { current: "", visited: [], checkpoint: false };

export function readLessonProgress(source: Storage, lesson: Lesson): LessonProgress & { damaged: boolean } {
  const stepIds = lesson.steps.map((step) => step.id);
  let legacy = emptyLessonProgress;
  let damaged = false;
  try {
    const data: unknown = JSON.parse(source.getItem(baseKey(lesson)) ?? "null");
    if (data && typeof data === "object") {
      legacy = {
        current: "current" in data && typeof data.current === "string" && stepIds.includes(data.current) ? data.current : "",
        visited: "visited" in data && Array.isArray(data.visited) ? data.visited : [],
        checkpoint: "finished" in data && data.finished === true,
      };
    }
  } catch {
    damaged = true;
  }

  const position = source.getItem(positionKey(lesson));
  return {
    current: position && stepIds.includes(position) ? position : legacy.current,
    visited: stepIds.filter((id) => legacy.visited.includes(id) || source.getItem(doneKey(lesson, id)) === "1"),
    checkpoint: legacy.checkpoint || source.getItem(checkpointKey(lesson)) === "1",
    damaged,
  };
}

export function isLessonStorageChange(key: string | null, lesson: Lesson) {
  return key === null || key === baseKey(lesson) || key.startsWith(`${baseKey(lesson)}:`);
}

// Completion writes only add marks. A separate cursor can move backward freely
// without replacing any of those marks, even from a tab opened much earlier.
export function writeLessonProgress(source: Storage, lesson: Lesson, current: string, completed?: string, checkpoint = false) {
  if (completed) source.setItem(doneKey(lesson, completed), "1");
  if (checkpoint) source.setItem(checkpointKey(lesson), "1");
  source.setItem(positionKey(lesson), current);
}

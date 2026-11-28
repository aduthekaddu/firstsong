"use client";

import { useEffect, useState } from "react";
import type { Lesson } from "./lessons";
import { emptyLessonProgress, isLessonStorageChange, readLessonProgress, writeLessonProgress } from "./lesson-progress";

export function useLessonProgress(lesson: Lesson) {
  const [value, setValue] = useState(emptyLessonProgress);
  const [checkpointView, setCheckpointView] = useState(false);
  const [warning, setWarning] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = readLessonProgress(localStorage, lesson);
      setValue(saved);
      setCheckpointView(saved.checkpoint);
      setWarning(saved.damaged ? "Some earlier practice progress could not be read." : "");
    } catch {
      setWarning("Saved progress could not be read in this browser.");
    }
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.storageArea !== localStorage || !isLessonStorageChange(event.key, lesson)) return;
      try {
        const saved = readLessonProgress(localStorage, lesson);
        // A different tab can add completion, but cannot move this tab's view.
        setValue((current) => ({
          ...current,
          visited: [...new Set([...current.visited, ...saved.visited])],
          checkpoint: current.checkpoint || saved.checkpoint,
        }));
      } catch {
        setWarning("Saved progress could not be read in this browser.");
      }
    }

    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [lesson]);

  function save(current: string, completed?: string, checkpoint = false) {
    setValue((prior) => ({
      current,
      visited: completed ? [...new Set([...prior.visited, completed])] : prior.visited,
      checkpoint: prior.checkpoint || checkpoint,
    }));
    setCheckpointView(checkpoint);
    try {
      writeLessonProgress(localStorage, lesson, current, completed, checkpoint);
      setWarning("");
    } catch {
      setWarning("This progress may not be saved for your next visit.");
    }
  }

  return { value, checkpointView, setCheckpointView, warning, ready, save };
}

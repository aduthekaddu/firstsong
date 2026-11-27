"use client";

import { useEffect, useState } from "react";
import { emptySong, parseSong, songFieldLimit, songFields, type SongField } from "./song-project";

import { writingFieldKey } from "./writing-room";

const legacyKey = "firstsong:v1:song-project";
const fieldKey = (field: SongField, id?: string) => id ? writingFieldKey(id, field) : `${legacyKey}:${field}`;

export function useSongProject(id?: string) {
  const [value, setValue] = useState(emptySong);
  const [ready, setReady] = useState(false);
  const [readWarning, setReadWarning] = useState(false);
  const [unsaved, setUnsaved] = useState<Set<SongField>>(() => new Set());

  useEffect(() => {
    function refresh() {
      try {
        let legacy = emptySong;
        let damaged = false;
        try {
          if (!id) legacy = parseSong(JSON.parse(localStorage.getItem(legacyKey) ?? "null"));
        } catch {
          damaged = true;
        }
        const next = { ...legacy };
        for (const field of songFields) {
          const stored = localStorage.getItem(fieldKey(field, id));
          // Missing keys fall back to the old document; a saved empty field does not.
          if (stored !== null) next[field] = stored.slice(0, songFieldLimit(field));
        }
        setValue(next);
        setReadWarning(damaged);
      } catch {
        setReadWarning(true);
      }
    }

    function sync(event: StorageEvent) {
      if (event.storageArea !== localStorage) return;
      if (event.key === null || (!id && event.key === legacyKey)) {
        refresh();
        return;
      }
      const field = songFields.find((candidate) => fieldKey(candidate, id) === event.key);
      if (!field) return;
      try {
        const stored = localStorage.getItem(fieldKey(field, id));
        const next = stored ?? (id ? "" : parseSong(JSON.parse(localStorage.getItem(legacyKey) ?? "null"))[field]);
        setValue((current) => ({ ...current, [field]: next.slice(0, songFieldLimit(field)) }));
      } catch {
        setReadWarning(true);
      }
    }

    refresh();
    setReady(true);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [id]);

  function save(field: SongField, text: string) {
    const next = text.slice(0, songFieldLimit(field));
    setValue((current) => ({ ...current, [field]: next }));
    let saved = false;
    try {
      localStorage.setItem(fieldKey(field, id), next);
      saved = true;
    } catch {
      // Keep the current edit available for copying or export.
    }
    setUnsaved((current) => {
      if (current.has(field) === !saved) return current;
      const next = new Set(current);
      if (saved) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  const warning = unsaved.size ? "Some edits could not be saved for your next visit. Keep a copy before leaving."
    : readWarning ? "Some saved song data could not be read in this browser." : "";
  return { value, ready, save, warning };
}

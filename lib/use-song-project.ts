"use client";

import { useEffect, useState } from "react";
import { emptySong, parseSong, songFieldLimit, songFields, type SongField } from "./song-project";
import { writingFieldKey } from "./writing-room";

const legacyKey = "firstsong:v1:song-project";
const fieldKey = (field: SongField, id?: string) => id ? writingFieldKey(id, field) : `${legacyKey}:${field}`;

// Key by the exact song and field. A rejected write survives a step change
// in this tab, but must not replace the saved copy in another tab.
const temporaryEdits = new Map<string, string>();

function hasTemporaryEdits(id?: string) {
  return songFields.some((field) => temporaryEdits.has(fieldKey(field, id)));
}

export function useSongProject(id?: string) {
  const [value, setValue] = useState(emptySong);
  const [ready, setReady] = useState(false);
  const [readWarning, setReadWarning] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    function refresh() {
      let next = { ...emptySong };
      let damaged = false;
      if (!id) {
        try {
          next = { ...parseSong(JSON.parse(localStorage.getItem(legacyKey) ?? "null")) };
        } catch {
          damaged = true;
        }
      }
      for (const field of songFields) {
        const key = fieldKey(field, id);
        const temporary = temporaryEdits.get(key);
        if (temporary !== undefined) {
          next[field] = temporary;
          continue;
        }
        try {
          const stored = localStorage.getItem(key);
          // Missing keys fall back to the old document; an empty value does not.
          if (stored !== null) next[field] = stored.slice(0, songFieldLimit(field));
        } catch {
          damaged = true;
        }
      }
      setValue(next);
      setReadWarning(damaged);
      setUnsaved(hasTemporaryEdits(id));
    }

    function sync(event: StorageEvent) {
      if (event.storageArea !== localStorage) return;
      if (event.key === null || (!id && event.key === legacyKey) ||
          songFields.some((field) => fieldKey(field, id) === event.key)) refresh();
    }

    refresh();
    setReady(true);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [id]);

  function save(field: SongField, text: string) {
    const next = text.slice(0, songFieldLimit(field));
    const key = fieldKey(field, id);
    let saved = false;
    try {
      localStorage.setItem(key, next);
      temporaryEdits.delete(key);
      saved = true;
    } catch {
      temporaryEdits.set(key, next);
    }
    setValue((current) => ({ ...current, [field]: next }));
    setUnsaved(hasTemporaryEdits(id));
    return saved;
  }

  const warning = unsaved ? "Some edits are only available in this tab. Copy them before reloading or closing."
    : readWarning ? "Some saved song data could not be read in this browser." : "";
  return { value, ready, save, warning, readWarning };
}

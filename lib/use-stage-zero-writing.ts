"use client";

import { useEffect, useState } from "react";
import {
  firstLineKey, isStageZeroWritingTemporary, readStageZeroWriting, rhythmKey, stageZeroWritingKeys,
  subscribeToStageZeroWriting, writeStageZeroField, type Rhythm,
} from "./stage-zero";

const storage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};

export function useStageZeroWriting() {
  const [state, setState] = useState({
    firstLine: "", rhythm: null as Rhythm | null, ready: false,
    lineTemporary: false, rhythmTemporary: false, unreadable: false,
  });

  useEffect(() => {
    function refresh() {
      let unreadable = false;
      const writing = readStageZeroWriting(storage, () => { unreadable = true; });
      setState({
        ...writing, ready: true, unreadable,
        lineTemporary: isStageZeroWritingTemporary(firstLineKey),
        rhythmTemporary: isStageZeroWritingTemporary(rhythmKey),
      });
    }
    function sync(event: StorageEvent) {
      if (event.storageArea === localStorage && (event.key === null || stageZeroWritingKeys.includes(event.key))) refresh();
    }
    const stop = subscribeToStageZeroWriting(refresh);
    window.addEventListener("storage", sync);
    refresh();
    return () => {
      stop();
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    ...state,
    saveLine: (value: string) => writeStageZeroField(firstLineKey, value, storage),
    saveRhythm: (value: Rhythm | null) => writeStageZeroField(rhythmKey, value, storage),
    retry: () => {
      if (state.lineTemporary) writeStageZeroField(firstLineKey, state.firstLine, storage);
      if (state.rhythmTemporary) writeStageZeroField(rhythmKey, state.rhythm, storage);
    },
  };
}

"use client";

import { useEffect, useState } from "react";

export function useLocalValue<T>({
  key, initial, parse, syncAcrossTabs = false,
}: {
  key: string;
  initial: T;
  parse: (value: unknown) => T;
  syncAcrossTabs?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const storageKey = `firstsong:v1:${key}`;
    function load() {
      try {
        const stored = localStorage.getItem(storageKey);
        setValue(stored === null ? initial : parse(JSON.parse(stored)));
      } catch {
        setWarning("Saved data could not be read in this browser.");
      }
    }
    function sync(event: StorageEvent) {
      if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) load();
    }
    load();
    setReady(true);
    if (!syncAcrossTabs) return;
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key, initial, parse, syncAcrossTabs]);

  function save(next: T) {
    setValue(next);
    try {
      localStorage.setItem(`firstsong:v1:${key}`, JSON.stringify(next));
      setWarning("");
      return true;
    } catch {
      setWarning("This change is available now but could not be saved for your next visit.");
      return false;
    }
  }

  return { value, save, ready, warning };
}

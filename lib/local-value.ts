"use client";

import { useEffect, useState } from "react";

export function useLocalValue<T>({
  key, initial, parse,
}: {
  key: string;
  initial: T;
  parse: (value: unknown) => T;
}) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`firstsong:v1:${key}`);
      if (stored !== null) setValue(parse(JSON.parse(stored)));
    } catch {
      setWarning("Saved data could not be read in this browser.");
    }
    setReady(true);
  }, [key, parse]);

  function save(next: T) {
    setValue(next);
    try {
      localStorage.setItem(`firstsong:v1:${key}`, JSON.stringify(next));
      setWarning("");
    } catch {
      setWarning("This change is available now but could not be saved for your next visit.");
    }
  }

  return { value, save, ready, warning };
}

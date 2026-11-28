"use client";

import NextLink from "next/link";
import { createContext, useCallback, useContext, useRef, useState, type ComponentProps, type ReactNode } from "react";

const RecordingNavigation = createContext<{
  setRecording: (active: boolean) => void;
  canNavigate: () => boolean;
}>({
  setRecording: (_active: boolean) => {},
  canNavigate: () => true,
});

export function useRecordingNavigation() {
  return useContext(RecordingNavigation);
}

export function RecordingNavigationProvider({ children }: { children: ReactNode }) {
  const recording = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const setRecording = useCallback((active: boolean) => {
    recording.current = active;
    if (!active) setBlocked(false);
  }, []);
  const canNavigate = useCallback(() => {
    if (!recording.current) return true;
    setBlocked(true);
    return false;
  }, []);

  return (
    <RecordingNavigation.Provider value={{ setRecording, canNavigate }}>
      <div role="status" className="fixed inset-x-0 top-[var(--nav-h)] z-40">
        {blocked && (
          <div className="border-b border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]">
            <div className="shell-wrap py-3 text-[14px]">Finish the recording before leaving this lesson.</div>
          </div>
        )}
      </div>
      {children}
    </RecordingNavigation.Provider>
  );
}

export function RecordingLink({ onNavigate, ...props }: ComponentProps<typeof NextLink>) {
  const { canNavigate } = useRecordingNavigation();
  return (
    <NextLink {...props} onNavigate={(event) => {
      if (canNavigate()) onNavigate?.(event);
      else event.preventDefault();
    }} />
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createWritingProject, listWritingProjects, writingProjectHref } from "../lib/writing-room";
import { RecordingLink as Link, useRecordingNavigation } from "./recording-navigation";

export function WritingProjects() {
  const router = useRouter();
  const { canNavigate } = useRecordingNavigation();
  const [projects, setProjects] = useState<ReturnType<typeof listWritingProjects>>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    function refresh() {
      try {
        setProjects(listWritingProjects());
        setWarning("");
      } catch {
        setWarning("Songs could not be read from this browser.");
      }
      setReady(true);
    }
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function create() {
    if (!ready || pending || !canNavigate()) return;
    setPending(true);
    try {
      const id = createWritingProject();
      router.push(writingProjectHref(id));
    } catch {
      setPending(false);
      setWarning("Couldn’t start a song. Check that this browser allows site storage.");
    }
  }

  return (
    <section id="new-song" className="scroll-mt-24 space-y-4 border-y border-[var(--line)] py-6" aria-labelledby="writing-title">
      <div className="space-y-1.5">
        <h2 id="writing-title" className="type-h3 text-[var(--ink)]">Write another song</h2>
        <p className="text-[15px] leading-relaxed text-[var(--ink-soft)]">Start with a blank page. Your course song and progress stay as they are.</p>
      </div>
      <button type="button" className="btn-secondary" disabled={!ready || pending} onClick={create}>
        <Plus size={16} aria-hidden="true" /> New blank song
      </button>
      {warning && <p role="status" className="text-[14px] text-[var(--ink-soft)]">{warning}</p>}
      {projects.length > 0 && (
        <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]" aria-label="Independent songs">
          {projects.map(({ id, title, createdAt }) => (
            <li key={id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
              <Link href={writingProjectHref(id)} className="ui-link min-h-11 min-w-0 break-words text-[15px]">{title || "Untitled song"}</Link>
              <time dateTime={new Date(createdAt).toISOString()} className="type-meta">{new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { RecordingLink as Link, RecordingNavigationProvider, useRecordingNavigation } from "./recording-navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Command, Menu, Moon, Sun, X } from "lucide-react";
import { closeDialogSmoothly } from "../lib/dialog-close";
import {
  applyColorSchemeMeta,
  getResolvedTheme,
  getStoredScheme,
  setExplicitColorScheme,
  toggleColorScheme,
  type ResolvedTheme,
} from "../lib/theme";

const navItems = [
  { href: "/", label: "Stage 0" },
  { href: "/#curriculum", label: "Course" },
  { href: "/songbook/", label: "Songbook" },
  { href: "/chords/", label: "Chords" },
] as const;

type PaletteCommand = {
  id: string;
  label: string;
  detail: string;
  shortcut?: string;
  run: () => void;
};

type FrameProps = { path: string; children: ReactNode };

export function SiteFrame(props: FrameProps) {
  return <RecordingNavigationProvider><Frame {...props} /></RecordingNavigationProvider>;
}

function Frame({
  path,
  children,
}: FrameProps) {
  const router = useRouter();
  const { canNavigate } = useRecordingNavigation();
  const [theme, setTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);
  const [viewportLabel, setViewportLabel] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  const paletteRef = useRef<HTMLDialogElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setMounted(true);
    setTheme(getResolvedTheme());

    const updateViewport = () => {
      setViewportLabel(`${window.innerWidth}×${window.innerHeight}`);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });

    const onThemeEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ resolved: ResolvedTheme }>).detail;
      if (detail?.resolved) setTheme(detail.resolved);
    };
    window.addEventListener("firstsong:theme-change", onThemeEvent);

    const onStorage = (event: StorageEvent) => {
      if (event.key === "color-scheme") {
        const stored = getStoredScheme();
        applyColorSchemeMeta(stored);
        setTheme(getResolvedTheme());
      }
    };
    window.addEventListener("storage", onStorage);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => {
      if (!getStoredScheme()) {
        setTheme(getResolvedTheme());
      }
    };
    media.addEventListener("change", onMedia);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("firstsong:theme-change", onThemeEvent);
      window.removeEventListener("storage", onStorage);
      media.removeEventListener("change", onMedia);
    };
  }, []);

  function openPalette() {
    const dlg = paletteRef.current;
    if (!dlg || dlg.open) return;
    setPaletteQuery("");
    dlg.showModal();
    window.requestAnimationFrame(() => paletteInputRef.current?.focus());
  }

  function closePalette() {
    void closeDialogSmoothly(paletteRef.current);
  }

  function openMobileMenu() {
    const dlg = mobileDialogRef.current;
    if (!dlg || dlg.open) return;
    setMenuOpen(true);
    dlg.showModal();
  }

  async function closeMobileMenu() {
    await closeDialogSmoothly(mobileDialogRef.current);
    setMenuOpen(false);
  }

  // Global keyboard shortcuts: ":" or Cmd/Ctrl+K opens the command palette (hancore-inspired)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (paletteRef.current?.open) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (!inEditable && !event.metaKey && !event.ctrlKey && !event.altKey && event.key === ":") {
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Intercept native cancel (Esc) on dialogs so Firefox/Safari animate exits smoothly
  useEffect(() => {
    const pal = paletteRef.current;
    const mob = mobileDialogRef.current;

    const handlePalCancel = (event: Event) => {
      event.preventDefault();
      closePalette();
    };
    const handleMobCancel = (event: Event) => {
      event.preventDefault();
      void closeMobileMenu();
    };

    pal?.addEventListener("cancel", handlePalCancel);
    mob?.addEventListener("cancel", handleMobCancel);
    return () => {
      pal?.removeEventListener("cancel", handlePalCancel);
      mob?.removeEventListener("cancel", handleMobCancel);
    };
  }, []);

  function handleToggleTheme() {
    const next = toggleColorScheme();
    setTheme(next);
  }

  function navigate(href: string) {
    if (canNavigate()) router.push(href);
  }

  const commands: PaletteCommand[] = [
    {
      id: "go-stage0",
      label: "Open Stage 0",
      detail: "First 15-minute session and playable guitar neck",
      shortcut: "1",
      run: () => {
        closePalette();
        navigate("/");
      },
    },
    {
      id: "go-session",
      label: "Jump to Stage 0 workbench",
      detail: "Tuner, 4-beat tap, Em chord, lyric line, hook recorder",
      run: () => {
        closePalette();
        if (path === "/") {
          document.getElementById("lesson")?.scrollIntoView({ behavior: "auto" });
        } else {
          navigate("/#lesson");
        }
      },
    },
    {
      id: "go-week1",
      label: "Open Week 1",
      detail: "Downstroke metronome (40–90 BPM) and four-bar memo",
      shortcut: "2",
      run: () => {
        closePalette();
        navigate("/week-1/");
      },
    },
    {
      id: "go-chords",
      label: "Open 10 open chords",
      detail: "Orbital chord wheel, progressions, and reference grid",
      shortcut: "3",
      run: () => {
        closePalette();
        navigate("/chords/");
      },
    },
    {
      id: "theme-dark",
      label: "Switch to dark studio mode",
      detail: "Matte obsidian ground (#0c0c0d)",
      run: () => {
        setTheme(setExplicitColorScheme("dark"));
        closePalette();
      },
    },
    {
      id: "theme-light",
      label: "Switch to gallery light mode",
      detail: "Daylight white ground (#ffffff)",
      run: () => {
        setTheme(setExplicitColorScheme("light"));
        closePalette();
      },
    },
    {
      id: "theme-system",
      label: "Follow system appearance",
      detail: "Match your operating system light or dark schedule",
      run: () => {
        setTheme(setExplicitColorScheme("system"));
        closePalette();
      },
    },
  ];

  const normalizedQuery = paletteQuery.trim().toLowerCase();
  const filteredCommands = normalizedQuery
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(normalizedQuery) ||
          cmd.detail.toLowerCase().includes(normalizedQuery)
      )
    : commands;

  return (
    <div className="flex min-h-svh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Fixed compact 56px single-row header: opaque ground, 1px bottom hairline */}
      <header className="fixed inset-x-0 top-0 z-40 h-[var(--nav-h)] border-b border-[var(--line)] bg-[var(--bg)]">
        <div className="shell-wrap flex h-full items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="cap-trim inline-flex min-h-11 items-center text-[15px] font-medium tracking-[-0.025em] text-[var(--ink)] no-underline"
            >
              Firstsong
            </Link>
            {mounted && viewportLabel && (
              <span
                aria-hidden="true"
                className="font-mono-num hidden text-[13px] text-[var(--muted)] lg:inline"
              >
                {viewportLabel}
              </span>
            )}
          </div>

          {/* Desktop Navigation & Utility Controls */}
          <div className="hidden items-center gap-7 md:flex">
            <nav aria-label="Primary" className="flex items-center gap-6">
              {navItems.map((item) => {
                const active = path === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`ui-link text-[14px] ${
                      active ? "text-[var(--ink)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="h-4 w-px bg-[var(--line)]" aria-hidden="true" />

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-pressed={theme === "dark"}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors duration-150 hover:text-[var(--ink)]"
              >
                <span aria-hidden="true">
                  {mounted && theme === "dark" ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
                </span>
                <span>
                  Dark mode{" "}
                  <span className="font-mono-num text-[var(--muted)]">
                    ({mounted && theme === "dark" ? "Y" : "N"})
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={openPalette}
                aria-label="Open command index"
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors duration-150 hover:text-[var(--ink)]"
              >
                <Command size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Index</span>
                <kbd
                  aria-hidden="true"
                  className="font-mono-num rounded-[3px] border border-[var(--line-strong)] px-1.5 py-0.5 text-[12px] leading-none text-[var(--muted)]"
                >
                  :
                </kbd>
              </button>
            </div>
          </div>

          {/* Mobile Controls (44px+ tap targets) */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--r-sm)] text-[var(--ink)]"
            >
              {mounted && theme === "dark" ? (
                <Sun size={18} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Moon size={18} strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={openMobileMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-sheet"
              aria-label="Open navigation menu"
              className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line-strong)] px-3 text-[14px] font-medium text-[var(--ink)]"
            >
              <Menu size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content (padded below fixed 56px bar) */}
      <main id="main" className="flex-1 pt-[var(--nav-h)]">
        {children}
      </main>

      {/* Plain Architectural Footer */}
      <footer className="mt-20 border-t border-[var(--line)] py-10">
        <div className="shell-wrap flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[15px] font-medium tracking-[-0.02em] text-[var(--ink)]">
              Firstsong
            </p>
            <p className="type-meta max-w-md">
              Free six-week beginner guitar and songwriting course. Progress, written lines, and audio takes stay in this browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[14px]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="ui-link text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={openPalette}
              className="ui-link cursor-pointer text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              Commands
            </button>
          </div>
        </div>
      </footer>

      {/* Native Top-Layer Command Palette (<dialog>) */}
      <dialog
        ref={paletteRef}
        aria-label="Command index"
        className="top-dialog"
        onClick={(event) => {
          if (event.target === paletteRef.current) closePalette();
        }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <span className="font-mono-num text-[14px] text-[var(--muted)]" aria-hidden="true">
            :
          </span>
          <input
            ref={paletteInputRef}
            type="text"
            value={paletteQuery}
            onChange={(event) => setPaletteQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filteredCommands[0]) {
                event.preventDefault();
                filteredCommands[0].run();
              }
            }}
            placeholder="Jump to a lesson, chord sheet, or theme"
            aria-label="Filter commands"
            className="min-h-9 flex-1 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            onClick={closePalette}
            aria-label="Close command index"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--r-sm)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <ul className="max-h-[60vh] divide-y divide-[var(--line)] overflow-y-auto p-0 m-0 list-none">
          {filteredCommands.length === 0 ? (
            <li className="px-4 py-6 text-[14px] text-[var(--muted)]">
              No matching commands.
            </li>
          ) : (
            filteredCommands.map((cmd) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  onClick={cmd.run}
                  className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--surface)]"
                >
                  <div>
                    <span className="block text-[15px] font-medium text-[var(--ink)]">
                      {cmd.label}
                    </span>
                    <span className="block text-[13px] text-[var(--muted)]">
                      {cmd.detail}
                    </span>
                  </div>
                  <ArrowUpRight size={15} strokeWidth={1.5} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
                </button>
              </li>
            ))
          )}
        </ul>
      </dialog>

      {/* Native Full-Screen Mobile Navigation Sheet (<dialog>) */}
      <dialog
        id="mobile-nav-sheet"
        ref={mobileDialogRef}
        aria-label="Mobile navigation"
        className="mobile-sheet"
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="shell-wrap flex h-[var(--nav-h)] items-center justify-between border-b border-[var(--line)]">
              <span className="text-[15px] font-medium tracking-[-0.025em] text-[var(--ink)]">
                Firstsong
              </span>
              <button
                type="button"
                onClick={() => void closeMobileMenu()}
                aria-label="Close navigation menu"
                className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line-strong)] px-3 text-[14px] font-medium text-[var(--ink)]"
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>Close</span>
              </button>
            </div>

            <nav aria-label="Mobile primary" className="shell-wrap mt-6 flex flex-col divide-y divide-[var(--line)]">
              {navItems.map((item) => {
                const active = path === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => void closeMobileMenu()}
                    className="flex min-h-14 items-center justify-between py-3 text-[22px] tracking-[-0.025em] text-[var(--ink)] no-underline"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight size={18} strokeWidth={1.5} className="text-[var(--muted)]" aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="shell-wrap border-t border-[var(--line)] py-6">
            <button
              type="button"
              onClick={handleToggleTheme}
              className="btn-secondary w-full justify-between"
            >
              <span>Appearance</span>
              <span className="font-mono-num text-[13px] text-[var(--muted)]">
                {mounted && theme === "dark" ? "Dark studio" : "Gallery light"}
              </span>
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

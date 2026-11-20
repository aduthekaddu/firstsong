/**
 * Color-scheme override helper following modern-web-guidance (dark-mode-toggle):
 * - Root meta[name="color-scheme"] starts at "light dark".
 * - Toggle picks the opposite of the currently rendered scheme.
 * - If that target matches the OS system preference, removes the stored override
 *   (returning meta content to "light dark") instead of pinning it against OS schedules.
 * - Syncs across tabs via the window "storage" event.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "color-scheme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredScheme(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === "light" || val === "dark" ? val : null;
  } catch {
    return null;
  }
}

export function getResolvedTheme(): ResolvedTheme {
  return getStoredScheme() ?? getSystemTheme();
}

export function applyColorSchemeMeta(stored: "light" | "dark" | null) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="color-scheme"]');
  const content = stored ?? "light dark";
  if (meta) {
    meta.setAttribute("content", content);
  }
  const resolved: ResolvedTheme = stored ?? getSystemTheme();
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", resolved === "dark" ? "#0c0c0d" : "#ffffff");
  }
  window.dispatchEvent(new CustomEvent("firstsong:theme-change", { detail: { resolved, stored } }));
}

export function toggleColorScheme(): ResolvedTheme {
  const current = getResolvedTheme();
  const target: ResolvedTheme = current === "dark" ? "light" : "dark";
  const system = getSystemTheme();
  const nextStored: "light" | "dark" | null = target === system ? null : target;

  try {
    if (nextStored === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, nextStored);
    }
  } catch {
    // Still apply in-memory even if storage is blocked
  }

  applyColorSchemeMeta(nextStored);
  return target;
}

export function setExplicitColorScheme(pref: ThemePreference): ResolvedTheme {
  const nextStored: "light" | "dark" | null = pref === "system" ? null : pref;
  try {
    if (nextStored === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, nextStored);
    }
  } catch {
    // Ignore storage block
  }
  applyColorSchemeMeta(nextStored);
  return nextStored ?? getSystemTheme();
}

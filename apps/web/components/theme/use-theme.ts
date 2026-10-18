"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "./theme-script";

const listeners = new Set<() => void>();

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const media = window.matchMedia(DARK_MEDIA_QUERY);
  const onSystemChange = () => {
    applyTheme(readTheme());
    listener();
  };
  // Keeps multiple open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyTheme(readTheme());
      listener();
    }
  };

  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  const theme = readTheme();
  return `${theme}:${resolveTheme(theme)}`;
}

function getServerSnapshot() {
  return "system:light";
}

type Origin = { x: number; y: number };

/**
 * Persists and applies a theme. When the visible theme changes it plays a
 * circular reveal from `origin` (View Transitions API, with a plain fallback).
 */
export function setTheme(next: Theme, origin?: Origin) {
  const commit = () => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies.
    }
    applyTheme(next);
    listeners.forEach((listener) => listener());
  };

  const changesLook = resolveTheme(next) !== resolveTheme(readTheme());
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (
    !changesLook ||
    reduceMotion ||
    typeof document.startViewTransition !== "function"
  ) {
    commit();
    return;
  }

  const { x, y } = origin ?? { x: window.innerWidth / 2, y: 0 };
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => {
    flushSync(commit);
  });

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 550,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}

export function useTheme() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [theme, resolvedTheme] = snapshot.split(":") as [
    Theme,
    ResolvedTheme,
  ];

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme: (origin?: Origin) =>
      setTheme(resolvedTheme === "dark" ? "light" : "dark", origin),
  };
}

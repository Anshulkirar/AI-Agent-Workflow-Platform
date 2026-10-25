"use client";

import { useSyncExternalStore } from "react";
import { SIDEBAR_STORAGE_KEY } from "./sidebar-script";

/** Matches Tailwind's `lg` breakpoint: the sidebar is a drawer below it. */
export const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";

const listeners = new Set<() => void>();

// <html data-sidebar> is the source of truth, so the UI still works when
// storage is unavailable (private mode) — it just isn't remembered.
function isCollapsed() {
  return document.documentElement.dataset.sidebar === "collapsed";
}

function applyCollapsed(collapsed: boolean) {
  const root = document.documentElement;
  if (collapsed) root.dataset.sidebar = "collapsed";
  else delete root.dataset.sidebar;
}

export function setSidebarCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch {
    // Storage can be unavailable; the change still applies for this visit.
  }
  applyCollapsed(collapsed);
  listeners.forEach((listener) => listener());
}

export function toggleSidebarCollapsed() {
  setSidebarCollapsed(!isCollapsed());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps multiple open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY || event.key === null) {
      applyCollapsed(event.newValue === "collapsed");
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether the desktop sidebar is collapsed to icons. */
export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, isCollapsed, () => false);
}

function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
    () => false,
  );
}

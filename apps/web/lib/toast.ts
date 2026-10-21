import { useSyncExternalStore } from "react";

export type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
};

let toasts: Toast[] = [];
let sequence = 0;
const listeners = new Set<() => void>();
const EMPTY: Toast[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

/** Shows a toast from anywhere (rendered by <Toaster /> in the app shell). */
export function toast(input: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }, duration = 4500) {
  const id = ++sequence;
  toasts = [...toasts.slice(-3), { tone: "success", ...input, id }];
  emit();
  window.setTimeout(() => dismissToast(id), duration);
  return id;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
}

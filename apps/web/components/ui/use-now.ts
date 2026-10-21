import { useEffect, useState } from "react";

/** Current time, re-rendering on an interval while `active` (for live timers). */
export function useNow(active: boolean, interval = 200) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [active, interval]);

  return active ? now : Date.now();
}

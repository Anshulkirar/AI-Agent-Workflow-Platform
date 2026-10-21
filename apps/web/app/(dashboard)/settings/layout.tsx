import type { ReactNode } from "react";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}

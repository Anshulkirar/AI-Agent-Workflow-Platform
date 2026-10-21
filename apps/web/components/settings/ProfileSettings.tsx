"use client";

import { useState } from "react";
import { Check, Globe, Palette } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { useHydrated } from "@/components/ui/use-hydrated";
import { cn } from "@/lib/cn";
import { CURRENT_MEMBER_ID, audit, memberStore, profileStore, useProfile } from "@/lib/settings/store";
import type { AvatarColor, Profile } from "@/lib/settings/types";
import { toast } from "@/lib/toast";
import { DemoNote, SaveBar, Section, SettingsHeader, UserAvatar, avatarGradients, useDraft } from "./SettingsKit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const timezones = [
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

function validate(profile: Profile) {
  const errors: Partial<Record<keyof Profile, string>> = {};
  if (profile.name.trim().length < 2) errors.name = "Enter your name (2+ characters).";
  if (!EMAIL.test(profile.email.trim())) errors.email = "Enter a valid email address.";
  if (profile.title.length > 60) errors.title = "Keep it under 60 characters.";
  return errors;
}

function localTime(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit", weekday: "short" }).format(new Date());
  } catch {
    return "—";
  }
}

export function ProfileSettings() {
  const profile = useProfile();
  const hydrated = useHydrated();
  const { draft, patch, dirty, reset } = useDraft(profile);
  const [submitted, setSubmitted] = useState(false);
  const errors = validate(draft);
  const shown = submitted ? errors : {};
  const browserZone = hydrated ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const zoneOptions = browserZone && !timezones.includes(browserZone) ? [browserZone, ...timezones] : timezones;

  const save = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    const next = { ...draft, name: draft.name.trim(), email: draft.email.trim(), title: draft.title.trim() };
    const emailChanged = next.email !== profile.email;
    profileStore.write(next);
    memberStore.update(CURRENT_MEMBER_ID, { name: next.name, email: next.email, avatarColor: next.avatarColor });
    audit("account", emailChanged ? "Changed email address" : "Updated profile", emailChanged ? next.email : undefined);
    setSubmitted(false);
    toast({
      title: "Profile updated",
      description: emailChanged ? "Saved locally. In this demo no verification email is sent." : "Your name and avatar update across AgentFlow.",
    });
  };

  return (
    <>
      <SettingsHeader title="Profile" description="How you appear to teammates across the workspace." />

      <Section title="Personal information" description="Shown in the top bar, team list, run history and the audit log.">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar name={draft.name} email={draft.email} color={draft.avatarColor} size="xl" />
            <div>
              <p className="text-sm font-medium">Avatar color</p>
              <p className="mb-2.5 text-xs text-muted-foreground">Your initials are generated from your name.</p>
              <div role="radiogroup" aria-label="Avatar color" className="flex flex-wrap gap-2">
                {(Object.keys(avatarGradients) as AvatarColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={draft.avatarColor === color}
                    aria-label={color}
                    onClick={() => patch({ avatarColor: color })}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full bg-linear-to-br text-white ring-offset-2 ring-offset-card transition focus-visible:outline-2 focus-visible:outline-ring",
                      avatarGradients[color],
                      draft.avatarColor === color ? "ring-2 ring-primary" : "hover:scale-110",
                    )}
                  >
                    {draft.avatarColor === color && <Check size={14} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" htmlFor="profile-name" error={shown.name}>
              <input
                id="profile-name"
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                autoComplete="name"
                aria-invalid={shown.name ? true : undefined}
                aria-describedby={shown.name ? "profile-name-error" : undefined}
                className={inputClass}
              />
            </Field>
            <Field label="Email address" htmlFor="profile-email" error={shown.email} hint="Used for sign-in and notifications.">
              <input
                id="profile-email"
                type="email"
                value={draft.email}
                onChange={(event) => patch({ email: event.target.value })}
                autoComplete="email"
                aria-invalid={shown.email ? true : undefined}
                aria-describedby={shown.email ? "profile-email-error" : undefined}
                className={inputClass}
              />
            </Field>
            <Field label="Job title" htmlFor="profile-title" error={shown.title} hint="Optional">
              <input
                id="profile-title"
                value={draft.title}
                placeholder="e.g. ML engineer"
                onChange={(event) => patch({ title: event.target.value })}
                aria-invalid={shown.title ? true : undefined}
                className={inputClass}
              />
            </Field>
            <Field
              label="Time zone"
              htmlFor="profile-tz"
              hint={hydrated ? `Local time there: ${localTime(draft.timezone)}` : "Used for schedules and quiet hours."}
              aside={
                browserZone && browserZone !== draft.timezone ? (
                  <button type="button" onClick={() => patch({ timezone: browserZone })} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <Globe size={12} />
                    Use {browserZone}
                  </button>
                ) : undefined
              }
            >
              <Select id="profile-tz" value={draft.timezone} onChange={(event) => patch({ timezone: event.target.value })}>
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <button type="submit" className="sr-only">
            Save
          </button>
        </form>
      </Section>

      <Section
        title="Appearance"
        description="Choose a theme for this browser. System follows your operating system's light or dark setting."
        action={<Palette size={18} className="text-subtle-foreground" />}
      >
        <ThemeSwitcher className="max-w-md [&_button]:h-10 [&_button]:text-xs" />
      </Section>

      <DemoNote>
        Profile changes are saved in this browser only. AgentFlow&apos;s demo has no account backend, so changing your email doesn&apos;t send a
        verification message or change how you sign in.
      </DemoNote>

      <SaveBar
        dirty={dirty}
        onSave={save}
        onDiscard={() => {
          reset();
          setSubmitted(false);
        }}
      />
    </>
  );
}

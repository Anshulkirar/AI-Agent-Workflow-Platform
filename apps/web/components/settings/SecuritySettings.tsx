"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Download, KeyRound, Laptop, Lock, LogOut, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { FilterTabs, SearchInput } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Switch } from "@/components/ui/Switch";
import { useHydrated } from "@/components/ui/use-hydrated";
import { cn } from "@/lib/cn";
import { downloadFile } from "@/lib/download";
import { formatDate } from "@/lib/format";
import { plansById } from "@/lib/settings/plans";
import { audit, securityStore, sessionStore, useAuditLog, useBilling, useProfile, useSecuritySettings, useSessions } from "@/lib/settings/store";
import { generateSecret, otpauthUri, recoveryCodes, verifyTotp } from "@/lib/settings/totp";
import type { AuditCategory } from "@/lib/settings/types";
import { toast } from "@/lib/toast";
import { DemoNote, Section, SettingsHeader } from "./SettingsKit";

/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const level = Math.min(4, score);
  return { level, label: ["Too weak", "Weak", "Fair", "Good", "Strong"][level]!, tone: ["bg-danger", "bg-danger", "bg-amber-500", "bg-primary", "bg-success"][level]! };
}

function describeBrowser(agent: string) {
  const browser = /Edg\//.test(agent) ? "Edge" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const os = /Windows/.test(agent) ? "Windows" : /Mac OS X/.test(agent) ? "macOS" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Linux/.test(agent) ? "Linux" : "Unknown OS";
  return { browser, os, mobile: /Mobi|Android|iPhone/.test(agent) };
}

const categoryLabels: Record<AuditCategory, string> = {
  account: "Account",
  security: "Security",
  team: "Team",
  api: "API keys",
  billing: "Billing",
  workspace: "Workspace",
};

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

export function SecuritySettings() {
  const security = useSecuritySettings();
  const billing = useBilling();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [codesToShow, setCodesToShow] = useState<string[] | null>(null);
  const ssoAvailable = plansById[billing.planId].id === "enterprise";

  return (
    <>
      <SettingsHeader title="Security" description="Protect your account and control access to the workspace." />

      <Section
        title="Password"
        description={
          <>
            Last changed <RelativeTime iso={security.passwordChangedAt} />.
          </>
        }
        action={
          <button type="button" onClick={() => setPasswordOpen(true)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <KeyRound size={14} />
            Change password
          </button>
        }
      >
        <p className="text-sm text-muted-foreground">Use at least 12 characters with a mix of letters, numbers and symbols. Don&apos;t reuse passwords from other sites.</p>
      </Section>

      <Section
        title="Two-factor authentication"
        description="Require a code from an authenticator app in addition to your password."
        action={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
              security.twoFactorEnabled ? "bg-success-soft text-success" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          >
            {security.twoFactorEnabled ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
            {security.twoFactorEnabled ? "Enabled" : "Not enabled"}
          </span>
        }
        footer={
          security.twoFactorEnabled ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const codes = recoveryCodes();
                  securityStore.update({ recoveryCodesRemaining: codes.length });
                  audit("security", "Regenerated recovery codes");
                  setCodesToShow(codes);
                }}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Regenerate recovery codes
              </button>
              <button type="button" onClick={() => setDisableOpen(true)} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-danger hover:bg-danger-soft hover:text-danger" })}>
                Turn off
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setSetupOpen(true)} className={buttonVariants({ size: "sm" })}>
              <Smartphone size={14} />
              Set up authenticator app
            </button>
          )
        }
      >
        {security.twoFactorEnabled ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Authenticator app</dt>
              <dd className="mt-0.5 font-medium">Added {security.twoFactorEnabledAt ? formatDate(security.twoFactorEnabledAt) : ""}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recovery codes</dt>
              <dd className="mt-0.5 font-medium">{security.recoveryCodesRemaining} unused</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Works with Google Authenticator, 1Password, Authy and any app that supports TOTP.</p>
        )}
      </Section>

      <Section title="Workspace policies" description="Apply to everyone in the workspace. Owners and admins can change them.">
        <ul className="-my-1 divide-y divide-border">
          <li className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Require two-factor authentication</p>
              <p className="text-xs text-muted-foreground">{security.twoFactorEnabled ? "Members without 2FA are asked to set it up at next sign-in." : "Turn on 2FA for your own account first."}</p>
            </div>
            <Switch
              checked={security.requireTwoFactor}
              disabled={!security.twoFactorEnabled && !security.requireTwoFactor}
              onCheckedChange={(requireTwoFactor) => {
                securityStore.update({ requireTwoFactor });
                audit("security", requireTwoFactor ? "Required 2FA for all members" : "Stopped requiring 2FA");
                toast({ tone: "info", title: requireTwoFactor ? "2FA required for the workspace" : "2FA no longer required" });
              }}
              label="Require two-factor authentication"
            />
          </li>
          <li className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Session timeout</p>
              <p className="text-xs text-muted-foreground">Sign members out after this much inactivity.</p>
            </div>
            <Select
              aria-label="Session timeout"
              value={security.sessionTimeoutHours}
              onChange={(event) => {
                const sessionTimeoutHours = Number(event.target.value);
                securityStore.update({ sessionTimeoutHours });
                audit("security", `Set session timeout to ${sessionTimeoutHours < 24 ? `${sessionTimeoutHours} hours` : `${sessionTimeoutHours / 24} days`}`);
                toast({ tone: "info", title: "Session timeout updated" });
              }}
              className="w-36"
            >
              {[8, 24, 72, 168, 720].map((hours) => (
                <option key={hours} value={hours}>
                  {hours < 24 ? `${hours} hours` : `${hours / 24} day${hours === 24 ? "" : "s"}`}
                </option>
              ))}
            </Select>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                Single sign-on (SAML)
                <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary-soft-foreground">Enterprise</span>
              </p>
              <p className="text-xs text-muted-foreground">Sign in through Okta, Microsoft Entra ID or Google Workspace.</p>
            </div>
            {ssoAvailable ? (
              <span className="text-xs text-muted-foreground">Configured by your account team</span>
            ) : (
              <Link href="/settings/billing" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Lock size={13} />
                View plans
              </Link>
            )}
          </li>
        </ul>
      </Section>

      <SessionsSection />
      <AuditLogSection />

      <DemoNote>
        AgentFlow&apos;s demo has no authentication server. Authenticator codes are genuinely verified in your browser, but sign-in, passwords,
        sessions and policies aren&apos;t enforced — changes are recorded locally and in the audit log. Other sessions are sample data.
      </DemoNote>

      {passwordOpen && <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />}
      {setupOpen && <TwoFactorSetup open={setupOpen} onOpenChange={setSetupOpen} />}
      {disableOpen && <DisableTwoFactor open={disableOpen} onOpenChange={setDisableOpen} />}
      {codesToShow && <RecoveryCodesDialog codes={codesToShow} onClose={() => setCodesToShow(null)} />}
    </>
  );
}

/* --------------------------------------------------------------------------
 * Password
 * ------------------------------------------------------------------------ */

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const strength = passwordStrength(next);

  const errors: Partial<Record<"current" | "next" | "confirm", string>> = {};
  if (!current) errors.current = "Enter your current password.";
  if (next.length < 8) errors.next = "Use at least 8 characters.";
  else if (strength.level < 2) errors.next = "Add upper- and lowercase letters, numbers or symbols.";
  else if (next === current) errors.next = "Choose a password you haven't used here.";
  if (confirm !== next) errors.confirm = "Passwords don't match.";
  const shown = submitted ? errors : {};

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    securityStore.update({ passwordChangedAt: new Date().toISOString() });
    audit("security", "Changed password");
    toast({ title: "Password change recorded", description: "Simulated — the demo has no auth backend, so how you sign in is unchanged." });
    onOpenChange(false);
  };

  const field = (id: "current" | "next" | "confirm", label: string, value: string, set: (value: string) => void, autoComplete: string) => (
    <Field label={label} htmlFor={`pw-${id}`} error={shown[id]}>
      <input
        id={`pw-${id}`}
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => set(event.target.value)}
        aria-invalid={shown[id] ? true : undefined}
        aria-describedby={shown[id] ? `pw-${id}-error` : undefined}
        className={inputClass}
      />
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change password"
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary" })}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={buttonVariants()}>
            Update password
          </button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        {field("current", "Current password", current, setCurrent, "current-password")}
        {field("next", "New password", next, setNext, "new-password")}
        {next && (
          <div className="-mt-2" aria-live="polite">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < Math.max(1, strength.level) ? strength.tone : "bg-muted")} />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Strength: {strength.label}</p>
          </div>
        )}
        {field("confirm", "Confirm new password", confirm, setConfirm, "new-password")}
        <button type="submit" className="sr-only">
          Update
        </button>
      </form>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Two-factor authentication
 * ------------------------------------------------------------------------ */

function CodeInput({ value, onChange, invalid }: { value: string; onChange: (value: string) => void; invalid?: boolean }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder="123456"
      aria-label="6-digit code"
      aria-invalid={invalid ? true : undefined}
      className={cn(inputClass, "h-12 text-center font-mono text-xl tracking-[0.5em]")}
    />
  );
}

function TwoFactorSetup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useProfile();
  const [secret] = useState(generateSecret);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const uri = otpauthUri(secret, profile.email);

  const verify = async () => {
    setChecking(true);
    setError(null);
    try {
      const ok = await verifyTotp(secret, code);
      if (!ok) {
        setError("That code didn't match. Check your device's clock and enter the newest code.");
        return;
      }
      const generated = recoveryCodes();
      securityStore.update({ twoFactorEnabled: true, twoFactorEnabledAt: new Date().toISOString(), twoFactorSecret: secret, recoveryCodesRemaining: generated.length });
      audit("security", "Enabled two-factor authentication");
      setCodes(generated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't verify the code.");
    } finally {
      setChecking(false);
    }
  };

  if (codes) return <RecoveryCodesDialog codes={codes} onClose={() => onOpenChange(false)} title="Two-factor authentication is on" />;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Set up authenticator app"
      description="Add AgentFlow to your authenticator app with a setup key."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary" })}>
            Cancel
          </button>
          <button type="button" disabled={code.length !== 6 || checking} onClick={() => void verify()} className={buttonVariants()}>
            {checking ? "Verifying…" : "Verify & turn on"}
          </button>
        </>
      }
    >
      <ol className="space-y-5 text-sm">
        <li>
          <p className="font-medium">1. In your authenticator app, add an account using this setup key</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm tracking-wider">{secret.match(/.{1,4}/g)?.join(" ")}</code>
            <CopyButton value={secret} label="Copy setup key" />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            Account: {profile.email} · Time-based · 6 digits ·
            <CopyButton value={uri} label="Copy otpauth link" showLabel className="h-auto px-0 text-xs" />
          </p>
        </li>
        <li>
          <p className="mb-2 font-medium">2. Enter the 6-digit code it shows</p>
          <CodeInput value={code} onChange={setCode} invalid={Boolean(error)} />
          {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
        </li>
      </ol>
    </Dialog>
  );
}

function DisableTwoFactor({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const security = useSecuritySettings();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const disable = async () => {
    setError(null);
    try {
      if (!security.twoFactorSecret || !(await verifyTotp(security.twoFactorSecret, code))) {
        setError("That code didn't match your authenticator app.");
        return;
      }
      securityStore.update({ twoFactorEnabled: false, twoFactorEnabledAt: null, twoFactorSecret: null, recoveryCodesRemaining: 0, requireTwoFactor: false });
      audit("security", "Disabled two-factor authentication");
      toast({ tone: "info", title: "Two-factor authentication turned off" });
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't verify the code.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Turn off two-factor authentication?"
      description="Confirm with a current code from your authenticator app."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary" })}>
            Cancel
          </button>
          <button type="button" disabled={code.length !== 6} onClick={() => void disable()} className={buttonVariants({ className: "bg-danger shadow-danger/25 hover:bg-danger/90" })}>
            Turn off 2FA
          </button>
        </>
      }
    >
      <CodeInput value={code} onChange={setCode} invalid={Boolean(error)} />
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      {security.requireTwoFactor && <p className="mt-3 text-xs text-muted-foreground">The workspace 2FA requirement will be turned off too.</p>}
    </Dialog>
  );
}

function RecoveryCodesDialog({ codes, onClose, title = "New recovery codes" }: { codes: string[]; onClose: () => void; title?: string }) {
  const text = `AgentFlow recovery codes\nEach code works once.\n\n${codes.join("\n")}\n`;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description="Save these codes somewhere safe. Each one signs you in once if you lose your device."
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              downloadFile("agentflow-recovery-codes.txt", text);
              toast({ title: "Recovery codes downloaded" });
            }}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Download size={15} />
            Download
          </button>
          <button type="button" onClick={onClose} className={buttonVariants()}>
            Done
          </button>
        </>
      }
    >
      <div className="relative rounded-xl border border-border bg-muted/60 p-4">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-sm">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <CopyButton value={codes.join("\n")} label="Copy recovery codes" className="absolute right-2 top-2" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Previously generated codes no longer work. You won&apos;t be able to see these again.</p>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Sessions
 * ------------------------------------------------------------------------ */

function SessionsSection() {
  const sessions = useSessions();
  const hydrated = useHydrated();
  const [confirmAll, setConfirmAll] = useState(false);
  const here = hydrated ? describeBrowser(navigator.userAgent) : null;

  const revoke = (id: string, label: string) => {
    sessionStore.remove(id);
    audit("security", "Signed out session", label);
    toast({ tone: "info", title: "Session signed out", description: `${label} (sample session)` });
  };

  return (
    <Section
      title="Active sessions"
      description="Devices signed in to your account."
      action={
        sessions.length > 0 ? (
          <button type="button" onClick={() => setConfirmAll(true)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <LogOut size={14} />
            Sign out other sessions
          </button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-border">
        <li className="flex items-center gap-3 pb-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            {here?.mobile ? <Smartphone size={18} /> : <Laptop size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              {here ? `${here.browser} on ${here.os}` : "This browser"}
              <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">This device</span>
            </p>
            <p className="text-xs text-muted-foreground">Active now</p>
          </div>
        </li>
        {sessions.map((session) => {
          const label = `${session.browser} on ${session.os}`;
          return (
            <li key={session.id} className="flex items-center gap-3 py-3 last:pb-0">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                {session.device === "mobile" ? <Smartphone size={18} /> : <Laptop size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.location} · {session.ip} · <RelativeTime iso={session.lastActiveAt} />
                </p>
              </div>
              <button type="button" onClick={() => revoke(session.id, label)} className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 shrink-0" })}>
                Sign out
              </button>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Sign out all other sessions?"
        description={`${sessions.length} other session${sessions.length === 1 ? "" : "s"} will be removed. You'll stay signed in here.`}
        confirmLabel="Sign out others"
        onConfirm={() => {
          sessionStore.write([]);
          audit("security", "Signed out all other sessions");
          toast({ tone: "info", title: "Other sessions signed out", description: "Sample sessions removed from the list." });
        }}
      />
    </Section>
  );
}

/* --------------------------------------------------------------------------
 * Audit log
 * ------------------------------------------------------------------------ */

function AuditLogSection() {
  const events = useAuditLog();
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [query, setQuery] = useState("");
  const term = useDeferredValue(query.trim().toLowerCase());
  const [limit, setLimit] = useState(8);

  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          (category === "all" || event.category === category) &&
          (!term || `${event.actor} ${event.action} ${event.target ?? ""}`.toLowerCase().includes(term)),
      ),
    [events, category, term],
  );

  const exportCsv = () => {
    const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const lines = ["timestamp,actor,category,action,target", ...visible.map((event) => [event.at, event.actor, event.category, event.action, event.target ?? ""].map(cell).join(","))];
    downloadFile("agentflow-audit-log.csv", lines.join("\n"), "text/csv");
    toast({ title: "Audit log exported", description: `${visible.length} events` });
  };

  return (
    <Section
      title="Audit log"
      description="Who changed what in this workspace."
      action={
        <button type="button" onClick={exportCsv} disabled={!visible.length} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Download size={14} />
          Export CSV
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterTabs
          label="Filter audit log"
          value={category}
          onChange={(value) => {
            setCategory(value);
            setLimit(8);
          }}
          options={[{ value: "all" as const, label: "All" }, ...(Object.keys(categoryLabels) as AuditCategory[]).map((value) => ({ value, label: categoryLabels[value] }))]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search events…" label="Search audit log" className="xl:w-60" />
      </div>
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No events match.</p>
      ) : (
        <>
          <ol className="divide-y divide-border">
            {visible.slice(0, limit).map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
                <p className="min-w-0">
                  <span className="font-medium">{event.actor}</span> <span className="text-muted-foreground">{event.action.charAt(0).toLowerCase() + event.action.slice(1)}</span>
                  {event.target && <span className="font-medium"> · {event.target}</span>}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{categoryLabels[event.category]}</span>
                  <RelativeTime iso={event.at} />
                </p>
              </li>
            ))}
          </ol>
          {visible.length > limit && (
            <button type="button" onClick={() => setLimit((value) => value + 10)} className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-2 w-full" })}>
              Show more ({visible.length - limit} remaining)
            </button>
          )}
        </>
      )}
    </Section>
  );
}

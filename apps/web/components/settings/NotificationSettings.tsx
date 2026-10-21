"use client";

import Link from "next/link";
import { BellRing, Moon } from "lucide-react";
import { SlackIcon } from "@/components/icons/BrandIcons";
import { buttonVariants } from "@/components/ui/button";
import { Field, Slider, inputClass } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { useConnections } from "@/lib/integrations/store";
import { audit, notificationStore, useNotificationPrefs, useProfile } from "@/lib/settings/store";
import type { Channel, NotificationEvent } from "@/lib/settings/types";
import { toast } from "@/lib/toast";
import { DemoNote, SaveBar, Section, SettingsHeader, useDraft } from "./SettingsKit";

const groups: { label: string; events: { id: NotificationEvent; label: string; description: string }[] }[] = [
  {
    label: "Runs",
    events: [
      { id: "run_failed", label: "Agent run failed", description: "A run ends with an error or times out." },
      { id: "workflow_failed", label: "Workflow failed", description: "Any step of a scheduled or triggered workflow fails." },
    ],
  },
  {
    label: "Connections & usage",
    events: [
      { id: "integration_error", label: "Integration error", description: "A connected service starts rejecting requests." },
      { id: "usage_threshold", label: "Usage alert", description: "Monthly runs pass your alert threshold." },
      { id: "api_key_expiring", label: "API key expiring", description: "A key expires within 7 days." },
    ],
  },
  {
    label: "Workspace",
    events: [
      { id: "team_changes", label: "Team changes", description: "Someone joins, leaves or changes role." },
      { id: "weekly_report", label: "Weekly report", description: "Runs, success rate and spend, every Monday." },
      { id: "product_updates", label: "Product updates", description: "New features and changes to AgentFlow." },
    ],
  },
];

const channels: { id: Channel; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "inApp", label: "In-app" },
  { id: "slack", label: "Slack" },
];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function NotificationSettings() {
  const prefs = useNotificationPrefs();
  const profile = useProfile();
  const slack = useConnections().find((connection) => connection.id === "slack");
  const slackReady = slack?.status === "connected";
  const { draft, patch, setDraft, dirty, reset } = useDraft(prefs);

  const setChannel = (event: NotificationEvent, channel: Channel, on: boolean) =>
    setDraft((current) => ({ ...current, events: { ...current.events, [event]: { ...current.events[event], [channel]: on } } }));

  const setColumn = (channel: Channel, on: boolean) =>
    setDraft((current) => ({
      ...current,
      events: Object.fromEntries(Object.entries(current.events).map(([event, value]) => [event, { ...value, [channel]: on }])) as typeof current.events,
    }));

  const columnState = (channel: Channel) => {
    const values = Object.values(draft.events).map((value) => value[channel]);
    return values.every(Boolean) ? "all" : values.some(Boolean) ? "some" : "none";
  };

  const quietValid = TIME.test(draft.quietHours.start) && TIME.test(draft.quietHours.end);
  const channelValid = !slackReady || /^#[a-z0-9][a-z0-9_-]{0,79}$/.test(draft.slackChannel);

  const save = () => {
    if (!quietValid || !channelValid) {
      toast({ tone: "error", title: "Check your settings", description: !channelValid ? "Slack channels look like #alerts." : "Quiet hours need valid times." });
      return;
    }
    notificationStore.write(draft);
    audit("account", "Updated notification preferences");
    toast({ title: "Notification preferences saved" });
  };

  const sendTest = () => {
    const enabled = draft.events.run_failed;
    toast({
      tone: "info",
      title: "Test notification",
      description: enabled.inApp
        ? `This is how in-app alerts look.${enabled.email || (enabled.slack && slackReady) ? " Email and Slack aren't delivered in demo mode." : ""}`
        : "In-app alerts are off for failed runs — turn them on to see these.",
    });
  };

  return (
    <>
      <SettingsHeader
        title="Notifications"
        description="Choose which events reach you, and where."
        actions={
          <button type="button" onClick={sendTest} className={buttonVariants({ variant: "secondary" })}>
            <BellRing size={16} />
            Send test notification
          </button>
        }
      />

      <Section
        title="Delivery"
        description={
          <>
            Email goes to <span className="font-medium text-foreground">{profile.email}</span> ·{" "}
            <Link href="/settings/profile" className="font-semibold text-primary hover:underline">
              change
            </Link>
          </>
        }
      >
        <div className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
            <SlackIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Slack</p>
            <p className="text-xs text-muted-foreground">
              {slackReady
                ? "Connected through your Slack integration. Alerts post to the channel below."
                : slack
                  ? "Your Slack integration needs attention before alerts can be posted."
                  : "Connect the Slack integration to receive alerts in a channel."}
            </p>
          </div>
          {slackReady ? (
            <Field label="Channel" htmlFor="slack-channel" className="sm:w-48" error={channelValid ? undefined : "Use a name like #alerts."}>
              <input
                id="slack-channel"
                value={draft.slackChannel}
                onChange={(event) => patch({ slackChannel: event.target.value.trim().toLowerCase() })}
                aria-invalid={channelValid ? undefined : true}
                className={cn(inputClass, "h-9")}
              />
            </Field>
          ) : (
            <Link href="/integrations?connect=slack" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {slack ? "Fix Slack" : "Connect Slack"}
            </Link>
          )}
        </div>
      </Section>

      <Section title="Events" description="Toggle a column header to switch a channel on or off for every event.">
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 text-left font-medium sm:px-6">
                  Event
                </th>
                {channels.map((channel) => {
                  const state = columnState(channel.id);
                  const disabled = channel.id === "slack" && !slackReady;
                  return (
                    <th key={channel.id} scope="col" className="w-24 px-3 py-2.5 text-center font-medium last:pr-5 sm:last:pr-6">
                      <span className="flex flex-col items-center gap-1.5">
                        {channel.label}
                        <Switch
                          size="sm"
                          checked={state === "all"}
                          disabled={disabled}
                          onCheckedChange={(on) => setColumn(channel.id, on)}
                          label={`${channel.label} for all events`}
                          title={disabled ? "Connect Slack first" : state === "some" ? "Some events on" : undefined}
                        />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.label} className="divide-y divide-border">
                <tr>
                  <th colSpan={4} scope="colgroup" className="bg-muted/25 px-5 pb-1.5 pt-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-subtle-foreground sm:px-6">
                    {group.label}
                  </th>
                </tr>
                {group.events.map((event) => (
                  <tr key={event.id}>
                    <th scope="row" className="px-5 py-3 text-left font-normal sm:px-6">
                      <span className="block font-medium">{event.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {event.id === "usage_threshold" ? `Monthly runs pass ${draft.usageThreshold}% of your plan.` : event.description}
                      </span>
                    </th>
                    {channels.map((channel) => {
                      const disabled = channel.id === "slack" && !slackReady;
                      return (
                        <td key={channel.id} className="px-3 py-3 text-center last:pr-5 sm:last:pr-6">
                          <input
                            type="checkbox"
                            checked={!disabled && draft.events[event.id][channel.id]}
                            disabled={disabled}
                            onChange={(change) => setChannel(event.id, channel.id, change.target.checked)}
                            aria-label={`${event.label} via ${channel.label}`}
                            className="size-4 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Usage alert threshold" description="Warn me when monthly runs reach this share of the plan limit.">
          <Slider
            id="usage-threshold"
            value={draft.usageThreshold}
            min={50}
            max={100}
            step={5}
            onChange={(value) => patch({ usageThreshold: value })}
            format={(value) => `${value}%`}
            marks={["50%", "75%", "100%"]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            See current usage in{" "}
            <Link href="/settings/billing" className="font-semibold text-primary hover:underline">
              Billing &amp; usage
            </Link>
            .
          </p>
        </Section>

        <Section
          title="Quiet hours"
          description={`Hold email and Slack alerts overnight (${profile.timezone.replace(/_/g, " ")}). In-app alerts still appear.`}
          action={
            <Switch
              checked={draft.quietHours.enabled}
              onCheckedChange={(enabled) => patch({ quietHours: { ...draft.quietHours, enabled } })}
              label="Quiet hours"
            />
          }
        >
          <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !draft.quietHours.enabled && "pointer-events-none opacity-50")}>
            <Field label="From" htmlFor="quiet-start">
              <input
                id="quiet-start"
                type="time"
                value={draft.quietHours.start}
                disabled={!draft.quietHours.enabled}
                onChange={(event) => patch({ quietHours: { ...draft.quietHours, start: event.target.value } })}
                className={inputClass}
              />
            </Field>
            <Field label="Until" htmlFor="quiet-end">
              <input
                id="quiet-end"
                type="time"
                value={draft.quietHours.end}
                disabled={!draft.quietHours.enabled}
                onChange={(event) => patch({ quietHours: { ...draft.quietHours, end: event.target.value } })}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Moon size={12} />
            {draft.quietHours.enabled ? `Paused ${draft.quietHours.start}–${draft.quietHours.end} daily.` : "Off — alerts are delivered any time."}
          </p>
        </Section>
      </div>

      <DemoNote>
        Preferences are saved in this browser. The demo has no mail or Slack delivery service, so only in-app notifications (toasts) actually appear.
      </DemoNote>

      <SaveBar dirty={dirty} onSave={save} onDiscard={reset} />
    </>
  );
}

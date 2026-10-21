"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Check, Mail, MailPlus, Minus, RefreshCw, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Field, Select, textareaClass } from "@/components/ui/Field";
import { EmptyState, FilterTabs, SearchInput } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/cn";
import { makeId } from "@/lib/create-store";
import { CURRENT_MEMBER_ID, audit, memberStore, useMembers, useWorkspaceSettings } from "@/lib/settings/store";
import type { AvatarColor, Member, Role } from "@/lib/settings/types";
import { useUsage } from "@/lib/settings/usage";
import { toast } from "@/lib/toast";
import { DemoNote, Section, SettingsHeader, UsageMeter, UserAvatar } from "./SettingsKit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const colors: AvatarColor[] = ["violet", "sky", "emerald", "amber", "rose", "indigo"];

export const roleMeta: Record<Role, { label: string; description: string; badge: string }> = {
  owner: { label: "Owner", description: "Everything, including billing and ownership", badge: "bg-primary-soft text-primary-soft-foreground" },
  admin: { label: "Admin", description: "Manage members, keys, integrations and settings", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  member: { label: "Member", description: "Build, edit and run agents and workflows", badge: "bg-muted text-foreground" },
  viewer: { label: "Viewer", description: "Read-only access to agents, runs and analytics", badge: "bg-muted text-muted-foreground" },
};

const assignable: Role[] = ["admin", "member", "viewer"];

const permissions: { label: string; roles: Role[] }[] = [
  { label: "View agents, runs and analytics", roles: ["owner", "admin", "member", "viewer"] },
  { label: "Run agents and workflows", roles: ["owner", "admin", "member"] },
  { label: "Create and edit agents, workflows and knowledge", roles: ["owner", "admin", "member"] },
  { label: "Install tools and connect integrations", roles: ["owner", "admin"] },
  { label: "Create and revoke API keys", roles: ["owner", "admin"] },
  { label: "Invite and manage members", roles: ["owner", "admin"] },
  { label: "Change plan and billing details", roles: ["owner"] },
];

type Filter = "all" | "active" | "invited";

function parseEmails(input: string) {
  return [...new Set(input.split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export function TeamSettings() {
  const members = useMembers();
  const usage = useUsage();
  const workspace = useWorkspaceSettings();
  const [query, setQuery] = useState("");
  const term = useDeferredValue(query.trim().toLowerCase());
  const [filter, setFilter] = useState<Filter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const seatsLeft = usage.seats.limit === null ? Infinity : usage.seats.limit - usage.seats.used;
  const counts = {
    all: members.length,
    active: members.filter((member) => member.status === "active").length,
    invited: members.filter((member) => member.status === "invited").length,
  };
  const visible = members.filter(
    (member) =>
      (filter === "all" || member.status === filter) && (!term || `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(term)),
  );

  const changeRole = (member: Member, role: Role) => {
    memberStore.update(member.id, { role });
    audit("team", `Changed role to ${roleMeta[role].label}`, member.name || member.email);
    toast({ tone: "info", title: "Role updated", description: `${member.name || member.email} → ${roleMeta[role].label}` });
  };

  const resend = (member: Member) => {
    memberStore.update(member.id, { invitedAt: new Date().toISOString() });
    audit("team", "Resent invitation", member.email);
    toast({ tone: "info", title: "Invitation refreshed", description: "Demo mode doesn't send email — share the invite link instead." });
  };

  const simulateAccept = (member: Member) => {
    const timestamp = new Date().toISOString();
    const name = member.name || member.email.split("@")[0]!.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    memberStore.update(member.id, { status: "active", name, joinedAt: timestamp, lastActiveAt: timestamp });
    audit("team", "Joined workspace", name);
    toast({ title: `${name} joined`, description: "Simulated acceptance of the invitation." });
  };

  return (
    <>
      <SettingsHeader
        title="Team"
        description="Invite teammates and control what they can do in the workspace."
        actions={
          <button type="button" onClick={() => setInviteOpen(true)} className={buttonVariants()}>
            <UserPlus size={16} />
            Invite members
          </button>
        }
      />

      <Section title="Seats" description={`${usage.plan.name} plan · invited members count toward your seats.`}>
        <UsageMeter
          label="Seats used"
          meter={usage.seats}
          format={(value) => String(Math.round(value))}
          hint={
            seatsLeft <= 0 ? (
              <>
                All seats are in use.{" "}
                <Link href="/settings/billing" className="font-semibold text-primary hover:underline">
                  Upgrade to add more
                </Link>
              </>
            ) : seatsLeft === Infinity ? (
              "Unlimited seats on your plan."
            ) : (
              `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} available.`
            )
          }
        />
      </Section>

      <Section title="Members" description={`${counts.active} active · ${counts.invited} pending`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterTabs
            label="Filter members"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active, dot: "bg-success" },
              { value: "invited", label: "Pending", count: counts.invited, dot: "bg-amber-500" },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or email…" label="Search members" className="sm:w-64" />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={Users} title="No members match" description="Try a different search or filter." className="py-10" />
        ) : (
          <ul className="-mx-5 divide-y divide-border border-y border-border sm:-mx-6">
            {visible.map((member) => {
              const you = member.id === CURRENT_MEMBER_ID;
              const owner = member.role === "owner";
              return (
                <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap sm:px-6">
                  <UserAvatar name={member.name} email={member.email} color={member.avatarColor} className={member.status === "invited" ? "opacity-60" : undefined} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{member.name || member.email}</span>
                      {you && <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary-soft-foreground">You</span>}
                      {member.status === "invited" && (
                        <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Invite pending</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.name ? member.email : null}
                      {member.status === "invited" ? (
                        <>
                          {member.name ? " · " : ""}Invited <RelativeTime iso={member.invitedAt} />
                        </>
                      ) : member.lastActiveAt ? (
                        <>
                          {" · "}Active <RelativeTime iso={member.lastActiveAt} />
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="ml-12 flex items-center gap-2 sm:ml-0">
                    {owner ? (
                      <span className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold", roleMeta.owner.badge)}>Owner</span>
                    ) : (
                      <Select
                        aria-label={`Role for ${member.name || member.email}`}
                        value={member.role}
                        onChange={(event) => changeRole(member, event.target.value as Role)}
                        className="w-32 [&_select]:h-9 [&_select]:text-xs"
                      >
                        {assignable.map((role) => (
                          <option key={role} value={role}>
                            {roleMeta[role].label}
                          </option>
                        ))}
                      </Select>
                    )}
                    <DropdownMenu
                      label={`Actions for ${member.name || member.email}`}
                      items={
                        owner
                          ? [{ label: "Owners can't be removed", icon: Minus, onSelect: () => {}, disabled: true }]
                          : member.status === "invited"
                            ? [
                                { label: "Resend invite", icon: RefreshCw, onSelect: () => resend(member) },
                                { label: "Simulate acceptance", icon: UserCheck, onSelect: () => simulateAccept(member) },
                                "separator",
                                {
                                  label: "Revoke invite",
                                  icon: X,
                                  danger: true,
                                  onSelect: () => {
                                    const removed = memberStore.remove(member.id);
                                    audit("team", "Revoked invitation", member.email);
                                    toast({
                                      tone: "info",
                                      title: "Invitation revoked",
                                      action: removed ? { label: "Undo", onClick: () => memberStore.restore(removed.item, removed.index) } : undefined,
                                    });
                                  },
                                },
                              ]
                            : [
                                {
                                  label: "Remove from workspace",
                                  icon: Trash2,
                                  danger: true,
                                  onSelect: () => {
                                    setRemoving(member);
                                    setRemoveOpen(true);
                                  },
                                },
                              ]
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Roles & permissions" description="What each role can do. Assign roles from the member list above.">
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 text-left font-medium sm:px-6">
                  Permission
                </th>
                {(Object.keys(roleMeta) as Role[]).map((role) => (
                  <th key={role} scope="col" className="px-3 py-2.5 text-center font-medium last:pr-5 sm:last:pr-6" title={roleMeta[role].description}>
                    {roleMeta[role].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissions.map((permission) => (
                <tr key={permission.label}>
                  <th scope="row" className="px-5 py-2.5 text-left font-normal sm:px-6">
                    {permission.label}
                  </th>
                  {(Object.keys(roleMeta) as Role[]).map((role) => (
                    <td key={role} className="px-3 py-2.5 text-center last:pr-5 sm:last:pr-6">
                      {permission.roles.includes(role) ? (
                        <Check size={15} className="mx-auto text-success" aria-label="Allowed" />
                      ) : (
                        <Minus size={15} className="mx-auto text-subtle-foreground" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <DemoNote>
        Invitations are recorded in this browser only — no emails are sent, and roles aren&apos;t enforced because the demo has no auth backend. Use
        &ldquo;Simulate acceptance&rdquo; to see an invite join.
      </DemoNote>

      {inviteOpen && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          existing={members.map((member) => member.email.toLowerCase())}
          seatsLeft={seatsLeft}
          inviteLink={`https://agentflow.example/join/${workspace.slug}`}
        />
      )}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${removing?.name ?? "member"}?`}
        description="They'll lose access to this workspace. Agents and runs they created stay in the workspace."
        confirmLabel="Remove member"
        onConfirm={() => {
          if (!removing) return;
          const removed = memberStore.remove(removing.id);
          audit("team", "Removed member", removing.name || removing.email);
          toast({
            tone: "info",
            title: `${removing.name || removing.email} removed`,
            action: removed ? { label: "Undo", onClick: () => memberStore.restore(removed.item, removed.index) } : undefined,
          });
        }}
      />
    </>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  existing,
  seatsLeft,
  inviteLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: string[];
  seatsLeft: number;
  inviteLink: string;
}) {
  const [input, setInput] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [submitted, setSubmitted] = useState(false);
  const emails = parseEmails(input);
  const invalid = emails.filter((email) => !EMAIL.test(email));
  const duplicates = emails.filter((email) => existing.includes(email));

  const error = !emails.length
    ? "Add at least one email address."
    : invalid.length
      ? `Not a valid email: ${invalid.join(", ")}`
      : duplicates.length
        ? `Already in the workspace: ${duplicates.join(", ")}`
        : emails.length > seatsLeft
          ? `Only ${Math.max(0, seatsLeft)} seat${seatsLeft === 1 ? "" : "s"} left on your plan.`
          : null;

  const submit = () => {
    setSubmitted(true);
    if (error) return;
    const timestamp = new Date().toISOString();
    const created: Member[] = emails.map((email, index) => ({
      id: makeId(email.split("@")[0]!),
      name: "",
      email,
      role,
      status: "invited",
      avatarColor: colors[(existing.length + index) % colors.length]!,
      invitedAt: timestamp,
      joinedAt: null,
      lastActiveAt: null,
    }));
    memberStore.write([...memberStore.read(), ...created]);
    emails.forEach((email) => audit("team", `Invited member as ${roleMeta[role].label}`, email));
    toast({
      title: `${emails.length} invitation${emails.length === 1 ? "" : "s"} created`,
      description: "Demo mode doesn't send email — share the invite link with them.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite members"
      description="Add teammates by email. They'll appear as pending until they join."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary" })}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={buttonVariants()}>
            <MailPlus size={15} />
            {emails.length > 1 ? `Invite ${emails.length} people` : "Send invite"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Email addresses" htmlFor="invite-emails" hint="Separate multiple addresses with commas or new lines." error={submitted && error ? error : undefined}>
          <textarea
            id="invite-emails"
            rows={3}
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="maya@company.com, leo@company.com"
            aria-invalid={submitted && error ? true : undefined}
            aria-describedby={submitted && error ? "invite-emails-error" : undefined}
            className={textareaClass}
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Role</legend>
          <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-3">
            {assignable.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={role === item}
                onClick={() => setRole(item)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  role === item ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10" : "border-border hover:border-primary/40",
                )}
              >
                <span className="block text-sm font-semibold">{roleMeta[item].label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{roleMeta[item].description}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="rounded-xl border border-border bg-muted/50 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Mail size={13} />
            Invite link (placeholder — not reachable in demo mode)
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{inviteLink}</code>
            <CopyButton value={inviteLink} label="Copy invite link" />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

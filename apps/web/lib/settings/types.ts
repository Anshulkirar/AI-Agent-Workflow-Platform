import type { ModelSettings } from "@/lib/agents/types";

export type AvatarColor = "indigo" | "violet" | "sky" | "emerald" | "amber" | "rose";

export type Profile = {
  name: string;
  email: string;
  title: string;
  timezone: string;
  avatarColor: AvatarColor;
};

export type WorkspaceSettings = {
  name: string;
  slug: string;
  /** Applied to new agents and workflows. */
  modelDefaults: ModelSettings;
  retentionDays: number;
};

export type Role = "owner" | "admin" | "member" | "viewer";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited";
  avatarColor: AvatarColor;
  invitedAt: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
};

export type ApiScope = "agents:run" | "agents:write" | "workflows:run" | "runs:read" | "knowledge:write";

/** Only the prefix and last 4 characters are kept — the full secret is shown once. */
export type ApiKey = {
  id: string;
  name: string;
  environment: "live" | "test";
  prefix: string;
  last4: string;
  scopes: ApiScope[];
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  requests30d: number;
};

export type NotificationEvent =
  | "run_failed"
  | "workflow_failed"
  | "integration_error"
  | "usage_threshold"
  | "api_key_expiring"
  | "team_changes"
  | "weekly_report"
  | "product_updates";

export type Channel = "email" | "inApp" | "slack";

export type NotificationPrefs = {
  events: Record<NotificationEvent, Record<Channel, boolean>>;
  slackChannel: string;
  usageThreshold: number;
  quietHours: { enabled: boolean; start: string; end: string };
};

export type SecuritySettings = {
  twoFactorEnabled: boolean;
  twoFactorEnabledAt: string | null;
  /** Demo only: kept locally so codes can be verified in the browser. */
  twoFactorSecret: string | null;
  recoveryCodesRemaining: number;
  passwordChangedAt: string;
  requireTwoFactor: boolean;
  sessionTimeoutHours: number;
};

export type Session = {
  id: string;
  browser: string;
  os: string;
  device: "desktop" | "mobile";
  location: string;
  ip: string;
  lastActiveAt: string;
};

export type AuditCategory = "account" | "security" | "team" | "api" | "billing" | "workspace";

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  category: AuditCategory;
  action: string;
  target?: string;
};

export type PlanId = "free" | "pro" | "enterprise";

export type Billing = {
  planId: PlanId;
  status: "trialing" | "active";
  interval: "monthly" | "yearly";
  trialEndsAt: string | null;
  billingEmail: string;
  company: string;
  address: string;
  taxId: string;
};

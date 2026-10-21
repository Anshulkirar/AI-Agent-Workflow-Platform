import { defaultSettings } from "@/lib/agents/catalog";
import type {
  ApiKey,
  AuditEvent,
  Billing,
  Member,
  NotificationEvent,
  NotificationPrefs,
  Profile,
  SecuritySettings,
  Session,
  WorkspaceSettings,
} from "./types";

// Demo workspace. Fixed timestamps keep server and client markup identical.

const at = (month: number, day: number, hour = 9, minute = 0) => new Date(Date.UTC(2026, month - 1, day, hour, minute)).toISOString();

export const seedProfile: Profile = {
  name: "Anshul",
  email: "anshul@acme.com",
  title: "Founding engineer",
  timezone: "Asia/Kolkata",
  avatarColor: "indigo",
};

export const seedWorkspace: WorkspaceSettings = {
  name: "Acme AI",
  slug: "acme",
  modelDefaults: defaultSettings,
  retentionDays: 90,
};

export const seedBilling: Billing = {
  planId: "pro",
  status: "trialing",
  interval: "monthly",
  trialEndsAt: at(10, 23, 23, 59),
  billingEmail: "billing@acme.com",
  company: "Acme Inc.",
  address: "",
  taxId: "",
};

export const seedMembers: Member[] = [
  { id: "m-anshul", name: "Anshul", email: "anshul@acme.com", role: "owner", status: "active", avatarColor: "indigo", invitedAt: at(8, 14), joinedAt: at(8, 14), lastActiveAt: at(10, 18, 10) },
  { id: "m-maya", name: "Maya Chen", email: "maya@acme.com", role: "admin", status: "active", avatarColor: "violet", invitedAt: at(8, 20), joinedAt: at(8, 20, 11), lastActiveAt: at(10, 18, 8, 30) },
  { id: "m-leo", name: "Leo Park", email: "leo@acme.com", role: "member", status: "active", avatarColor: "sky", invitedAt: at(9, 2), joinedAt: at(9, 2, 15), lastActiveAt: at(10, 17, 16, 45) },
  { id: "m-sam", name: "Sam Rivera", email: "sam@acme.com", role: "member", status: "active", avatarColor: "emerald", invitedAt: at(9, 10), joinedAt: at(9, 11, 9), lastActiveAt: at(10, 16, 12) },
  { id: "m-priya", name: "Priya Nair", email: "priya@acme.com", role: "viewer", status: "active", avatarColor: "amber", invitedAt: at(9, 28), joinedAt: at(9, 29, 10), lastActiveAt: at(10, 11, 14) },
  { id: "m-jordan", name: "", email: "jordan@acme.com", role: "member", status: "invited", avatarColor: "rose", invitedAt: at(10, 16, 13), joinedAt: null, lastActiveAt: null },
];

export const seedApiKeys: ApiKey[] = [
  {
    id: "key-prod",
    name: "Production backend",
    environment: "live",
    prefix: "af_live_",
    last4: "9f2c",
    scopes: ["agents:run", "workflows:run", "runs:read"],
    createdAt: at(8, 22),
    createdBy: "Anshul",
    lastUsedAt: at(10, 18, 9, 57),
    expiresAt: null,
    revokedAt: null,
    requests30d: 18_204,
  },
  {
    id: "key-zapier",
    name: "Zapier automation",
    environment: "live",
    prefix: "af_live_",
    last4: "a71d",
    scopes: ["workflows:run"],
    createdAt: at(9, 5),
    createdBy: "Maya Chen",
    lastUsedAt: at(10, 17, 22, 10),
    expiresAt: at(10, 30),
    revokedAt: null,
    requests30d: 2_310,
  },
  {
    id: "key-staging",
    name: "Staging tests",
    environment: "test",
    prefix: "af_test_",
    last4: "03be",
    scopes: ["agents:run", "agents:write", "runs:read", "knowledge:write"],
    createdAt: at(9, 12),
    createdBy: "Leo Park",
    lastUsedAt: at(10, 9, 17),
    expiresAt: null,
    revokedAt: null,
    requests30d: 640,
  },
  {
    id: "key-old",
    name: "Old CLI token",
    environment: "live",
    prefix: "af_live_",
    last4: "c4e8",
    scopes: ["agents:run", "runs:read"],
    createdAt: at(8, 15),
    createdBy: "Anshul",
    lastUsedAt: at(9, 1),
    expiresAt: null,
    revokedAt: at(9, 20),
    requests30d: 0,
  },
];

const allOn = { email: true, inApp: true, slack: false };
const events = (overrides: Partial<NotificationPrefs["events"]>) =>
  ({
    run_failed: allOn,
    workflow_failed: allOn,
    integration_error: { email: true, inApp: true, slack: true },
    usage_threshold: allOn,
    api_key_expiring: { email: true, inApp: true, slack: false },
    team_changes: { email: false, inApp: true, slack: false },
    weekly_report: { email: true, inApp: false, slack: false },
    product_updates: { email: false, inApp: true, slack: false },
    ...overrides,
  }) satisfies Record<NotificationEvent, NotificationPrefs["events"][NotificationEvent]>;

export const seedNotifications: NotificationPrefs = {
  events: events({}),
  slackChannel: "#agent-updates",
  usageThreshold: 80,
  quietHours: { enabled: false, start: "22:00", end: "08:00" },
};

export const seedSecurity: SecuritySettings = {
  twoFactorEnabled: false,
  twoFactorEnabledAt: null,
  twoFactorSecret: null,
  recoveryCodesRemaining: 0,
  passwordChangedAt: at(8, 14),
  requireTwoFactor: false,
  sessionTimeoutHours: 72,
};

/** Other signed-in devices (sample). The current browser is added at runtime. */
export const seedSessions: Session[] = [
  { id: "s-mac", browser: "Chrome 131", os: "macOS", device: "desktop", location: "Bengaluru, IN", ip: "103.21.xx.xx", lastActiveAt: at(10, 17, 18, 20) },
  { id: "s-iphone", browser: "Safari", os: "iOS 19", device: "mobile", location: "Bengaluru, IN", ip: "49.36.xx.xx", lastActiveAt: at(10, 15, 7, 45) },
  { id: "s-linux", browser: "Firefox 133", os: "Ubuntu", device: "desktop", location: "Frankfurt, DE", ip: "18.192.xx.xx", lastActiveAt: at(10, 2, 11) },
];

export const seedAudit: AuditEvent[] = [
  { id: "a-9", at: at(10, 17, 15), actor: "Anshul", category: "api", action: "Viewed API key usage", target: "Production backend" },
  { id: "a-8", at: at(10, 16, 13), actor: "Maya Chen", category: "team", action: "Invited member", target: "jordan@acme.com" },
  { id: "a-7", at: at(10, 9, 10), actor: "Anshul", category: "billing", action: "Started Pro trial" },
  { id: "a-6", at: at(9, 29, 10), actor: "Priya Nair", category: "team", action: "Joined workspace" },
  { id: "a-5", at: at(9, 20), actor: "Anshul", category: "api", action: "Revoked API key", target: "Old CLI token" },
  { id: "a-4", at: at(9, 12), actor: "Leo Park", category: "api", action: "Created API key", target: "Staging tests" },
  { id: "a-3", at: at(9, 5), actor: "Maya Chen", category: "api", action: "Created API key", target: "Zapier automation" },
  { id: "a-2", at: at(8, 22), actor: "Anshul", category: "api", action: "Created API key", target: "Production backend" },
  { id: "a-1", at: at(8, 14), actor: "Anshul", category: "workspace", action: "Created workspace", target: "Acme AI" },
];

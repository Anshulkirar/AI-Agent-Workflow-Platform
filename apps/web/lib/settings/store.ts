import { createCollectionStore, createValueStore, makeId } from "@/lib/create-store";
import {
  seedApiKeys,
  seedAudit,
  seedBilling,
  seedMembers,
  seedNotifications,
  seedProfile,
  seedSecurity,
  seedSessions,
  seedWorkspace,
} from "./seed";
import type { ApiKey, AuditCategory, AuditEvent, Member, Session } from "./types";

/*
 * Frontend-only settings. Everything persists to localStorage; nothing here
 * talks to a server, sends email, charges a card or changes how sign-in works.
 */

export const profileStore = createValueStore({ key: "agentflow-profile-v1", seed: seedProfile });
export const workspaceStore = createValueStore({ key: "agentflow-workspace-v1", seed: seedWorkspace });
export const billingStore = createValueStore({ key: "agentflow-billing-v1", seed: seedBilling });
export const notificationStore = createValueStore({ key: "agentflow-notifications-v1", seed: seedNotifications });
export const securityStore = createValueStore({ key: "agentflow-security-v1", seed: seedSecurity });

export const useProfile = profileStore.useValue;
export const useWorkspaceSettings = workspaceStore.useValue;
export const useBilling = billingStore.useValue;
export const useNotificationPrefs = notificationStore.useValue;
export const useSecuritySettings = securityStore.useValue;

export const memberStore = createCollectionStore<Member>({ key: "agentflow-members-v1", seed: seedMembers });
export const apiKeyStore = createCollectionStore<ApiKey>({ key: "agentflow-api-keys-v1", seed: seedApiKeys });
export const sessionStore = createCollectionStore<Session>({ key: "agentflow-sessions-v1", seed: seedSessions });
const auditCollection = createCollectionStore<AuditEvent>({ key: "agentflow-audit-v1", seed: seedAudit, limit: 200 });

export const useMembers = memberStore.useAll;
export const useApiKeys = apiKeyStore.useAll;
export const useSessions = sessionStore.useAll;
export const useAuditLog = auditCollection.useAll;

/** Records an action in the workspace audit log, attributed to the current user. */
export function audit(category: AuditCategory, action: string, target?: string) {
  const event: AuditEvent = {
    id: makeId("audit"),
    at: new Date().toISOString(),
    actor: profileStore.read().name || "You",
    category,
    action,
    target,
  };
  auditCollection.write([event, ...auditCollection.read()]);
}

/** Model settings new agents and workflows start with. */
export function workspaceModelDefaults() {
  return workspaceStore.read().modelDefaults;
}

export function initials(name: string, email = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase() || "?";
}

/** Every key this app writes — used by export and "reset demo data". */
export const STORAGE_PREFIX = "agentflow-";

/** The signed-in user's row in the team list (kept in sync with the profile). */
export const CURRENT_MEMBER_ID = "m-anshul";

// Shared domain types consumed by api, worker and web.

// --- Errors: every service responds with this envelope ---

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN_ORIGIN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EMAIL_TAKEN"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT";

export type FieldError = { field: string; message: string };

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: FieldError[] };
};

// --- Auth ---

/** Name of the HttpOnly cookie that carries the opaque session token. */
export const SESSION_COOKIE_NAME = "af_session";

/** The only user shape that ever leaves the auth service — never includes the password hash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type RegisterRequest = { name: string; email: string; password: string };
export type LoginRequest = {
  email: string;
  password: string;
  remember?: boolean;
};

export type AuthResponse = { user: PublicUser };
export type MeResponse = { user: PublicUser; session: { expiresAt: string } };

/** Auth service → gateway, from the internal-only `POST /internal/sessions/verify`. */
export type SessionVerification = { userId: string; sessionId: string };

// --- Workflows ---
export type WorkflowStatus = "active" | "paused" | "draft" | "archived";
export type WorkflowTrigger = {
  type: "manual" | "schedule" | "webhook" | "event";
  schedule?: string;
  event?: string;
};
export type WorkflowGraph = {
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: {
      kind: string;
      label: string;
      toolId?: string;
      config: Record<string, string | number | boolean>;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    label?: string;
  }>;
};
export type WorkflowSettings = {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  streaming: boolean;
  memory: boolean;
  responseFormat: "text" | "markdown" | "json";
};
export type WorkflowDefinition = {
  name: string;
  description: string;
  icon: string;
  color: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  tags: string[];
  graph: WorkflowGraph;
  settings: WorkflowSettings;
};

// --- Agents ---
export type AgentStatus = "active" | "inactive" | "draft" | "archived";
export type AgentDefinition = {
  name: string;
  description: string;
  icon: string;
  color: string;
  status: AgentStatus;
  instructions: string;
  tools: string[];
  knowledge: string[];
  settings: WorkflowSettings;
  workflow?: WorkflowGraph;
};

import type { NodeConfigValue } from "@/lib/agents/types";
import type { ConnectionField } from "./catalog";
import type { CustomToolDefinition } from "./types";

export type FieldErrors = Partial<Record<string, string>>;

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HOST_PATTERN = /^(?=.{1,253}$)([a-z0-9-]+\.)*[a-z0-9-]+$/i;

export function isValidJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/** Validates connection settings against their schema. */
export function validateConnection(fields: ConnectionField[], config: Record<string, NodeConfigValue>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    if (field.type === "switch" || field.type === "select") continue;
    const raw = config[field.key];
    const value = typeof raw === "string" ? raw.trim() : raw;
    const empty = value === "" || value === undefined || (typeof value === "number" && Number.isNaN(value));

    if (empty) {
      if (field.required) errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (field.type === "number") {
      const number = Number(value);
      if (!Number.isFinite(number)) errors[field.key] = "Enter a number.";
      else if (field.min !== undefined && number < field.min) errors[field.key] = `Must be at least ${field.min}.`;
      else if (field.max !== undefined && number > field.max) errors[field.key] = `Must be at most ${field.max}.`;
    }
    const text = String(value);
    switch (field.validate) {
      case "url":
        if (!URL_PATTERN.test(text)) errors[field.key] = "Enter a valid URL starting with http:// or https://.";
        break;
      case "email":
        if (!EMAIL_PATTERN.test(text)) errors[field.key] = "Enter a valid email address.";
        break;
      case "hostname":
        if (!HOST_PATTERN.test(text)) errors[field.key] = "Enter a hostname like db.example.com (no protocol).";
        break;
      case "port": {
        const port = Number(text);
        if (!Number.isInteger(port) || port < 1 || port > 65535) errors[field.key] = "Ports range from 1 to 65535.";
        break;
      }
      case "json":
        if (!isValidJson(text)) errors[field.key] = "This isn't valid JSON.";
        break;
    }
    if (field.type === "password" && field.required && text.length < 4) {
      errors[field.key] = `${field.label} looks too short.`;
    }
  }
  return errors;
}

export function validateCustomTool(definition: CustomToolDefinition, otherNames: string[]): FieldErrors {
  const errors: FieldErrors = {};
  const name = definition.name.trim();
  if (!name) errors.name = "Give your tool a name.";
  else if (name.length < 3) errors.name = "Use at least 3 characters.";
  else if (otherNames.some((other) => other.toLowerCase() === name.toLowerCase())) errors.name = "A tool with this name already exists.";
  if (definition.description.trim().length < 10) errors.description = "Describe what the tool does (10+ characters) — agents read this.";
  if (!URL_PATTERN.test(definition.endpoint.trim())) errors.endpoint = "Enter a valid URL starting with http:// or https://.";
  if (definition.authType !== "none" && definition.authValue.trim().length < 4) errors.authValue = "Enter the credential for this auth method.";
  if (definition.headers.trim() && !isValidJson(definition.headers)) errors.headers = "Headers must be a JSON object.";
  if (!definition.inputSchema.trim()) errors.inputSchema = "Describe the inputs as a JSON schema.";
  else if (!isValidJson(definition.inputSchema)) errors.inputSchema = "This isn't valid JSON.";
  if (!Number.isFinite(definition.timeoutSec) || definition.timeoutSec < 1 || definition.timeoutSec > 120) errors.timeoutSec = "Choose 1–120 seconds.";
  return errors;
}

export type TestStep = { label: string; status: "pending" | "running" | "success" | "failed" };
export type TestResult = { ok: boolean; latencyMs: number; message: string; failedAt?: number; sample?: string };

export const TEST_STEPS = ["Resolve host", "Open secure connection", "Authenticate", "Run sample request"];

/**
 * Decides the outcome of a simulated connection test. Deterministic so it's
 * demo-able: hosts/URLs containing "invalid" fail to resolve, ports 9999 time
 * out, and secrets containing "expired" are rejected.
 */
export function simulateTestOutcome(config: Record<string, NodeConfigValue>, toolName: string): TestResult {
  const values = Object.values(config).map((value) => String(value).toLowerCase());
  const latencyMs = 80 + Math.round(Math.random() * 260);
  if (values.some((value) => value.includes("invalid") || value.includes("localhost"))) {
    return { ok: false, latencyMs, failedAt: 0, message: "DNS lookup failed — the host could not be resolved. Check the URL or hostname." };
  }
  if (values.includes("9999")) {
    return { ok: false, latencyMs: 10_000, failedAt: 1, message: "Connection timed out after 10s. Is the port open to AgentFlow's IP range?" };
  }
  if (values.some((value) => value.includes("expired"))) {
    return { ok: false, latencyMs, failedAt: 2, message: "401 Unauthorized — the credential was rejected. Generate a new key and try again." };
  }
  return {
    ok: true,
    latencyMs,
    message: `${toolName} responded in ${latencyMs} ms.`,
    sample: JSON.stringify({ status: 200, ok: true, tool: toolName, sample: { items: 3, cursor: "eyJwYWdlIjoyfQ" } }, null, 2),
  };
}

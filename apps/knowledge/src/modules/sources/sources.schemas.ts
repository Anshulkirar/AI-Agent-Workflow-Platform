import { z } from "zod";

export const sourceTypeSchema = z.enum(["file", "url", "text"]);
export const fileKindSchema = z.enum(["pdf", "docx", "txt", "md", "csv", "xlsx", "json", "html"]);
export const textSourceSchema = z.object({
  type: z.literal("text"),
  name: z.string().trim().min(1).max(200),
  text: z.string().min(1).max(10 * 1024 * 1024),
  collectionId: z.string().trim().min(1).max(200),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});
export const urlSourceSchema = z.object({
  type: z.literal("url"),
  name: z.string().trim().min(1).max(200),
  url: z.url(),
  collectionId: z.string().trim().min(1).max(200),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});
export const sourcePatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  collectionId: z.string().trim().min(1).max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  syncSchedule: z.enum(["manual", "daily", "weekly"]).optional(),
});

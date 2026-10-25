import { z } from "zod";

// Normalizing here (trim + lowercase) is what makes "Ada@Example.com " and "ada@example.com" the same account.
const email = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }).max(254, { error: "Email is too long." }));

// Mirrors the signup form's rules. The 128 cap stops someone from making us hash a megabyte "password".
const newPassword = z
  .string({ error: "Password is required." })
  .min(8, { error: "Use at least 8 characters." })
  .max(128, { error: "Use at most 128 characters." })
  .regex(/[a-z]/i, { error: "Include at least one letter." })
  .regex(/\d/, { error: "Include at least one number." });

export const registerSchema = z.object({
  name: z
    .string({ error: "Please enter your full name." })
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(100, { error: "Name must be at most 100 characters." }),
  email,
  password: newPassword,
});

// Login doesn't re-apply signup rules: it only has to compare against what was stored.
export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Password is required." })
    .min(1, { error: "Password is required." })
    .max(128, { error: "Incorrect email or password." }),
  remember: z.boolean().default(true),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;

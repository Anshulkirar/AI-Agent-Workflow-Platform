"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import { GitHubIcon, GoogleIcon } from "@/components/icons/BrandIcons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { FormField } from "./FormField";

type Mode = "login" | "signup";

type Values = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  remember: boolean;
  terms: boolean;
};

type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FIELD_ORDER: Field[] = ["name", "email", "password", "confirmPassword", "terms"];

function validate(values: Values, mode: Mode): Errors {
  const errors: Errors = {};

  if (mode === "signup") {
    const name = values.name.trim();
    if (!name) errors.name = "Please enter your full name.";
    else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  }

  const email = values.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (mode === "signup") {
    if (values.password.length < 8) errors.password = "Use at least 8 characters.";
    else if (!/[a-z]/i.test(values.password) || !/\d/.test(values.password))
      errors.password = "Include at least one letter and one number.";
  } else if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (mode === "signup") {
    if (!values.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (values.confirmPassword !== values.password)
      errors.confirmPassword = "Passwords do not match.";
    if (!values.terms) errors.terms = "Please accept the terms to continue.";
  }

  return errors;
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-z0-9]/i.test(password)) score++;

  const levels = [
    { label: "Too weak", color: "bg-danger" },
    { label: "Weak", color: "bg-danger" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-sky-500" },
    { label: "Strong", color: "bg-success" },
  ];
  return { score, ...levels[score]! };
}

const copy = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your account to continue",
    submit: "Sign in",
    switchText: "Don't have an account?",
    switchLabel: "Sign up",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start building AI agents in minutes — free forever",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const text = copy[mode];

  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: true,
    terms: false,
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [provider, setProvider] = useState<"google" | "github" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const errors = validate(values, mode);
  const visibleError = (field: Field) =>
    touched[field] || submitted ? errors[field] : undefined;
  const busy = status !== "idle" || provider !== null;

  const update = <K extends Field>(field: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [field]: value }));
  const touch = (field: Field) =>
    setTouched((current) => ({ ...current, [field]: true }));

  const finish = () => {
    setStatus("success");
    timers.current.push(window.setTimeout(() => router.push("/dashboard"), 700));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setNotice(null);

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(`${mode}-${firstInvalid}`)?.focus();
      return;
    }

    // Frontend-only: simulate a network round-trip, then enter the dashboard.
    setStatus("loading");
    timers.current.push(window.setTimeout(finish, 1100));
  };

  const handleProvider = (name: "google" | "github") => {
    setProvider(name);
    timers.current.push(window.setTimeout(finish, 1000));
  };

  const strength = passwordStrength(values.password);
  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((value) => !value)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      className="shrink-0 rounded-md p-1 text-subtle-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{text.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.subtitle}</p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "signup" && (
          <FormField
            id="signup-name"
            label="Full name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            icon={<UserRound className="size-4" />}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            onBlur={() => touch("name")}
            error={visibleError("name")}
            disabled={busy}
          />
        )}

        <FormField
          id={`${mode}-email`}
          type="email"
          label="Email address"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          onBlur={() => touch("email")}
          error={visibleError("email")}
          disabled={busy}
        />

        <div>
          <FormField
            id={`${mode}-password`}
            type={showPassword ? "text" : "password"}
            label="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
            icon={<Lock className="size-4" />}
            trailing={passwordToggle}
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            onBlur={() => touch("password")}
            error={visibleError("password")}
            disabled={busy}
            labelAction={
              mode === "login" ? (
                <button
                  type="button"
                  onClick={() =>
                    setNotice("Password reset isn't available in this demo — any valid password works.")
                  }
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              ) : undefined
            }
          />

          {mode === "signup" && values.password && (
            <div className="mt-2 flex items-center gap-3 animate-fade-in">
              <div className="grid flex-1 grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1 rounded-full transition-colors duration-300",
                      strength.score >= step ? strength.color : "bg-border",
                    )}
                  />
                ))}
              </div>
              <span className="w-14 text-right text-[11px] font-semibold text-muted-foreground">
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {mode === "signup" && (
          <FormField
            id="signup-confirmPassword"
            type={showPassword ? "text" : "password"}
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            icon={<Lock className="size-4" />}
            value={values.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            onBlur={() => touch("confirmPassword")}
            error={visibleError("confirmPassword")}
            disabled={busy}
          />
        )}

        {mode === "login" ? (
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={values.remember}
              onChange={(event) => update("remember", event.target.checked)}
              className="size-4 rounded accent-[var(--primary)]"
            />
            Remember me for 30 days
          </label>
        ) : (
          <div>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
              <input
                id="signup-terms"
                type="checkbox"
                checked={values.terms}
                onChange={(event) => {
                  update("terms", event.target.checked);
                  touch("terms");
                }}
                aria-invalid={visibleError("terms") ? true : undefined}
                aria-describedby={visibleError("terms") ? "signup-terms-error" : undefined}
                className="mt-0.5 size-4 shrink-0 rounded accent-[var(--primary)]"
              />
              <span>
                I agree to the{" "}
                <span className="font-semibold text-foreground">Terms of Service</span> and{" "}
                <span className="font-semibold text-foreground">Privacy Policy</span>
              </span>
            </label>
            {visibleError("terms") && (
              <p
                id="signup-terms-error"
                role="alert"
                className="mt-1.5 text-xs font-medium text-danger animate-fade-in"
              >
                {visibleError("terms")}
              </p>
            )}
          </div>
        )}

        {notice && (
          <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2.5 text-xs text-primary-soft-foreground animate-fade-in">
            <Info className="mt-px size-4 shrink-0" />
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={buttonVariants({ size: "lg", className: "group w-full" })}
        >
          {status === "loading" ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              {mode === "login" ? "Signing in…" : "Creating account…"}
            </>
          ) : status === "success" ? (
            <>
              <CircleCheck className="size-4" />
              Success — redirecting…
            </>
          ) : (
            <>
              {text.submit}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-subtle-foreground">
        <span className="h-px flex-1 bg-border" />
        or continue with
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            { id: "google", label: "Google", icon: <GoogleIcon className="size-4" /> },
            { id: "github", label: "GitHub", icon: <GitHubIcon className="size-4" /> },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => handleProvider(item.id)}
            className={buttonVariants({ variant: "secondary", size: "md", className: "h-11" })}
          >
            {provider === item.id ? <LoaderCircle className="size-4 animate-spin" /> : item.icon}
            Continue with {item.label}
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {text.switchText}{" "}
        <Link href={text.switchHref} className="font-semibold text-primary hover:underline">
          {text.switchLabel}
        </Link>
      </p>
    </div>
  );
}

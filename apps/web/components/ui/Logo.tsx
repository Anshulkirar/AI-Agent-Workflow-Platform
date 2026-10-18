import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="11.5" y="3" width="9" height="9" rx="2.5" transform="rotate(45 16 7.5)" fill="#7c6cff" />
      <rect x="20" y="11.5" width="9" height="9" rx="2.5" transform="rotate(45 24.5 16)" fill="#5b4cf0" />
      <rect x="11.5" y="20" width="9" height="9" rx="2.5" transform="rotate(45 16 24.5)" fill="#4338ca" />
      <rect x="3" y="11.5" width="9" height="9" rx="2.5" transform="rotate(45 7.5 16)" fill="#6d5ef7" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="AgentFlow home"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      <LogoMark className="size-8 transition-transform duration-500 hover:rotate-90" />
      <span className="text-lg font-bold tracking-tight text-foreground">
        AgentFlow
      </span>
    </Link>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GitHubIcon } from "@/components/icons/BrandIcons";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Use Cases", href: "#use-cases" },
      { label: "Pricing", href: "#pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#docs" },
      { label: "API Reference", href: "#docs" },
      { label: "Guides", href: "#docs" },
      { label: "Changelog", href: "#docs" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
    ],
  },
];

export function CallToAction() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-linear-to-br from-[#6d5ef7] via-[#5b4cf0] to-[#3a2fc4] px-6 py-14 text-center text-white shadow-2xl shadow-primary/30 sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 size-80 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute right-1/4 top-0 size-40 rounded-full bg-sky-400/30 blur-3xl" />
        <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to build your first agent?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-white/80">
          Join thousands of builders orchestrating AI agents with AgentFlow. It
          takes less than five minutes to get started.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className={buttonVariants({
              size: "lg",
              className: "group bg-white text-[#4a3be0] shadow-black/10 hover:bg-white/90",
            })}
          >
            Get Started Free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({
              size: "lg",
              className: "border border-white/30 bg-white/10 shadow-none hover:bg-white/20",
            })}
          >
            Explore the dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer id="docs" className="scroll-mt-20 border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Build, orchestrate and deploy AI agents effortlessly.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="mt-5 inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <GitHubIcon className="size-4" />
          </a>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold">{column.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-subtle-foreground sm:px-6 lg:px-8">
          © {new Date().getFullYear()} AgentFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

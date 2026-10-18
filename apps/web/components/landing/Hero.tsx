import Link from "next/link";
import { ArrowRight, CircleCheck, Play, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section
      id="product"
      className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-36"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-140 w-[min(1000px,140vw)] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_25%,transparent_70%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:px-8">
        <div className="max-w-xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
            <Sparkles className="size-3.5" />
            New · Multi-agent workflows
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Build, Orchestrate and Deploy AI Agents{" "}
            <span className="bg-linear-to-r from-primary via-violet-500 to-sky-500 bg-clip-text text-transparent">
              Effortlessly
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Create powerful AI agents, connect tools, automate workflows, and
            run them at scale — all in one platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg", className: "group" })}>
              Get Started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "secondary", size: "lg", className: "group" })}
            >
              <Play className="size-4 fill-current text-primary transition-transform group-hover:scale-110" />
              View Demo
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Free plan forever", "No credit card required", "Deploy in minutes"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CircleCheck className="size-4 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

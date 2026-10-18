"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import {
  Bot,
  Check,
  ClipboardList,
  Database,
  Globe,
  LoaderCircle,
  Pause,
  Play,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import {
  GitHubIcon,
  GoogleIcon,
  NotionIcon,
  OpenAIIcon,
  ReactIcon,
  SlackIcon,
} from "@/components/icons/BrandIcons";
import { cn } from "@/lib/cn";

/*
 * Every position below is a percentage of the 6:5 canvas. The SVG uses a
 * 600×500 viewBox so the same numbers drive both the HTML tiles and the
 * connection paths (x * 6, y * 5).
 */
type Point = { x: number; y: number };

type Integration = {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  at: Point;
  target: Point;
  delay: number;
  iconClass?: string;
};

const CARD_TOP: Point = { x: 37, y: 44 };
const CARD_LEFT: Point = { x: 16, y: 62 };
const CARD_RIGHT: Point = { x: 58, y: 62 };

const integrations: Integration[] = [
  { name: "OpenAI", Icon: OpenAIIcon, at: { x: 9, y: 16 }, target: CARD_TOP, delay: 0, iconClass: "text-foreground" },
  { name: "Google", Icon: GoogleIcon, at: { x: 29, y: 7 }, target: CARD_TOP, delay: 1.2 },
  { name: "Notion", Icon: NotionIcon, at: { x: 50, y: 15 }, target: CARD_TOP, delay: 0.6, iconClass: "text-foreground" },
  { name: "GitHub", Icon: GitHubIcon, at: { x: 71, y: 6 }, target: CARD_TOP, delay: 1.8, iconClass: "text-foreground" },
  { name: "Slack", Icon: SlackIcon, at: { x: 91, y: 19 }, target: CARD_TOP, delay: 2.4 },
  { name: "React", Icon: ReactIcon, at: { x: 6, y: 88 }, target: CARD_LEFT, delay: 0.3 },
];

const steps = [
  { label: "Plan", detail: "Breaking the goal into sub-tasks", icon: ClipboardList },
  { label: "Use Tools", detail: "Calling APIs, search and code", icon: Wrench },
  { label: "Execute", detail: "Running actions in parallel", icon: Zap },
  { label: "Get Results", detail: "Returning verified output", icon: Sparkles },
];

const STEP_X = 66;
const stepY = (index: number) => 40 + index * 15;

const toSvg = ({ x, y }: Point) => `${x * 6} ${y * 5}`;

function curve(from: Point, to: Point) {
  const midY = (from.y + to.y) / 2;
  return `M ${toSvg(from)} C ${toSvg({ x: from.x, y: midY })}, ${toSvg({ x: to.x, y: midY })}, ${toSvg(to)}`;
}

function horizontalCurve(from: Point, to: Point) {
  const midX = (from.x + to.x) / 2;
  return `M ${toSvg(from)} C ${toSvg({ x: midX, y: from.y })}, ${toSvg({ x: midX, y: to.y })}, ${toSvg(to)}`;
}

export function HeroVisual() {
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(true);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!running || hovering) return;
    const id = window.setInterval(
      () => setActive((current) => (current + 1) % steps.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, [running, hovering]);

  const current = steps[active] ?? steps[0]!;
  const progress = ((active + 1) / steps.length) * 100;

  return (
    <div
      className="relative mx-auto aspect-[6/5] w-full max-w-[600px] select-none animate-fade-up [animation-delay:150ms]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Ambient glow + orbit rings */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-[12%] top-[30%] size-[60%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-[40%] size-[35%] rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute left-[8%] top-[22%] size-[62%] rounded-full border border-dashed border-primary/15" />
      </div>

      {/* Connections */}
      <svg
        viewBox="0 0 600 500"
        preserveAspectRatio="none"
        aria-hidden
        className="absolute inset-0 size-full overflow-visible"
      >
        <defs>
          <linearGradient id="hero-flow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {integrations.map((item, index) => {
          const d = curve(item.at, item.target);
          return (
            <g key={item.name}>
              <path d={d} fill="none" stroke="var(--border)" strokeWidth="2" />
              <path
                d={d}
                fill="none"
                stroke="url(#hero-flow)"
                strokeWidth="2"
                strokeDasharray="6 10"
                strokeLinecap="round"
                className={cn(
                  "transition-opacity duration-500",
                  running ? "animate-dash" : "",
                  active === 1 ? "opacity-100" : "opacity-50",
                )}
              />
              {running && (
                <circle r="4" fill="var(--primary)" className="motion-reduce:hidden">
                  <animateMotion
                    dur="2.8s"
                    begin={`${index * 0.45}s`}
                    repeatCount="indefinite"
                    path={d}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {steps.map((step, index) => {
          const d = horizontalCurve(CARD_RIGHT, { x: STEP_X, y: stepY(index) });
          const isActive = index === active;
          return (
            <path
              key={step.label}
              d={d}
              fill="none"
              strokeWidth={isActive ? 2.5 : 2}
              strokeLinecap="round"
              stroke={isActive ? "var(--primary)" : "var(--border)"}
              strokeDasharray={isActive ? "6 10" : undefined}
              className={cn(
                "transition-[stroke] duration-500",
                isActive && running && "animate-dash",
              )}
            />
          );
        })}
      </svg>

      {/* Integration tiles */}
      {integrations.map(({ name, Icon, at, delay, iconClass }) => (
        <div
          key={name}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${at.x}%`, top: `${at.y}%` }}
        >
          <div
            className="animate-float"
            style={{ animationDelay: `${delay}s` }}
          >
            <div
              title={name}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-lg shadow-primary/10 transition-all duration-500 hover:scale-110 hover:shadow-primary/25 sm:size-14 sm:rounded-2xl",
                active === 1 && "ring-2 ring-primary/40",
              )}
            >
              <Icon className={cn("size-5 sm:size-7", iconClass)} />
              <span className="sr-only">{name}</span>
            </div>
          </div>
        </div>
      ))}

      {/* AI agent card */}
      <div
        className="absolute"
        style={{ left: "16%", top: `${CARD_TOP.y}%`, width: `${CARD_RIGHT.x - 16}%` }}
      >
        <div className="animate-float [animation-delay:0.8s] [animation-duration:7s]">
          <div className="rounded-2xl bg-linear-to-br from-[#7466f8] via-[#5b4cf0] to-[#3a2fc4] p-3 text-white shadow-2xl shadow-primary/40 ring-1 ring-white/20 [transform:perspective(900px)_rotateX(8deg)_rotateY(-10deg)] sm:rounded-3xl sm:p-5">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <button
                type="button"
                onClick={() => setRunning((value) => !value)}
                aria-label={running ? "Pause agent" : "Run agent"}
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-11"
              >
                {running && (
                  <span className="absolute inset-0 rounded-full bg-white animate-pulse-ring" />
                )}
                {running ? (
                  <Pause className="relative size-3.5 fill-current sm:size-4" />
                ) : (
                  <Play className="relative ml-0.5 size-3.5 fill-current sm:size-4" />
                )}
              </button>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/70 sm:text-[10px]">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      running ? "bg-emerald-300" : "bg-amber-300",
                    )}
                  />
                  {running ? "Running" : "Paused"}
                </p>
                <p className="truncate text-sm font-bold sm:text-xl">AI Agent</p>
              </div>
              <Bot className="ml-auto hidden size-6 text-white/60 sm:block" />
            </div>

            <p
              key={active}
              className="mt-2.5 truncate text-[10px] text-white/80 animate-fade-in sm:mt-4 sm:text-xs"
            >
              Step {active + 1}/{steps.length} · {current.detail}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20 sm:h-1.5">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2.5 flex gap-1.5 sm:mt-4 sm:gap-2">
              {[
                { label: "Slack", node: <SlackIcon className="size-3.5 sm:size-4" /> },
                { label: "Database", node: <Database className="size-3.5 text-amber-200 sm:size-4" /> },
                { label: "Web", node: <Globe className="size-3.5 text-sky-200 sm:size-4" /> },
              ].map((tool) => (
                <span
                  key={tool.label}
                  title={tool.label}
                  className="flex size-6 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur sm:size-8"
                >
                  {tool.node}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow steps */}
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === active;
        const done = index < active;

        return (
          <button
            key={step.label}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={isActive}
            className={cn(
              "absolute right-0 flex -translate-y-1/2 items-center gap-1.5 rounded-lg border bg-card px-1.5 py-1.5 text-left shadow-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5",
              isActive
                ? "border-primary/50 shadow-lg shadow-primary/15 sm:scale-[1.04]"
                : "border-border hover:border-primary/30",
            )}
            style={{ left: `${STEP_X}%`, top: `${stepY(index)}%` }}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md transition-colors sm:size-7 sm:rounded-lg",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-primary-soft-foreground",
              )}
            >
              <Icon className="size-3 sm:size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold sm:text-[13px]">
              {step.label}
            </span>
            <span className="hidden shrink-0 sm:block">
              {done ? (
                <Check className="size-4 text-success" aria-label="Done" />
              ) : isActive && running ? (
                <LoaderCircle className="size-4 animate-spin text-primary" aria-label="In progress" />
              ) : (
                <span className="block size-2 rounded-full bg-border" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import type { ReactNode } from "react";
import { Cloud, Database, Globe, Mail, Webhook } from "lucide-react";
import {
  GitHubIcon,
  GoogleIcon,
  NotionIcon,
  OpenAIIcon,
  ReactIcon,
  SlackIcon,
} from "@/components/icons/BrandIcons";
import { cn } from "@/lib/cn";

const iconClass = "size-5";

const rowOne: { name: string; icon: ReactNode }[] = [
  { name: "OpenAI", icon: <OpenAIIcon className={iconClass} /> },
  { name: "Google", icon: <GoogleIcon className={iconClass} /> },
  { name: "GitHub", icon: <GitHubIcon className={iconClass} /> },
  { name: "Notion", icon: <NotionIcon className={iconClass} /> },
  { name: "Slack", icon: <SlackIcon className={iconClass} /> },
  { name: "React", icon: <ReactIcon className={iconClass} /> },
];

const rowTwo: { name: string; icon: ReactNode }[] = [
  { name: "PostgreSQL", icon: <Database className={cn(iconClass, "text-sky-500")} /> },
  { name: "Web Search", icon: <Globe className={cn(iconClass, "text-emerald-500")} /> },
  { name: "Webhooks", icon: <Webhook className={cn(iconClass, "text-rose-500")} /> },
  { name: "Email", icon: <Mail className={cn(iconClass, "text-amber-500")} /> },
  { name: "Cloud Storage", icon: <Cloud className={cn(iconClass, "text-violet-500")} /> },
  { name: "REST APIs", icon: <Globe className={cn(iconClass, "text-primary")} /> },
];

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: { name: string; icon: ReactNode }[];
  reverse?: boolean;
}) {
  // Repeated (an even number of times) so the -50% translate loops seamlessly.
  const doubled = [...items, ...items, ...items, ...items];

  return (
    <div className="group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <ul
        className={cn(
          "flex w-max shrink-0 gap-4 py-2 group-hover:[animation-play-state:paused]",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
      >
        {doubled.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            aria-hidden={index >= items.length}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold shadow-sm"
          >
            <span className="text-foreground">{item.icon}</span>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegrationsMarquee() {
  return (
    <section
      aria-labelledby="integrations-title"
      className="border-y border-border bg-muted/50 py-14"
    >
      <p
        id="integrations-title"
        className="mb-8 px-4 text-center text-sm font-medium text-muted-foreground"
      >
        Plug your agents into{" "}
        <span className="font-semibold text-foreground">100+ tools and APIs</span>{" "}
        your team already uses
      </p>
      <div className="space-y-4">
        <MarqueeRow items={rowOne} />
        <MarqueeRow items={rowTwo} reverse />
      </div>
    </section>
  );
}

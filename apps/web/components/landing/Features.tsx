import { Network, Plug, ShieldCheck, Workflow } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const features = [
  {
    title: "Visual Agent Builder",
    description: "Create agents with a simple, visual UI — no boilerplate required.",
    icon: Workflow,
  },
  {
    title: "Powerful Integrations",
    description: "Connect 100+ tools and APIs your agents can call on demand.",
    icon: Plug,
  },
  {
    title: "Scalable Infrastructure",
    description: "Run thousands of agents in parallel with queues and retries built in.",
    icon: Network,
  },
  {
    title: "Enterprise Ready",
    description: "Secure, reliable and flexible — SSO, audit logs and role-based access.",
    icon: ShieldCheck,
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to ship agents"
          description="From the first prompt to production scale, AgentFlow gives your team one place to build, run and monitor AI agents."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, description, icon: Icon }, index) => (
            <article
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 animate-fade-up hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div
                aria-hidden
                className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

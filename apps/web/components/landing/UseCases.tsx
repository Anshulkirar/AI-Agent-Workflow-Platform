import { Check, Code, FileSearch, Headset } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const useCases = [
  {
    title: "Research & Analysis",
    description: "Agents that search the web, read documents and summarize findings.",
    icon: FileSearch,
    accent: "from-sky-500 to-indigo-500",
    points: ["Market & competitor research", "Report generation", "Data extraction"],
  },
  {
    title: "Customer Support",
    description: "Resolve tickets around the clock with agents grounded in your docs.",
    icon: Headset,
    accent: "from-violet-500 to-fuchsia-500",
    points: ["Ticket triage & routing", "Knowledge-base answers", "Escalation handoff"],
  },
  {
    title: "Engineering Automation",
    description: "Review pull requests, write tests and keep your codebase healthy.",
    icon: Code,
    accent: "from-emerald-500 to-teal-500",
    points: ["Code review on GitHub", "Test generation", "Incident summaries"],
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Use cases"
          title="Agents for every team"
          description="Start from a template or build your own — AgentFlow adapts to the work your team actually does."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {useCases.map(({ title, description, icon: Icon, accent, points }) => (
            <article
              key={title}
              className="group rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-xl bg-linear-to-br ${accent} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
              <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                {points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

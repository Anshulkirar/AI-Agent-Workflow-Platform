"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Boxes,
  ChevronDown,
  CircleHelp,
  CodeXml,
  CreditCard,
  LifeBuoy,
  Link2,
  Network,
  Rocket,
  SearchX,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton, copyText } from "@/components/ui/CopyButton";
import { MarkdownLite } from "@/components/ui/MarkdownLite";
import { EmptyState, SearchInput } from "@/components/ui/PageKit";
import { cn } from "@/lib/cn";
import { docSections, type DocArticle, type DocIconKey, type DocSection } from "@/lib/help/docs";
import { toast } from "@/lib/toast";

const sectionIcons: Record<DocIconKey, typeof Rocket> = {
  rocket: Rocket,
  bot: Bot,
  workflow: Network,
  wrench: Wrench,
  book: Boxes,
  activity: Activity,
  code: CodeXml,
  card: CreditCard,
  help: CircleHelp,
};

const sectionTones: Record<DocIconKey, string> = {
  rocket: "bg-primary-soft text-primary",
  bot: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  workflow: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  wrench: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  book: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  activity: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  code: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  card: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  help: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

const popularArticles = ["quickstart", "custom-tools", "triggers", "debugging", "authentication"];

const articleIndex = new Map(
  docSections.flatMap((section) => section.articles.map((article) => [article.id, article] as const)),
);

/** Lowercased text each article is searched against. */
const haystacks = new Map(
  docSections.flatMap((section) =>
    section.articles.map((article) => [
      article.id,
      [section.title, article.title, article.summary, article.body, article.code?.source ?? "", ...(article.keywords ?? [])]
        .join(" ")
        .toLowerCase(),
    ] as const),
  ),
);

function searchTerms(query: string) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every occurrence of the search terms in <mark>. */
function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded bg-primary/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** When a term only matches the body, show the sentence around it instead of the summary. */
function matchSnippet(article: DocArticle, terms: string[]) {
  const visible = `${article.title} ${article.summary}`.toLowerCase();
  const term = terms.find((t) => !visible.includes(t));
  if (!term) return article.summary;
  const plain = article.body.replace(/[*_`#]/g, "").replace(/\s+/g, " ");
  const index = plain.toLowerCase().indexOf(term);
  if (index === -1) return article.summary;
  const start = Math.max(0, index - 60);
  const end = Math.min(plain.length, index + term.length + 80);
  return `${start > 0 ? "…" : ""}${plain.slice(start, end).trim()}${end < plain.length ? "…" : ""}`;
}

export function HelpCenter({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [activeSection, setActiveSection] = useState(docSections[0]!.id);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const terms = useMemo(() => searchTerms(query), [query]);

  const sections = useMemo(() => {
    if (!terms.length) return docSections;
    return docSections
      .map((section) => ({
        ...section,
        articles: section.articles.filter((article) => terms.every((term) => haystacks.get(article.id)!.includes(term))),
      }))
      .filter((section) => section.articles.length > 0);
  }, [terms]);

  const resultCount = sections.reduce((total, section) => total + section.articles.length, 0);

  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Expands an article (clearing a search that hides it) and scrolls to it. */
  const openArticle = useCallback((id: string) => {
    if (!articleIndex.has(id)) return;
    setQuery((current) =>
      searchTerms(current).every((term) => haystacks.get(id)!.includes(term)) ? current : "",
    );
    setOpenIds((current) => new Set(current).add(id));
    setScrollTarget(id);
  }, []);

  // Scroll once the article is rendered (and expanded).
  useEffect(() => {
    if (!scrollTarget) return;
    document.getElementById(scrollTarget)?.scrollIntoView({ block: "start" });
    setScrollTarget(null);
  }, [scrollTarget]);

  // Deep links: /help#authentication opens that article.
  useEffect(() => {
    const onHash = () => openArticle(decodeURIComponent(window.location.hash.slice(1)));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openArticle]);

  // Highlight the section being read in the table of contents.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-8 shadow-sm shadow-black/2 animate-fade-up sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground">
            <LifeBuoy size={13} />
            Help & Docs
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-[32px]">How can we help?</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-[15px]">
            Guides, references and answers for building, running and scaling agents with AgentFlow.
          </p>

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search the docs — e.g. webhook, API keys, failed run"
            label="Search documentation"
            className="mt-6 h-12 rounded-2xl shadow-sm"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-subtle-foreground">Popular:</span>
            {popularArticles.map((id) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(event) => {
                  event.preventDefault();
                  history.replaceState(null, "", `#${id}`);
                  openArticle(id);
                }}
                className="rounded-full border border-border bg-muted/60 px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {articleIndex.get(id)!.title.split(":")[0]}
              </a>
            ))}
          </div>
        </div>
      </header>

      {!terms.length && (
        <section aria-label="Browse by topic" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {docSections.map((section, index) => (
            <TopicCard key={section.id} section={section} index={index} />
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Documentation sections" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle-foreground lg:block">
            On this page
          </p>
          {/* Mobile: one scrollable row of pills. Desktop: vertical list. */}
          <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {sections.map((section) => {
              const Icon = sectionIcons[section.icon];
              const active = activeSection === section.id;
              return (
                <li key={section.id} className="shrink-0">
                  <a
                    href={`#${section.id}`}
                    aria-current={active ? "location" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition-colors lg:border-transparent",
                      active
                        ? "border-primary/30 bg-primary-soft text-primary-soft-foreground"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon size={15} className={active ? "text-primary" : "text-subtle-foreground"} />
                    {section.title}
                    {terms.length > 0 && (
                      <span className="ml-auto rounded-md bg-muted px-1.5 text-[11px] tabular-nums">{section.articles.length}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-10">
          {terms.length > 0 && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {resultCount === 0 ? "No results" : `${resultCount} ${resultCount === 1 ? "result" : "results"}`} for{" "}
              <span className="font-semibold text-foreground">“{query.trim()}”</span>
            </p>
          )}

          {sections.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No matching articles"
              description="Try different keywords, or browse all topics."
              action={
                <button type="button" onClick={() => setQuery("")} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Clear search
                </button>
              }
            />
          )}

          {sections.map((section) => {
            const Icon = sectionIcons[section.icon];
            return (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
                <div className="mb-4 flex items-start gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", sectionTones[section.icon])}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 id={`${section.id}-title`} className="text-lg font-bold tracking-tight">
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>

                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/2">
                  {section.articles.map((article) => (
                    <ArticleItem
                      key={article.id}
                      article={article}
                      terms={terms}
                      open={openIds.has(article.id)}
                      onToggle={() => toggle(article.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <SupportCard />
        </div>
      </div>
    </div>
  );
}

function TopicCard({ section, index }: { section: DocSection; index: number }) {
  const Icon = sectionIcons[section.icon];
  return (
    <a
      href={`#${section.id}`}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/2 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110", sectionTones[section.icon])}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{section.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
        <p className="mt-2 text-xs font-medium text-subtle-foreground">
          {section.articles.length} {section.articles.length === 1 ? "article" : "articles"}
        </p>
      </div>
    </a>
  );
}

function ArticleItem({
  article,
  terms,
  open,
  onToggle,
}: {
  article: DocArticle;
  terms: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const panelId = `${article.id}-panel`;

  const sendFeedback = (value: "up" | "down") => {
    setFeedback(value);
    toast({
      title: "Thanks for the feedback",
      description: value === "up" ? "Glad this article helped." : "We'll use this to improve the article.",
      tone: "info",
    });
  };

  return (
    <article id={article.id} className="scroll-mt-24">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{highlight(article.title, terms)}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {highlight(terms.length ? matchSnippet(article, terms) : article.summary, terms)}
            </span>
          </span>
          <ChevronDown
            size={18}
            className={cn("mt-0.5 shrink-0 text-subtle-foreground transition-transform duration-200", open && "rotate-180 text-primary")}
          />
        </button>
      </h3>

      {open && (
        <div id={panelId} className="space-y-4 px-5 pb-5 text-sm leading-6 text-foreground/90 animate-fade-in">
          <MarkdownLite source={article.body} />

          {article.code && (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/60">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {article.code.label} <span className="text-subtle-foreground">· {article.code.language}</span>
                </span>
                <CopyButton value={article.code.source} label="Copy code" />
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-5">
                <code>{article.code.source}</code>
              </pre>
            </div>
          )}

          {article.links && (
            <div className="flex flex-wrap gap-2">
              {article.links.map((link) => (
                <Link key={link.href} href={link.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  {link.label}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="mr-1">Was this helpful?</span>
              {(["up", "down"] as const).map((value) => {
                const Icon = value === "up" ? ThumbsUp : ThumbsDown;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={value === "up" ? "Yes, this helped" : "No, this didn't help"}
                    aria-pressed={feedback === value}
                    disabled={feedback !== null}
                    onClick={() => sendFeedback(value)}
                    className={cn(
                      "rounded-lg p-1.5 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default",
                      feedback === value && "bg-primary-soft text-primary",
                    )}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={async () => {
                const copied = await copyText(`${window.location.origin}/help#${article.id}`);
                toast(copied ? { title: "Link copied", description: article.title } : { title: "Couldn't copy link", tone: "error" });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Link2 size={14} />
              Copy link
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function SupportCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary-soft/60 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        <LifeBuoy size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Still stuck?</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Inspect a run's logs to see exactly what happened, or check your plan's limits and usage.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/runs" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          View runs
        </Link>
        <Link href="/settings/billing" className={buttonVariants({ size: "sm" })}>
          Billing & usage
        </Link>
      </div>
    </div>
  );
}

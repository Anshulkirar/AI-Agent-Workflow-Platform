import { Bot, CircleCheck, Database, Sparkles, Workflow } from "lucide-react";

const highlights = [
  "Create and manage agents",
  "Connect to powerful tools",
  "Automate complex workflows",
  "Deploy and scale with ease",
];

/** Decorative right-hand panel of the auth screens (always dark). */
export function AuthShowcase() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0c0a2a] text-white lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 size-120 rounded-full bg-[#5b4cf0]/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-105 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* Isometric illustration */}
      <div className="relative flex flex-1 items-center justify-center [perspective:1400px]">
        <div className="relative h-80 w-64 [transform-style:preserve-3d] [transform:rotateX(56deg)_rotateZ(-42deg)] xl:h-96 xl:w-72">
          {/* Base slab */}
          <div className="absolute inset-0 rounded-[28px] border border-white/15 bg-linear-to-br from-[#4f42e6] via-[#3a2fc4] to-[#1d1870] p-6 shadow-[0_40px_80px_-20px_rgba(91,76,240,0.7)]">
            <div className="h-3 w-24 rounded-full bg-white/30" />
            <div className="mt-4 h-2 w-36 rounded-full bg-white/15" />
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((tile) => (
                <div key={tile} className="h-16 rounded-2xl border border-white/10 bg-white/10" />
              ))}
            </div>
            <div className="mt-6 h-2 w-full rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full bg-sky-300/70" />
            </div>
          </div>

          {/* Floating tiles */}
          <div className="absolute -left-10 top-6 [transform-style:preserve-3d] [translate:0_0_70px]">
            <div className="flex size-16 animate-float-z items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-2xl backdrop-blur">
              <Bot className="size-8 text-white" />
            </div>
          </div>
          <div className="absolute -right-12 top-24 [transform-style:preserve-3d] [translate:0_0_110px]">
            <div className="flex size-20 animate-float-z items-center justify-center rounded-full border-4 border-white/20 bg-linear-to-br from-[#8b7dff] to-[#5b4cf0] shadow-2xl [animation-delay:1s]">
              <Sparkles className="size-8 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-6 left-10 [transform-style:preserve-3d] [translate:0_0_90px]">
            <div className="flex size-14 animate-float-z items-center justify-center rounded-2xl border border-white/20 bg-sky-400/30 shadow-2xl backdrop-blur [animation-delay:2s]">
              <Database className="size-7 text-sky-100" />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-10 [transform-style:preserve-3d] [translate:0_0_50px]">
            <div className="flex size-12 animate-float-z items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-xl backdrop-blur [animation-delay:3s]">
              <Workflow className="size-6 text-white/90" />
            </div>
          </div>
          <div className="absolute -top-14 right-8 [transform-style:preserve-3d] [translate:0_0_140px]">
            <div className="size-10 animate-float-z rounded-full border-[6px] border-white/30 bg-[#0c0a2a] [animation-delay:1.5s]" />
          </div>
        </div>
      </div>

      <div className="relative px-12 pb-14 xl:px-16">
        <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
          Build AI agents for real-world impact
        </h2>
        <ul className="mt-7 space-y-3.5">
          {highlights.map((item, index) => (
            <li
              key={item}
              className="flex items-center gap-3 text-[15px] text-white/85 animate-fade-up"
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              <CircleCheck className="size-5 shrink-0 fill-[#5b4cf0] text-white" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

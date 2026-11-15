import Link from 'next/link'
import { LogoWordmark } from '@/components/logo'
import { HeroMock } from '@/components/hero-mock'

const FEATURES = [
  {
    title: 'Realtime sync',
    description:
      'Every card move, edit and comment propagates instantly to everyone on the board — no refresh, no stale views.',
    icon: (
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    ),
  },
  {
    title: 'Presence',
    description:
      'See exactly who is in the project: live online state with avatars and connection status per workspace member.',
    icon: (
      <>
        <circle cx="9" cy="7" r="3.2" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 4.5a4 4 0 0 1 0 6.8M18.5 20a5 5 0 0 0-3.5-4.8" />
      </>
    ),
  },
  {
    title: 'Drag & drop Kanban',
    description:
      'Butter-smooth board powered by optimistic updates: moves apply instantly and roll back automatically on failure.',
    icon: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.5" />
        <rect x="10.5" y="4" width="5" height="10" rx="1.5" />
        <rect x="18" y="4" width="5" height="14" rx="1.5" />
      </>
    ),
  },
  {
    title: 'Comments & activity',
    description:
      'Threaded comments on every task plus a chronological timeline: who moved what, who assigned what, when.',
    icon: (
      <path d="M4 5h16M4 10h16M4 15h9M4 20h5" />
    ),
  },
  {
    title: 'Notifications',
    description:
      'Assignments, comment replies and important changes land in your inbox — with an unread counter on the bell.',
    icon: (
      <>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2.2 2.2 0 0 0 4 0" />
      </>
    ),
  },
  {
    title: 'Offline-aware',
    description:
      'Lost connection? Your work stays on screen and syncs back safely when you return — without conflicts.',
    icon: (
      <>
        <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" />
        <path d="m3 3 18 18" />
      </>
    ),
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Create your workspace',
    description: 'One click, pick a name — you become the owner and can invite your whole team by email.',
  },
  {
    step: '02',
    title: 'Organize the work',
    description: 'Projects, backlog, priorities, due dates, labels and assignees — everything on one board.',
  },
  {
    step: '03',
    title: 'Ship, live',
    description: 'Every change syncs to everyone instantly. The activity feed tells the story afterwards.',
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* ambient layers */}
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-glow" />

      {/* nav */}
      <header className="relative z-20 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <LogoWordmark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#stack" className="transition-colors hover:text-white">Stack</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/workspaces"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
            >
              Open the app
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24 lg:pt-24">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 py-1.5 pl-2 pr-3 text-xs font-medium text-indigo-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
              </span>
              Realtime multiplayer · live presence
            </div>

            <h1 className="text-5xl font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl xl:text-7xl">
              Ship work,<br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                not refresh buttons.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
              Liveboard is the realtime workspace for shipping teams: a Kanban board with instant sync,
              live presence, comments, an activity timeline and notifications — plus optimistic UI and
              automatic reconnect. Built end-to-end in TypeScript.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/workspaces"
                className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
              >
                Open the live demo
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2 transition-transform group-hover:translate-x-0.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10h12M12 5l5 5-5 5" />
                </svg>
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white"
              >
                See how it works
              </a>
            </div>

            <p className="mt-5 text-xs text-zinc-500">
              Free demo · no credit card · runs locally with one Docker command
            </p>
          </div>

          {/* hero visual */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -inset-10 rounded-full bg-indigo-600/10 blur-3xl" aria-hidden />
            <HeroMock />
          </div>
        </section>

        {/* tech strip */}
        <section id="stack" className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <span>Next.js 16</span>
            <span>TypeScript</span>
            <span>PostgreSQL</span>
            <span>Prisma</span>
            <span>Socket.io / Pusher</span>
            <span>TanStack Query</span>
            <span>Tailwind</span>
            <span>Docker</span>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Features
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Everything on the board,<br />
              <span className="text-zinc-500">everyone in the room.</span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              The whole collaboration layer — realtime state, presence, comments, notifications and
              activity — is built into the product, not bolted on.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/5 bg-zinc-900/40 p-6 transition-all duration-300 hover:border-indigo-500/30 hover:bg-zinc-900/70 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.25)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 transition-colors group-hover:border-indigo-500/40 group-hover:text-indigo-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.7]" strokeLinecap="round" strokeLinejoin="round">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="mx-auto max-w-7xl px-6 pb-20 lg:pb-24">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-8 sm:p-12">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                How it works
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                From empty workspace to realtime in minutes.
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-white/5 bg-zinc-950/60 p-6">
                  <span className="text-sm font-bold text-indigo-500/80">{item.step}</span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-indigo-600/20 px-8 py-16 text-center sm:px-16">
            <div className="pointer-events-none absolute inset-0 bg-glow" />
            <div className="relative">
              <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Stop refreshing.<br />Start shipping.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-indigo-200/90">
                Open the live demo, invite a teammate and watch a card move on two screens at once.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-xl transition-all hover:bg-indigo-50"
              >
                Create your workspace
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10h12M12 5l5 5-5 5" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <LogoWordmark />
            <p className="mt-3 max-w-xs text-sm text-zinc-500">
              The realtime team workspace — Kanban, presence, comments and a full activity timeline,
              end to end in TypeScript.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#how" className="hover:text-white">How it works</a></li>
              <li><Link href="/workspaces" className="hover:text-white">Open the app</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Project</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
              <li><Link href="/register" className="hover:text-white">Create account</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-zinc-600">
            <span>Liveboard — Realtime Team Workspace</span>
            <span>Full-stack portfolio · Next.js · Prisma · PostgreSQL · Socket.io · Pusher</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

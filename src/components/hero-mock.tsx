const COLUMNS: { label: string; count: number; cards: { title: string; chip: string; chipTone: string; meta: string; live?: boolean }[] }[] = [
  {
    label: 'To Do',
    count: 2,
    cards: [
      { title: 'Socket.io auth flow', chip: 'backend', chipTone: 'sky', meta: 'due Fri · RB' },
      { title: 'Empty states pass', chip: 'design', chipTone: 'violet', meta: 'MC' },
    ],
  },
  {
    label: 'In Progress',
    count: 1,
    cards: [
      { title: 'Presence channel for projects', chip: 'realtime', chipTone: 'indigo', meta: 'RN · due Today', live: true },
    ],
  },
  {
    label: 'In Review',
    count: 1,
    cards: [
      { title: 'Activity feed timeline', chip: 'feature', chipTone: 'amber', meta: 'JD · in review' },
    ],
  },
  {
    label: 'Done',
    count: 2,
    cards: [
      { title: 'Optimistic drag & drop', chip: 'core', chipTone: 'emerald', meta: 'RN · done' },
      { title: 'Notifications badge', chip: 'feature', chipTone: 'violet', meta: 'MC · done' },
    ],
  },
]

const CHIP_TONES: Record<string, string> = {
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

const AVATARS = [
  { initials: 'RN', gradient: 'from-indigo-400 to-violet-600' },
  { initials: 'MC', gradient: 'from-emerald-400 to-teal-600' },
  { initials: 'JD', gradient: 'from-amber-400 to-orange-600' },
  { initials: 'RB', gradient: 'from-sky-400 to-blue-600' },
]

const ACTIVITY = [
  { who: 'Ricardo', what: 'moved “Drag & drop” to Done', time: '2m' },
  { who: 'Maria', what: 'commented on “Activity feed”', time: '7m' },
  { who: 'John', what: 'assigned you “Notifications badge”', time: '18m' },
]

export function HeroMock() {
  return (
    <div
      aria-hidden
      className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)] ring-1 ring-indigo-500/20 backdrop-blur-xl"
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-zinc-950/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="mx-auto flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-3 py-1 text-[10px] text-zinc-500">
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 fill-zinc-500"><path d="M8 1a5 5 0 0 0-5 5v1H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V6a5 5 0 0 0-5-5Zm3 6H5V6a3 3 0 1 1 6 0v1Z" /></svg>
          liveboard.app/projects/website-redesign
        </div>
      </div>

      {/* app chrome */}
      <div className="border-b border-white/5 bg-zinc-950/30 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[10px] text-zinc-500">Acme</span>
            <span className="text-[10px] text-zinc-700">/</span>
            <span className="truncate text-[11px] font-medium text-zinc-200">Website Redesign</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {AVATARS.map((a) => (
                <span
                  key={a.initials}
                  className={`flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900 bg-gradient-to-br ${a.gradient} text-[7px] font-bold text-white`}
                >
                  {a.initials}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-0.5 pl-1.5 pr-2 text-[9px] font-semibold text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* columns + activity */}
      <div className="grid grid-cols-[1fr_120px] gap-2 p-3 sm:grid-cols-[1fr_150px]">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
              <div className="mb-1.5 flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{column.label}</span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[8px] font-semibold text-zinc-500">{column.count}</span>
              </div>
              <div className="space-y-1.5">
                {column.cards.map((card) => (
                  <div
                    key={card.title}
                    className={`rounded-lg border p-1.5 ${
                      card.live
                        ? 'border-indigo-500/50 bg-indigo-500/[0.07] ring-1 ring-indigo-500/30'
                        : 'border-white/5 bg-zinc-950/60'
                    }`}
                  >
                    <p className="text-[9px] font-medium leading-snug text-zinc-200">{card.title}</p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className={`rounded border px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wide ${CHIP_TONES[card.chipTone]}`}>
                        {card.chip}
                      </span>
                      {card.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />}
                    </div>
                    <p className="mt-1 text-[7px] text-zinc-500">{card.meta}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* activity */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
          <p className="mb-1.5 border-b border-white/5 pb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
            Activity
          </p>
          <ol className="space-y-1.5">
            {ACTIVITY.map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-indigo-400/70" />
                <div className="min-w-0">
                  <p className="text-[8px] leading-snug text-zinc-300">
                    <span className="font-semibold text-white">{item.who}</span> {item.what}
                  </p>
                  <p className="text-[7px] text-zinc-600">{item.time} ago</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-1 text-[8px] font-medium text-indigo-300">
            🔔 Maria assigned “Notifications badge” to you
          </div>
        </div>
      </div>
    </div>
  )
}

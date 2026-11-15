import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Liveboard — Realtime Team Workspace',
    template: '%s · Liveboard',
  },
  description:
    'Liveboard is the realtime team workspace: Kanban with instant sync, presence, comments, activity timeline and optimistic UI — built with Next.js, Socket.io/Pusher, Prisma and PostgreSQL.',
  applicationName: 'Liveboard',
  openGraph: {
    type: 'website',
    siteName: 'Liveboard',
    title: 'Liveboard — Realtime Team Workspace',
    description:
      'Kanban with instant realtime sync, presence, comments, activity timeline and optimistic UI.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

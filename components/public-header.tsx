import Link from 'next/link'
import { Logo } from './logo'

export function PublicHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" aria-label="Marketly home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-5 text-sm font-medium">
          <Link href="/stocks" className="text-muted-foreground hover:text-foreground">
            Stocks
          </Link>
          <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  )
}

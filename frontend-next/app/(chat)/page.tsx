import { Hash, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function ChatHome() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <MessageSquare className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Welcome to SlackClone</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Select a channel or direct message from the sidebar to start chatting
        with your team.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Quick links:
        </p>
        <div className="flex gap-2">
          <Link
            href="/channel/1"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Hash className="h-4 w-4" />
            general
          </Link>
          <Link
            href="/channel/2"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Hash className="h-4 w-4" />
            random
          </Link>
        </div>
      </div>
    </div>
  )
}

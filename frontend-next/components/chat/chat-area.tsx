"use client"

export function ChatArea({ channelId }: { channelId?: string }) {
  return (
    <div className="flex flex-col flex-1 bg-[#1a1d21]">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Select a channel to start chatting</p>
      </div>
    </div>
  )
}

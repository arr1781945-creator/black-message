"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hash, ChevronDown, ChevronRight, Plus, MessageSquare, Settings, Search, Bell, Users, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

const mockChannels = [
  { id: "1", name: "general",      is_private: false },
  { id: "2", name: "random",       is_private: false },
  { id: "3", name: "trading-desk", is_private: true  },
  { id: "4", name: "compliance",   is_private: true  },
  { id: "5", name: "vault-ops",    is_private: true  },
]

const mockDMs = [
  { id: "1", name: "Ahmad R.",  status: "online"  },
  { id: "2", name: "Sarah K.",  status: "online"  },
  { id: "3", name: "Budi S.",   status: "away"    },
  { id: "4", name: "Linda M.",  status: "offline" },
]

export function ChatSidebar() {
  const pathname = usePathname()
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)

  const statusColor = (s: string) =>
    s === "online" ? "bg-emerald-400" : s === "away" ? "bg-amber-400" : "bg-slate-600"

  return (
    <div className="flex flex-col h-full bg-[#1a1d21] border-r border-white/[0.08]">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] cursor-pointer hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">B</div>
          <span className="text-white font-bold text-[15px] truncate">BlackMess Bank</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>

      {/* Quick nav */}
      <div className="px-2 py-1 space-y-0.5">
        {[
          { icon: <MessageSquare className="w-4 h-4" />, label: "Threads" },
          { icon: <Bell className="w-4 h-4" />,          label: "Activity" },
          { icon: <Search className="w-4 h-4" />,        label: "Search" },
          { icon: <Users className="w-4 h-4" />,         label: "People" },
        ].map(item => (
          <button key={item.label} className="flex items-center gap-3 w-full px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-all">
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-white/[0.06] mx-3 my-1" />

      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {/* Channels */}
          <button
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="flex items-center gap-1.5 w-full px-3 py-1 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            {channelsOpen
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />}
            Channels
          </button>

          {channelsOpen && (
            <div className="space-y-0.5 mt-0.5">
              {mockChannels.map(ch => (
                <Link
                  key={ch.id}
                  href={`/chat/${ch.id}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                    pathname === `/chat/${ch.id}`
                      ? "bg-indigo-600/20 text-indigo-300"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {ch.is_private
                    ? <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    : <Hash className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate">{ch.name}</span>
                </Link>
              ))}
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 text-sm transition-all w-full">
                <Plus className="w-3.5 h-3.5" />
                Add channel
              </button>
            </div>
          )}

          <div className="h-px bg-white/[0.06] mx-1 my-2" />

          {/* DMs */}
          <button
            onClick={() => setDmsOpen(!dmsOpen)}
            className="flex items-center gap-1.5 w-full px-3 py-1 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            {dmsOpen
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />}
            Direct Messages
          </button>

          {dmsOpen && (
            <div className="space-y-0.5 mt-0.5">
              {mockDMs.map(dm => (
                <button
                  key={dm.id}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-5 h-5 rounded bg-indigo-700 flex items-center justify-center text-[9px] font-bold text-white">
                      {dm.name[0]}
                    </div>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1a1d21]", statusColor(dm.status))} />
                  </div>
                  <span className="truncate">{dm.name}</span>
                </button>
              ))}
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 text-sm transition-all w-full">
                <Plus className="w-3.5 h-3.5" />
                New DM
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-white/[0.08] p-3">
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold">U</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1d21] bg-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold truncate">User</p>
            <p className="text-slate-500 text-[11px]">Active</p>
          </div>
          <Settings className="w-4 h-4 text-slate-500 hover:text-white transition-colors flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}

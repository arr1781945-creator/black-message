"use client"

import { ReactNode } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { InfoPanel } from "@/components/chat/info-panel"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [showInfoPanel, setShowInfoPanel] = useState(false)

  return (
    <div className="h-screen w-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Sidebar - Channel & DM List */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="bg-sidebar"
        >
          <ChatSidebar />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Chat Area */}
        <ResizablePanel defaultSize={showInfoPanel ? 55 : 80} minSize={40}>
          <main className="flex h-full flex-col">{children}</main>
        </ResizablePanel>

        {/* Right Info Panel - Collapsible */}
        {showInfoPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <InfoPanel onClose={() => setShowInfoPanel(false)} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}

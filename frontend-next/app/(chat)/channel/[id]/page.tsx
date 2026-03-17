"use client"

import { use, useState } from "react"
import { ChatArea } from "@/components/chat/chat-area"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { InfoPanel } from "@/components/chat/info-panel"

// Mock channel names - replace with real data
const channelNames: Record<string, string> = {
  "1": "general",
  "2": "random",
  "3": "development",
  "4": "design",
}

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [showInfo, setShowInfo] = useState(false)
  const channelName = channelNames[id] || "channel"

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={showInfo ? 70 : 100} minSize={50}>
        <ChatArea
          channelId={id}
          channelName={channelName}
          onToggleInfo={() => setShowInfo(!showInfo)}
        />
      </ResizablePanel>

      {showInfo && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <InfoPanel onClose={() => setShowInfo(false)} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}

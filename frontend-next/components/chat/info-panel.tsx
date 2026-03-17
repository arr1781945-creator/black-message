"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X, Hash, Users, Pin, FileText, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface InfoPanelProps {
  onClose: () => void
}

export function InfoPanel({ onClose }: InfoPanelProps) {
  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Channel Details</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="about" className="flex-1">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger
            value="about"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            About
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Files
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="about" className="m-0 p-4">
            <div className="space-y-6">
              {/* Channel Name */}
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">general</h2>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm">
                  This is the general channel for team discussions and
                  announcements.
                </p>
              </div>

              {/* Created */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Created
                </h3>
                <p className="text-sm">January 1, 2024</p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Pin className="mr-2 h-4 w-4" />
                  Pinned Messages
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Channel Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="m-0 p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                3 Members
              </h3>
              {["John Doe", "Jane Smith", "Bob Wilson"].map((name) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="files" className="m-0 p-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No files have been shared yet
              </p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

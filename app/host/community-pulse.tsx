"use client"

import { Sparkles } from "lucide-react"

export function CommunityPulse() {
  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 shadow-sm text-primary-foreground">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4" />
        <h3 className="font-semibold text-sm">Community Pulse</h3>
      </div>
      <p className="text-sm leading-relaxed opacity-90">
        &quot;October vibes this week. Everyone is loving the new co-working lounge aesthetic!&quot;
      </p>
      <div className="mt-4 pt-4 border-t border-primary-foreground/20">
        <div className="flex items-center justify-between">
          <span className="text-xs opacity-80">Satisfaction Rate</span>
          <span className="text-lg font-bold">96%</span>
        </div>
        <div className="mt-2 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
          <div className="h-full w-[96%] bg-primary-foreground rounded-full" />
        </div>
      </div>
    </div>
  )
}

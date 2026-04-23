"use client"

import { TrendingUp } from "lucide-react"

interface RoomStatCard {
  label: string
  value: string | number
  unit?: string
  change?: string
  icon?: React.ReactNode
}

const stats: RoomStatCard[] = [
  {
    label: "Active Inventory",
    value: 24,
    change: "+2 rooms",
  },
  {
    label: "Pending",
    value: "08",
    change: "in review",
  },
  {
    label: "Occupancy Rate",
    value: "86%",
    change: "+5% from last month",
  },
  {
    label: "Total Revenue",
    value: "$14.2k",
    change: "this month",
  },
]

export function RoomStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            {stat.label}
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">{stat.value}</span>
          </div>
          {stat.change && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

"use client"

import { BedDouble, CalendarCheck, DollarSign } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  change?: string
  changeType?: "positive" | "negative"
  sublabel?: string
  avatars?: string[]
  action?: string
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  change,
  changeType = "positive",
  sublabel,
  avatars,
  action,
}: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} mb-4`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        {change && (
          <span
            className={`text-xs font-medium ${
              changeType === "positive" ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {change}
          </span>
        )}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
      {avatars && (
        <div className="flex items-center mt-3">
          <div className="flex -space-x-2">
            {avatars.map((src, i) => (
              <Avatar key={i} className="h-7 w-7 border-2 border-card">
                <AvatarImage src={src} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      )}
      {action && (
        <button className="mt-3 text-xs text-primary font-medium hover:underline">
          {action}
        </button>
      )}
    </div>
  )
}

export function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        icon={<BedDouble className="h-6 w-6 text-primary" />}
        iconBg="bg-primary/10"
        label="Total Rooms"
        value="42"
        change="+3 New"
        changeType="positive"
        avatars={[
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face",
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face",
        ]}
        action="See all"
      />
      <StatCard
        icon={<CalendarCheck className="h-6 w-6 text-accent" />}
        iconBg="bg-accent/10"
        label="Total Bookings"
        value="158"
        sublabel="this month"
        avatars={[
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=face",
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face",
        ]}
      />
      <StatCard
        icon={<DollarSign className="h-6 w-6 text-emerald-600" />}
        iconBg="bg-emerald-100"
        label="Total Revenue"
        value="$24.8k"
        change="+12%"
        changeType="positive"
        action="Details Next Thursday"
      />
    </div>
  )
}

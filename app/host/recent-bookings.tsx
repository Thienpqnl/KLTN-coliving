"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Booking {
  id: string
  name: string
  studio: string
  dates: string
  avatar: string
  status: "Pending" | "Confirmed" | "Cancelled"
}

const bookings: Booking[] = [
  {
    id: "1",
    name: "Clara Oswald",
    studio: "Studio A5",
    dates: "6 months",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    status: "Pending",
  },
  {
    id: "2",
    name: "Danny Pink",
    studio: "Suite 12",
    dates: "12 months",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    status: "Confirmed",
  },
  {
    id: "3",
    name: "Sarah Smith",
    studio: "Suite 26",
    dates: "6 months",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    status: "Cancelled",
  },
]

function StatusBadge({ status }: { status: Booking["status"] }) {
  const styles = {
    Pending: "bg-primary/10 text-primary",
    Confirmed: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-600",
  }

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}

export function RecentBookings() {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <h3 className="font-semibold text-foreground mb-4">Recent Bookings</h3>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={booking.avatar} />
              <AvatarFallback>{booking.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{booking.name}</p>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {booking.studio} · {booking.dates}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-4 pt-4 border-t border-border text-xs text-primary font-medium hover:underline">
        View All Residents
      </button>
    </div>
  )
}

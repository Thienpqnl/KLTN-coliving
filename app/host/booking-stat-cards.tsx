import { Calendar, TrendingUp, Users } from "lucide-react"

export function BookingStatCards() {
  const stats = [
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Pending Bookings",
      value: "12",
      color: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Current Occupancy",
      value: "84%",
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Projected Revenue",
      value: "$14,200",
      color: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start justify-between mb-3">
            <div className={`${stat.color} p-2.5 rounded-lg`}>
              <div className={`${stat.iconColor}`}>{stat.icon}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
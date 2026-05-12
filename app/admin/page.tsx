"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Users, Home, TrendingUp, AlertCircle } from "lucide-react"

interface UserStats {
  total: number
  tenants: number
  landlords: number
  locked: number
  deleted: number
  newThisMonth: number
  byMonth: Array<{ month: string; count: number }>
}

interface RoomStats {
  total: number
  available: number
  occupied: number
  pending: number
  hidden: number
  revenue: {
    total: number
    completedBookings: number
  }
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [userRes, roomRes] = await Promise.all([
          fetch("/api/admin/stats/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/stats/rooms", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!userRes.ok || !roomRes.ok) throw new Error("Failed to fetch stats")

        const userData = await userRes.json()
        const roomData = await roomRes.json()

        setUserStats(userData)
        setRoomStats(roomData)
        setError("")
      } catch (err) {
        setError("Failed to load statistics")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchStats()
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* User Statistics Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">User Statistics</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {userStats && (
            <>
              <StatCard label="Total Users" value={userStats.total} color="blue" />
              <StatCard label="Active Tenants" value={userStats.tenants} color="green" />
              <StatCard label="Active Landlords" value={userStats.landlords} color="purple" />
              <StatCard label="Locked" value={userStats.locked} color="orange" />
              <StatCard label="Deleted" value={userStats.deleted} color="red" />
              <StatCard label="New This Month" value={userStats.newThisMonth} color="emerald" />
            </>
          )}
        </div>
      </section>

      {/* Room Statistics Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Home className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Room Statistics</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {roomStats && (
            <>
              <StatCard label="Total Rooms" value={roomStats.total} color="blue" />
              <StatCard label="Available" value={roomStats.available} color="green" />
              <StatCard label="Occupied" value={roomStats.occupied} color="purple" />
              <StatCard label="Pending" value={roomStats.pending} color="yellow" />
              <StatCard label="Hidden" value={roomStats.hidden} color="gray" />
            </>
          )}
        </div>
      </section>

      {/* Revenue Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Revenue Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roomStats && (
            <>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-6">
                <p className="text-sm text-emerald-700 font-medium">Total Revenue</p>
                <p className="text-4xl font-bold text-emerald-900 mt-3">
                  ${(roomStats.revenue.total / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                <p className="text-sm text-blue-700 font-medium">Completed Bookings</p>
                <p className="text-4xl font-bold text-blue-900 mt-3">
                  {roomStats.revenue.completedBookings}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Monthly Trend */}
      {userStats && userStats.byMonth.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">New Users Trend</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Month</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">New Users</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Growth Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userStats.byMonth.map((item) => (
                    <tr key={item.month} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground font-medium">{item.month}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{item.count}</td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-xs bg-secondary rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.max((item.count / 100) * 100, 5)}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  color?: "blue" | "green" | "red" | "orange" | "yellow" | "purple" | "emerald" | "gray"
}

function StatCard({ label, value, color = "blue" }: StatCardProps) {
  const colorConfigs = {
    blue: {
      bg: "from-blue-50 to-blue-100",
      border: "border-blue-200",
      text: "text-blue-700",
      darkText: "text-blue-900",
    },
    green: {
      bg: "from-green-50 to-green-100",
      border: "border-green-200",
      text: "text-green-700",
      darkText: "text-green-900",
    },
    red: {
      bg: "from-red-50 to-red-100",
      border: "border-red-200",
      text: "text-red-700",
      darkText: "text-red-900",
    },
    orange: {
      bg: "from-orange-50 to-orange-100",
      border: "border-orange-200",
      text: "text-orange-700",
      darkText: "text-orange-900",
    },
    yellow: {
      bg: "from-yellow-50 to-yellow-100",
      border: "border-yellow-200",
      text: "text-yellow-700",
      darkText: "text-yellow-900",
    },
    purple: {
      bg: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      text: "text-purple-700",
      darkText: "text-purple-900",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100",
      border: "border-emerald-200",
      text: "text-emerald-700",
      darkText: "text-emerald-900",
    },
    gray: {
      bg: "from-gray-50 to-gray-100",
      border: "border-gray-200",
      text: "text-gray-700",
      darkText: "text-gray-900",
    },
  }

  const config = colorConfigs[color]

  return (
    <div className={`bg-gradient-to-br ${config.bg} ${config.border} border rounded-xl p-4 text-center`}>
      <p className={`text-xs ${config.text} font-medium`}>{label}</p>
      <p className={`text-3xl font-bold ${config.darkText} mt-3`}>{value}</p>
    </div>
  )
}


"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { BarChart3, AlertCircle } from "lucide-react"

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

export default function Reports() {
  const { token } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStats = async () => {
      try {
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
      } catch (err) {
        setError("Failed to load reports")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      setLoading(true)
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
      {/* User Report */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">User Report</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {userStats && (
            <>
              <ReportCard
                label="Total Users"
                value={userStats.total}
                color="blue"
              />
              <ReportCard
                label="Active Tenants"
                value={userStats.tenants}
                color="green"
              />
              <ReportCard
                label="Active Landlords"
                value={userStats.landlords}
                color="purple"
              />
              <ReportCard
                label="Locked Accounts"
                value={userStats.locked}
                color="orange"
              />
            </>
          )}
        </div>

        {userStats && (
          <>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Monthly New Users
            </h3>
            <div className="overflow-x-auto mb-6 bg-secondary rounded-lg">
              <table className="w-full">
                <thead className="bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      New Users
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userStats.byMonth.map((item) => (
                    <tr key={item.month} className="hover:bg-secondary transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.month}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">
                        {item.count}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="w-full bg-border rounded-full h-2"
                          style={{
                            maxWidth: "100px",
                          }}
                        >
                          <div
                            className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full"
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
          </>
        )}
      </section>

      {/* Room Report */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Room Report</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {roomStats && (
            <>
              <ReportCard
                label="Total Rooms"
                value={roomStats.total}
                color="blue"
              />
              <ReportCard
                label="Available"
                value={roomStats.available}
                color="green"
              />
              <ReportCard
                label="Occupied"
                value={roomStats.occupied}
                color="purple"
              />
              <ReportCard
                label="Pending"
                value={roomStats.pending}
                color="yellow"
              />
              <ReportCard label="Hidden" value={roomStats.hidden} />
            </>
          )}
        </div>

        {roomStats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Total Revenue</p>
              <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100 mt-3">
                ${(roomStats.revenue.total / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Completed Bookings</p>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mt-3">
                {roomStats.revenue.completedBookings}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Summary */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userStats && roomStats && (
            <>
              <div className="border-l-4 border-primary pl-4 py-2">
                <p className="text-sm text-muted-foreground">User Growth</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {userStats.newThisMonth}
                </p>
                <p className="text-xs text-muted-foreground mt-1">new this month</p>
              </div>
              <div className="border-l-4 border-emerald-500 pl-4 py-2">
                <p className="text-sm text-muted-foreground">Room Utilization</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {((roomStats.occupied / roomStats.total) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">occupied</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <p className="text-sm text-muted-foreground">Average Revenue</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  $
                  {roomStats.revenue.completedBookings > 0
                    ? (
                        roomStats.revenue.total /
                        roomStats.revenue.completedBookings
                      ).toFixed(0)
                    : "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per booking</p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

interface ReportCardProps {
  label: string
  value: string | number
  color?: "blue" | "green" | "purple" | "orange" | "yellow" | "red"
}

function ReportCard({
  label,
  value,
  color = "blue",
}: ReportCardProps) {
  const colorConfigs = {
    blue: {
      bg: "from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-400",
      darkText: "text-blue-900 dark:text-blue-100",
    },
    green: {
      bg: "from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-400",
      darkText: "text-green-900 dark:text-green-100",
    },
    red: {
      bg: "from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      darkText: "text-red-900 dark:text-red-100",
    },
    orange: {
      bg: "from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-400",
      darkText: "text-orange-900 dark:text-orange-100",
    },
    yellow: {
      bg: "from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-400",
      darkText: "text-yellow-900 dark:text-yellow-100",
    },
    purple: {
      bg: "from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-700 dark:text-purple-400",
      darkText: "text-purple-900 dark:text-purple-100",
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

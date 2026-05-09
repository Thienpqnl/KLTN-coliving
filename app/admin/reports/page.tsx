"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

interface UserStats {
  total: number;
  tenants: number;
  landlords: number;
  locked: number;
  deleted: number;
  newThisMonth: number;
  byMonth: Array<{ month: string; count: number }>;
}

interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  pending: number;
  hidden: number;
  revenue: {
    total: number;
    completedBookings: number;
  };
}

export default function Reports() {
  const { token } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        ]);

        if (!userRes.ok || !roomRes.ok) throw new Error("Failed to fetch stats");

        const userData = await userRes.json();
        const roomData = await roomRes.json();

        setUserStats(userData);
        setRoomStats(roomData);
      } catch (err) {
        setError("Failed to load reports");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      setLoading(true);
      fetchStats();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Report */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">👥 User Report</h3>

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
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Monthly New Users
            </h4>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Month
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      New Users
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userStats.byMonth.map((item, idx) => (
                    <tr key={item.month} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {item.month}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                        {item.count}
                      </td>
                      <td className="px-4 py-2">
                        <div
                          className="w-full bg-gray-200 rounded-full h-2"
                          style={{
                            maxWidth: "100px",
                          }}
                        >
                          <div
                            className="bg-blue-500 h-2 rounded-full"
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
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">🏠 Room Report</h3>

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
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">Total Revenue</p>
              <p className="text-3xl font-bold text-green-700 mt-2">
                ${(roomStats.revenue.total / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">Completed Bookings</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">
                {roomStats.revenue.completedBookings}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Summary */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userStats && roomStats && (
            <>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-600">User Growth</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {userStats.newThisMonth} new this month
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-sm text-gray-600">Room Utilization</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {((roomStats.occupied / roomStats.total) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-sm text-gray-600">Average Revenue/Booking</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  $
                  {roomStats.revenue.completedBookings > 0
                    ? (
                        roomStats.revenue.total /
                        roomStats.revenue.completedBookings
                      ).toFixed(0)
                    : "0"}
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

interface ReportCardProps {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "purple" | "orange" | "yellow" | "red";
}

function ReportCard({
  label,
  value,
  color = "blue",
}: ReportCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 text-center`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color].split(" ")[2]} mt-2`}>
        {value}
      </p>
    </div>
  );
}

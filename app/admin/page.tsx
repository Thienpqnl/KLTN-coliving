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

export default function AdminDashboard() {
  const { token } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
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
        setError("");
      } catch (err) {
        setError("Failed to load statistics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
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
      {/* User Statistics Section */}
      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          📊 User Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {userStats && (
            <>
              <StatCard label="Total Users" value={userStats.total} />
              <StatCard label="Tenants" value={userStats.tenants} />
              <StatCard label="Landlords" value={userStats.landlords} />
              <StatCard
                label="Locked"
                value={userStats.locked}
                color="orange"
              />
              <StatCard
                label="Deleted"
                value={userStats.deleted}
                color="red"
              />
              <StatCard
                label="New This Month"
                value={userStats.newThisMonth}
                color="green"
              />
            </>
          )}
        </div>
      </section>

      {/* Room Statistics Section */}
      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          🏠 Room Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {roomStats && (
            <>
              <StatCard label="Total Rooms" value={roomStats.total} />
              <StatCard
                label="Available"
                value={roomStats.available}
                color="green"
              />
              <StatCard
                label="Occupied"
                value={roomStats.occupied}
                color="blue"
              />
              <StatCard
                label="Pending"
                value={roomStats.pending}
                color="yellow"
              />
              <StatCard label="Hidden" value={roomStats.hidden} />
            </>
          )}
        </div>
      </section>

      {/* Revenue Section */}
      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Revenue</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roomStats && (
            <>
              <StatCard
                label="Total Revenue"
                value={`$${(roomStats.revenue.total / 1000).toFixed(1)}K`}
                color="green"
              />
              <StatCard
                label="Completed Bookings"
                value={roomStats.revenue.completedBookings}
              />
            </>
          )}
        </div>
      </section>

      {/* Monthly Users Chart */}
      {userStats && userStats.byMonth.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📈 New Users Trend
          </h3>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Month
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      New Users
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userStats.byMonth.map((item) => (
                    <tr key={item.month} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {item.month}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                        {item.count}
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
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "red" | "orange" | "yellow";
}

function StatCard({ label, value, color = "blue" }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    orange: "bg-orange-50 border-orange-200",
    yellow: "bg-yellow-50 border-yellow-200",
  };

  const textColorClasses = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
    orange: "text-orange-700",
    yellow: "text-yellow-700",
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-lg p-4 text-center`}
    >
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${textColorClasses[color]} mt-2`}>
        {value}
      </p>
    </div>
  );
}

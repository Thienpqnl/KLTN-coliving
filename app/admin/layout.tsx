"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const menuItems = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "User Management", path: "/admin/users", icon: "👥" },
    { label: "Reports", path: "/admin/reports", icon: "📈" },
    { label: "Audit Logs", path: "/admin/logs", icon: "📝" },
  ];

  return (
    <AdminProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-gray-900 text-white transition-all duration-300 shadow-lg`}
        >
          <div className="p-6 flex items-center justify-between">
            <h1 className={`font-bold text-xl ${!sidebarOpen && "hidden"}`}>
              Admin Panel
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-gray-700 p-2 rounded"
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          <nav className="mt-8 space-y-2 px-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-4 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="bg-white shadow">
            <div className="px-8 py-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage users, rooms, and system statistics
              </p>
            </div>
          </div>
          <div className="p-8">{children}</div>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

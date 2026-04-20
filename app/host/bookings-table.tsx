"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface Booking {
  id: string
  userName: string
  userInitial: string
  userImage?: string
  roomName: string
  bookingDate: string
  status: "pending" | "confirmed" | "cancelled"
  email: string
}

const bookings: Booking[] = [
  {
    id: "1",
    userName: "Elena Valdez",
    userInitial: "EV",
    userImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    roomName: "The San-Drenched Studio",
    bookingDate: "Oct 12 - Oct 28, 2024",
    status: "pending",
    email: "elena@example.com",
  },
  {
    id: "2",
    userName: "Marcus Thomas",
    userInitial: "MT",
    userImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    roomName: "Cult & Iron Suite",
    bookingDate: "Nov 02 - Nov 15, 2024",
    status: "confirmed",
    email: "marcus@example.com",
  },
  {
    id: "3",
    userName: "Simona Miller",
    userInitial: "SM",
    userImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Simona",
    roomName: "The Architect&apos;s Nook",
    bookingDate: "Oct 20 - Jan 08, 2025",
    status: "pending",
    email: "simona@example.com",
  },
]

export function BookingsTable() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const itemsPerPage = 3

  const filteredBookings = bookings.filter((booking) =>
    booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.roomName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const displayedBookings = filteredBookings.slice(startIdx, startIdx + itemsPerPage)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700"
      case "confirmed":
        return "bg-emerald-100 text-emerald-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div>
      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or room..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            Filter
          </button>
          <button className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-border bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">USER NAME</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ROOM NAME</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">BOOKING DATE</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">STATUS</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ACTIONS</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {displayedBookings.map((booking) => (
            <div key={booking.id} className="grid grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors">
              {/* User */}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={booking.userImage} alt={booking.userName} />
                  <AvatarFallback>{booking.userInitial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{booking.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{booking.email}</p>
                </div>
              </div>

              {/* Room */}
              <div>
                <p className="text-sm font-medium text-foreground">{booking.roomName}</p>
              </div>

              {/* Date */}
              <div>
                <p className="text-sm text-foreground">{booking.bookingDate}</p>
              </div>

              {/* Status */}
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {booking.status === "pending" && (
                  <>
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 transition-colors">
                      APPROVE
                    </button>
                    <button className="px-3 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded hover:bg-accent/90 transition-colors">
                      REJECT
                    </button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <button className="p-1.5 hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {startIdx + 1}-{Math.min(startIdx + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} Pending Bookings
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 hover:bg-secondary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-foreground"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 hover:bg-secondary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
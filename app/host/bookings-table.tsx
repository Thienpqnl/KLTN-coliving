'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Search, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { bookingClientService, Booking } from '@/lib/services/booking-client.service'

export function BookingsTable() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const itemsPerPage = 5

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const res = await bookingClientService.getAll()
      setBookings(res)
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (bookingId: string) => {
    try {
      setActionLoading(bookingId)
      await bookingClientService.approve(bookingId)
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'approved' } : b)
      )
    } catch (error) {
      console.error('Failed to approve booking:', error)
      alert('Failed to approve booking')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (bookingId: string) => {
    try {
      setActionLoading(bookingId)
      await bookingClientService.reject(bookingId)
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b)
      )
    } catch (error) {
      console.error('Failed to reject booking:', error)
      alert('Failed to reject booking')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700'
      case 'approved':
        return 'bg-emerald-100 text-emerald-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      case 'completed':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredBookings = bookings.filter(booking =>
    booking.id.includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const displayedBookings = filteredBookings.slice(startIdx, startIdx + itemsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No bookings yet</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-border bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-in</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-out</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {displayedBookings.map((booking) => (
            <div key={booking.id} className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors">
              {/* Room ID */}
              <div>
                <p className="text-sm font-medium text-foreground">Room</p>
                <p className="text-xs text-muted-foreground">{booking.roomId}</p>
              </div>

              {/* Check-in */}
              <div>
                <p className="text-sm text-foreground">
                  {new Date(booking.startDate).toLocaleDateString()}
                </p>
              </div>

              {/* Check-out */}
              <div>
                <p className="text-sm text-foreground">
                  {new Date(booking.endDate).toLocaleDateString()}
                </p>
              </div>

              {/* Price */}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  ${booking.totalPrice.toFixed(2)}
                </p>
              </div>

              {/* Status */}
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {booking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === booking.id ? (
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                      ) : null}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {startIdx + 1}-{Math.min(startIdx + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-secondary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => currentPage - 1 + i).map((page) => (
              page > 0 && page <= totalPages && (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  {page}
                </button>
              )
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
      )}
    </div>
  )
}
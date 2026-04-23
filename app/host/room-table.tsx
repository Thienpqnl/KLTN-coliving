'use client'

import { useEffect, useState } from 'react'
import { Edit2, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import Link from 'next/link'

interface Room {
  id: string
  title: string
  description: string
  price: number
  address: string
  image: string[]
  status: 'available' | 'occupied'
  amenityIds: string[]
  createdAt: string
}

const getStatusColor = (status: string) => {
  return status === 'available'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
}


export function RoomsTable() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<Room[]>('/rooms')
      setRooms(res)
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) {
      return
    }

    try {
      setDeleting(roomId)
      await apiClient.delete(`/rooms/${roomId}`)
      setRooms(prev => prev.filter(room => room.id !== roomId))
    } catch (err) {
      console.error('Failed to delete room:', err)
      alert('Failed to delete room')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
        <p className="text-muted-foreground mb-6">No rooms created yet</p>
        <Link href="/room-management/add-room">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Room
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="grid grid-cols-12 gap-4 items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Room Name</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Address</div>
          <div className="col-span-2">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="px-6 py-4 hover:bg-muted/20 transition-colors"
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Room Name with Image */}
              <div className="col-span-4 flex items-center gap-3">
                {room.image?.length > 0 && (
                 <img
  src={room.image?.[0] || "https://via.placeholder.com/150"}
  alt={room.title}
  className="h-12 w-12 rounded-xl object-cover"
/>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">{room.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{room.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="col-span-2 text-sm font-semibold text-foreground">
                ${room.price.toFixed(2)}
              </div>

              {/* Status */}
              <div className="col-span-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                    room.status
                  )}`}
                >
                  {room.status === 'available' ? 'Available' : 'Occupied'}
                </span>
              </div>

              {/* Address */}
              <div className="col-span-2 text-sm text-muted-foreground truncate">
                {room.address}
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center gap-2">
                <Link href={`/room-management/edit-room?id=${room.id}`}>
                  <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(room.id)}
                  disabled={deleting === room.id}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-600 disabled:opacity-50"
                >
                  {deleting === room.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Footer */}
      <div className="px-6 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground flex justify-between items-center">
        <span>Showing {rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
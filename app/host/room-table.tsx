"use client"

import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Room {
  id: string
  name: string
  image: string
  price: string
  status: "confirmed" | "ongoing" | "pending"
  occupant?: string
}

const rooms: Room[] = [
  {
    id: "1",
    name: "The Island nook",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&h=200&fit=crop",
    price: "$1,650",
    status: "confirmed",
    occupant: "Sarah Mitchell",
  },
  {
    id: "2",
    name: "Upright Alcove",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop",
    price: "$2,400",
    status: "ongoing",
    occupant: "Alex Turner",
  },
  {
    id: "3",
    name: "The Transparent Lounge",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
    price: "$1,650",
    status: "confirmed",
    occupant: "Emma Davis",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700"
    case "ongoing":
      return "bg-amber-100 text-amber-700"
    case "pending":
      return "bg-slate-100 text-slate-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

export function RoomsTable() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="grid grid-cols-12 gap-4 items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Room Name</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Occupant</div>
          <div className="col-span-1">Actions</div>
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
                <img
                  src={room.image}
                  alt={room.name}
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <span className="font-medium text-foreground text-sm">{room.name}</span>
              </div>

              {/* Price */}
              <div className="col-span-2 text-sm font-semibold text-foreground">
                {room.price}
              </div>

              {/* Status */}
              <div className="col-span-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                    room.status
                  )}`}
                >
                  {room.status}
                </span>
              </div>

              {/* Occupant */}
              <div className="col-span-3 text-sm text-muted-foreground">
                {room.occupant}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center gap-2">
                  <Link href="/room-management/edit-room">
                  <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </Link>
                <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Footer */}
      <div className="px-6 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground flex justify-between items-center">
        <span>Showing 1 - 3 of 24 results</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 hover:bg-secondary rounded transition-colors">
            ← Previous
          </button>
          <button className="px-3 py-1 hover:bg-secondary rounded transition-colors">
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

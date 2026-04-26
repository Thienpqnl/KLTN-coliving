// lib/services/room-client.service.ts
import { apiClient } from '@/lib/api/client'

export interface Room {
  id: string
  title: string
  description: string
  price: number
  address: string
  image: string
  status: 'AVAILABLE' | 'OCCUPIED'
  amenityIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoomPayload {
  title: string
  description: string
  price: number
  address: string
  image?: string
  status?: 'AVAILABLE' | 'OCCUPIED'
  amenityIds?: string[]
}

export interface UpdateRoomPayload extends Partial<CreateRoomPayload> {}

export const roomClientService = {
  // Get all rooms
  getAll: async (): Promise<Room[]> => {
    return apiClient.get<Room[]>('/rooms')
  },

  // Get room by ID
  getById: async (id: string): Promise<Room> => {
    return apiClient.get<Room>(`/rooms/${id}`)
  },

  // Create room
  create: async (payload: CreateRoomPayload): Promise<Room> => {
    return apiClient.post<Room>('/rooms-upload/create', payload)
  },

  // Update room
  update: async (id: string, payload: UpdateRoomPayload): Promise<Room> => {
    return apiClient.put<Room>(`/rooms-upload/${id}`, payload)
  },

  // Delete room
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/rooms-upload/${id}`)
  },

  // Get available rooms
  getAvailable: async (startDate: string, endDate: string): Promise<Room[]> => {
    return apiClient.get<Room[]>(
      `/rooms/available?startDate=${startDate}&endDate=${endDate}`
    )
  },

  // Get room stats
  getStats: async (id: string) => {
    return apiClient.get(`/rooms/${id}/stats`)
  },

  // Get room reviews
  getReviews: async (id: string) => {
    return apiClient.get(`/rooms/${id}/reviews`)
  },

  // Get room bookings
  getBookings: async (id: string) => {
    return apiClient.get(`/rooms/${id}/bookings`)
  },
}

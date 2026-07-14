// lib/services/booking-client.service.ts
import { apiClient } from '@/lib/api/client'

export interface Booking {
  id: string
  roomId: string
  userId: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  totalPrice?: number
  user?: {
    id: string
    name?: string
    fullName?: string
    email?: string
    phone?: string
  }
  room?: {
    id: string
    title: string
    priceText?: string | null
    priceValue?: number | string | null
    address?: string
  }
  contract?: {
    id: string
    status: string
  } | null
  createdAt: string
  updatedAt: string
  cancelledAt?: string | null
  cancelledById?: string | null
  cancellationActor?: string | null
  cancellationReason?: string | null
}

export interface CreateBookingPayload {
  roomId: string
  startDate: string
  endDate: string
}

export interface UpdateBookingPayload {
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
}

export const bookingClientService = {
  // Get all bookings
  getAll: async (): Promise<Booking[]> => {
    return apiClient.get<Booking[]>('/bookings')
  },

  getHostAll: async (): Promise<Booking[]> => {
    return apiClient.get<Booking[]>('/host/bookings')
  },

  // Get booking by ID
  getById: async (id: string): Promise<Booking> => {
    return apiClient.get<Booking>(`/bookings/${id}`)
  },

  // Create booking
  create: async (payload: CreateBookingPayload): Promise<Booking> => {
    return apiClient.post<Booking>('/bookings', payload)
  },

  // Update booking (approve/reject/etc)
  update: async (id: string, payload: UpdateBookingPayload): Promise<Booking> => {
    return apiClient.put<Booking>(`/bookings/${id}`, payload)
  },

  // Delete/Cancel booking
  cancel: async (id: string, reason: string): Promise<Booking> => {
    return apiClient.delete<Booking>(`/bookings/${id}`, { reason })
  },

  // Get booking stats
  getStats: async (roomId?: string) => {
    const url = roomId ? `/bookings/stats?roomId=${roomId}` : '/bookings/stats'
    return apiClient.get(url)
  },

  getHostStats: async () => {
    return apiClient.get('/host/bookings/stats')
  },

  // Approve booking
  approve: async (id: string): Promise<Booking> => {
    return apiClient.put<Booking>(`/bookings/${id}`, { status: 'CONFIRMED' })
  },

  // Reject booking
  reject: async (id: string): Promise<Booking> => {
    return apiClient.put<Booking>(`/bookings/${id}`, { status: 'CANCELLED' })
  },
}

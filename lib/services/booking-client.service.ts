// lib/services/booking-client.service.ts
import { apiClient } from '@/lib/api/client'

export interface Booking {
  id: string
  roomId: string
  userId: string
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  totalPrice: number
  createdAt: string
  updatedAt: string
}

export interface CreateBookingPayload {
  roomId: string
  startDate: string
  endDate: string
}

export interface UpdateBookingPayload {
  status?: 'pending' | 'approved' | 'rejected' | 'completed'
}

export const bookingClientService = {
  // Get all bookings
  getAll: async (): Promise<Booking[]> => {
    return apiClient.get<Booking[]>('/bookings')
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
  cancel: async (id: string): Promise<void> => {
    await apiClient.delete(`/bookings/${id}`)
  },

  // Get booking stats
  getStats: async (roomId?: string) => {
    const url = roomId ? `/bookings/stats?roomId=${roomId}` : '/bookings/stats'
    return apiClient.get(url)
  },

  // Approve booking
  approve: async (id: string): Promise<Booking> => {
    return apiClient.put<Booking>(`/bookings/${id}`, { status: 'approved' })
  },

  // Reject booking
  reject: async (id: string): Promise<Booking> => {
    return apiClient.put<Booking>(`/bookings/${id}`, { status: 'rejected' })
  },
}

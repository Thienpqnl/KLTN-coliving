// lib/services/amenity-client.service.ts
import { apiClient } from '@/lib/api/client'

export interface Amenity {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const amenityClientService = {
  // Get all amenities
  getAll: async (): Promise<Amenity[]> => {
    return apiClient.get<Amenity[]>('/amenities')
  },

  // Get amenity by ID
  getById: async (id: string): Promise<Amenity> => {
    return apiClient.get<Amenity>(`/amenities/${id}`)
  },

  // Create amenity
  create: async (name: string): Promise<Amenity> => {
    return apiClient.post<Amenity>('/amenities', { name })
  },

  // Update amenity
  update: async (id: string, name: string): Promise<Amenity> => {
    return apiClient.put<Amenity>(`/amenities/${id}`, { name })
  },

  // Delete amenity
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/amenities/${id}`)
  },
}

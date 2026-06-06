import { apiClient } from '@/lib/api/client'

export interface Occupant {
  id: string;
  status: string;
  joinedAt: string;
  terminatedAt?: string;
  terminationReason?: string;
  notes?: string;
  user: {
    id: string;
    email: string;
    name: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    gender?: string;
    birthDate?: string;
    address?: string;
  };
}

export interface OccupantDetails extends Occupant {
  room: {
    id: string;
    title: string;
    address: string;
    priceValue: number;
  };
}

export interface OccupancyStats {
  activeOccupants: number;
  totalOccupants: number;
  inactiveOccupants: number;
  occupancyRate: number;
}

export const occupancyClient = {
  // Get all occupants of a room
  getRoomOccupants: async (roomId: string): Promise<Occupant[]> => {
    return apiClient.get(`/host/occupancy/rooms/${roomId}`);
  },

  // Get occupancy history
  getOccupancyHistory: async (roomId: string): Promise<Occupant[]> => {
    return apiClient.get(`/host/occupancy/rooms/${roomId}/history`);
  },

  // Get occupant details
  getOccupantDetails: async (occupancyId: string): Promise<OccupantDetails> => {
    return apiClient.get(`/host/occupancy/occupants/${occupancyId}`);
  },

  // Add new occupant
  addOccupant: async (
    roomId: string,
    userId: string,
    notes?: string
  ): Promise<Occupant> => {
    return apiClient.post(`/host/occupancy`, {
      roomId,
      userId,
      notes,
    });
  },

  // Terminate occupancy
  terminateOccupancy: async (
    occupancyId: string,
    reason: string
  ): Promise<Occupant> => {
    return apiClient.put(`/host/occupancy/occupants/${occupancyId}`, {
      reason,
    });
  },

  // Get occupancy statistics
  getOccupancyStats: async (roomId: string): Promise<OccupancyStats> => {
    return apiClient.get(`/host/occupancy?roomId=${roomId}`);
  },
};

import { apiClient } from '@/lib/api/client';

export interface SharedResource {
  id: string;
  name: string;
  type: 'EQUIPMENT' | 'SPACE';
  status: 'ACTIVE' | 'MAINTENANCE';
  requiresApproval: boolean;
  maxDurationMinutes: number;
  description?: string;
  resourceBookings: ResourceBooking[];
}

export interface ResourceBookingInput {
  resourceId: string;
  title: string;
  startTime: string;
  endTime: string;
}

export interface ResourceBooking {
  id: string;
  resourceId: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  user?: {
    name: string;
    fullName: string;
  };
}
export interface HostRoom {
  id: string;
  title: string;
  roomNumber?: string;
}
export interface CreateResourceInput {
  name: string;
  description?: string;
  type: 'EQUIPMENT' | 'SPACE';
  status: 'ACTIVE' | 'BUSY' |'MAINTENANCE';
  requiresApproval: boolean;
  maxDurationMinutes: number;
  roomId: string;
}

export interface SharedActivity {
  id: string;
  type: 'ANNOUNCEMENT' | 'DUTY' | 'ISSUE';
  title: string;
  content: string;
  eventDate?: string;
  imageUrl?: string;
  assignee?: {
    fullName: string;
  } | null;
  creator?: {
    fullName: string;
  };
}

export const sharedSpaceClientService = {
  getCalendar: async (roomId: string): Promise<SharedResource[]> => {
    return apiClient.get<SharedResource[]>(`/rooms/${roomId}/shared-resources/bookings`);
  },

  createBooking: async (roomId: string, payload: ResourceBookingInput): Promise<ResourceBooking> => {
    const res = await fetch(`/api/rooms/${roomId}/shared-resources/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi ${res.status}: Không thể đặt tài nguyên`);
      }
      throw new Error(`Server trả về lỗi ${res.status} (không phải JSON). Vui lòng kiểm tra lại API route.`);
    }

    return res.json();
  },

  updateBookingStatus: async (bookingId: string, status: 'APPROVED' | 'CANCELLED'): Promise<ResourceBooking> => {
    return apiClient.put<ResourceBooking>(`/shared-resources/bookings/${bookingId}`, { status });
  },

  getActivities: async (roomId: string): Promise<SharedActivity[]> => {
    return apiClient.get<SharedActivity[]>(`/rooms/${roomId}/shared-resources/activities`);
  },

  createActivity: async (
    roomId: string,
    payload: { type: 'ANNOUNCEMENT' | 'ISSUE'; title: string; content?: string; eventDate?: string; imageUrl?: string }
  ): Promise<SharedActivity> => {
    return apiClient.post<SharedActivity>(`/rooms/${roomId}/shared-resources/activities`, payload);
  },

  createResource: async (data: CreateResourceInput): Promise<SharedResource> => {
    const res = await fetch(`/api/host/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi ${res.status}: Không thể tạo tài nguyên`);
      }
      throw new Error(`Server trả về lỗi ${res.status} (không phải JSON). Vui lòng kiểm tra lại API route.`);
    }

    return res.json();
  },

  deleteResource: async (resourceId: string): Promise<void> => {
    const res = await fetch(`/api/host/resources/${resourceId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Không thể xóa tài nguyên');
    }
  },

};
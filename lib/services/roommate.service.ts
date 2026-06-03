// src/lib/services/roommate.service.ts

export interface RoommateMatch {
  roommate_id: string;
  compatibility_score: number;
  compatibility_reasons: string[];
  name: string;
  avatar: string;
  age?: number;
  occupation: string;
  cleanliness_level: number;
  social_level: number;
  accept_smoking: boolean;
  accept_pets: boolean;
}

export const roommateService = {
  async getMatches(userId: string, roomId: string): Promise<RoommateMatch[]> {
    try {
      void userId;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: HeadersInit = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        room_id: roomId,
      });

      const response = await fetch(`/api/recommendations/roommates?${params.toString()}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.warn('Không thể tải roommate matches:', payload?.error || payload?.message || response.statusText);
        return [];
      }
      const data = await response.json();
      console.log('hiển thị data roommate: ' , data)
      return data;
    } catch (error) {
      console.warn('Không thể kết nối roommate matching:', error);
      return [];
    }
  },
};

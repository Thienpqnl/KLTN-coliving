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
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: HeadersInit = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        room_id: roomId,
      });

      const url = `/api/recommendations/roommates?${params.toString()}`;
      console.log(`🔗 [RoommateService] Calling: ${url}`);
      console.log(`🔐 [RoommateService] Token: ${token ? 'có' : 'không'}`);

      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });
      
      console.log(`📊 [RoommateService] Response status: ${response.status}`);
      
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error(`❌ [RoommateService] Error response:`, payload);
        return [];
      }
      
      const data = await response.json();
      console.log(`✅ [RoommateService] Data received:`, data);
      console.log(`📈 [RoommateService] Count: ${Array.isArray(data) ? data.length : 'not an array'}`);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ [RoommateService] Network error:`, error);
      return [];
    }
  },
};

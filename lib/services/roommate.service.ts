// src/lib/services/roommate.service.ts

const API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';

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
      const response = await fetch(`${API_URL}/match-roommates/${userId}/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch roommate matches');
      }
      const data = await response.json();
      console.log('hiển thị data roommate: ' , data)
      return data;
    } catch (error) {
      console.error('Error fetching roommate matches:', error);
      return [];
    }
  },
};
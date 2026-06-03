import pandas as pd
import numpy as np
from .similarity import (
    location_similarity,
    budget_similarity,
    binary_match,
    occupancy_ratio,
    cleanliness_compatibility,
    social_compatibility,
    sleep_compatibility,
    guest_tolerance_compatibility,
)
from .explain import explain_recommendation
from utils.loader_supabase import (
    load_users_from_supabase,
    load_rooms_from_supabase,
    load_occupancy_from_supabase
)

def convert_to_native_types(obj):
    if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, (np.bool_, np.bool8)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_native_types(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_native_types(item) for item in obj]
    elif isinstance(obj, pd.Series):
        return convert_to_native_types(obj.to_dict())
    return obj

def get_detailed_compatibility(user_id: str, room_id: str):
    try:
        # 1. Load Data
        users_df = load_users_from_supabase()
        rooms_df = load_rooms_from_supabase()
        occupancy_df = load_occupancy_from_supabase()
        
        # LƯU Ý: Sử dụng đúng tên cột 'user_id' và 'roomId' đã được rename trong loader
        user_row = users_df[users_df['user_id'] == user_id]
        room_row = rooms_df[rooms_df['roomId'] == room_id]
        
        if user_row.empty:
            return {"error": f"User {user_id} not found"}
        
        if room_row.empty:
            return {"error": f"Room {room_id} not found"}
        user = user_row.iloc[0]
        room = room_row.iloc[0]
        if room.get('current_occupants', 0) >= room.get('maxOccupants', 999):
            return {
                "user_id": user_id,
                "room_id": room_id,
                "error": "Phòng đã đầy",
                "overall_score": 0
            }

        location_score = location_similarity(
            user.get('preferred_location_district_id', 'all'),
            room.get('districtId')
        )

        budget_score = budget_similarity(
            user.get('budget_min_vnd', 3000000),
            user.get('budget_max_vnd', 15000000),
            room.get('minimumBudget', 5000000)
        )

        smoking_score = binary_match(
            user.get('accept_smoking_roommates', False),
            room.get('allowSmoking', False)
        )
        pet_score = binary_match(
            user.get('accept_pets', False),
            room.get('allowPets', False)
        )
        
        # Occupancy
        occupancy_score = occupancy_ratio(
            room.get('current_occupants', 0),
            room.get('maxOccupants', 4)
        )
        
        # Cleanliness: Sử dụng 'priority_cleanliness'
        cleanliness_score = cleanliness_compatibility(
            user.get('priority_cleanliness', 3),
            room.get('cleanlinessRequired', 'medium')
        )
        
        social_score = social_compatibility(
            user.get('priority_social_environment', 3),
            room.get('noiseTolerance', 'medium'),
            room.get('guestPolicy', 'occasionally')
        )
        
        # Sleep: Sử dụng 'lifestyle_archetype'
        sleep_score = sleep_compatibility(
            user.get('lifestyle_archetype', 'Young Professional'),
            room.get('preferredSleepHabit', 'normal')
        )
        
        guest_score = guest_tolerance_compatibility(
            user.get('priority_social_environment', 3),
            room.get('guestPolicy', 'occasionally')
        )
        roommate_score = 0.5  
        current_roommates_rows = occupancy_df[occupancy_df['room_id'] == room_id]
        
        if not current_roommates_rows.empty:
            individual_scores = []
            
            user_clean = user.get('priority_cleanliness', 3)
            user_social = user.get('priority_social_environment', 3)

            for _, occ_row in current_roommates_rows.iterrows():
                roommate_id = occ_row['user_id']
                
                if roommate_id == user_id:
                    continue
                
                roommate_row = users_df[users_df['user_id'] == roommate_id]
                
                if not roommate_row.empty:
                    roommate = roommate_row.iloc[0]
                    
                    r_clean = roommate.get('priority_cleanliness', 3)
                    r_social = roommate.get('priority_social_environment', 3)

                    clean_diff = abs(user_clean - r_clean)
                    c_score = max(0.05, min(0.75, 1 - ((clean_diff / 4.0) ** 3) * 1.5))

                    social_diff = abs(user_social - r_social)
                    s_score = max(0.05, min(0.75, 1 - ((social_diff / 4.0) ** 3) * 1.5))

                    avg_compat = (c_score * 0.6) + (s_score * 0.4)
                    
                    individual_scores.append(avg_compat * 0.9)

            if individual_scores:
                roommate_score = sum(individual_scores) / len(individual_scores)
        
        scores = {
            "location_similarity": round(location_score, 4),
            "budget_similarity": round(budget_score, 4),
            "smoking_match": round(smoking_score, 4),
            "pet_match": round(pet_score, 4),
            "sleep_similarity": round(sleep_score, 4),
            "cleanliness_similarity": round(cleanliness_score, 4),
            "social_similarity": round(social_score, 4),
            "guest_similarity": round(guest_score, 4),
            "occupancy_ratio": round(occupancy_score, 4),
            "roommate_compatibility": round(roommate_score, 4),
        }
        
        weights = {
            "location_similarity": 0.10,
            "budget_similarity": 0.20,
            "cleanliness_similarity": 0.15,
            "social_similarity": 0.10,
            "sleep_similarity": 0.20,
            "smoking_match": 0.05,
            "pet_match": 0.05,
            "occupancy_ratio": 0.05,
            "roommate_compatibility": 0.10,
        }
        
        weighted_sum = sum(scores[key] * weight for key, weight in weights.items())
        total_weight = sum(weights.values())
        normalized_score = weighted_sum / total_weight if total_weight > 0 else 0
        
        overall_score = normalized_score * 100
        
        reasons = explain_recommendation(scores)
        
        user_info = {
            "id": user.get('user_id'), # Sửa thành 'user_id'
            "name": user.get('fullName'),
            "email": user.get('email'),
            "preferences": {
                "budgetMin": user.get('budget_min_vnd'),  
                "budgetMax": user.get('budget_max_vnd'),       
                "preferredDistrict": user.get('preferred_location_district_id'), 
                "lifestyleArchetype": user.get('lifestyle_archetype'),
                "priorityCleanliness": user.get('priority_cleanliness'),
                "prioritySocialEnvironment": user.get('priority_social_environment'),
                "acceptSmokingRoommates": user.get('accept_smoking_roommates'),
                "acceptPets": user.get('accept_pets'),     
            }
        }
        
        room_info = {
            "id": room.get('roomId'), # Sửa thành 'roomId'
            "title": room.get('title'),
            "price": room.get('minimumBudget'),
            "district": room.get('districtId'),
            "requirements": {
                "cleanlinessRequired": room.get('cleanlinessRequired'),
                "noiseTolerance": room.get('noiseTolerance'),
                "guestPolicy": room.get('guestPolicy'),
                "preferredSleepHabit": room.get('preferredSleepHabit'),
                "allowSmoking": room.get('allowSmoking'),
                "allowPets": room.get('allowPets'),
                "currentOccupants": room.get('current_occupants'), 
                "maxOccupants": room.get('maxOccupants'),
            }
        }
        
        result = {
            "user_id": user_id,
            "room_id": room_id,
            "user_info": user_info,
            "room_info": room_info,
            "scores": scores,
            "reasons": reasons,
            "overall_score": round(overall_score, 2),
        }
        return convert_to_native_types(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": f"Error calculating compatibility: {str(e)}",
            "user_id": user_id,
            "room_id": room_id
        }
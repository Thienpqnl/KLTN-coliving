import pandas as pd

from utils.loader import (
    users_df,
    rooms_df,
    occupancy_df,
    model
)
from services.similarity import (
    location_similarity,
    binary_match,
    occupancy_ratio,
    budget_similarity,
    cleanliness_compatibility,
    social_compatibility,
    sleep_compatibility,
    guest_tolerance_compatibility,
)
from services.scoring import calculate_xgboost_score
def recommend_rooms(user_id, top_k=10):

    # =================================================
    # GET USER
    # =================================================
    print(f"\n[RECOMMEND] ===== STARTING RECOMMENDATIONS =====")
    print(f"[RECOMMEND] User ID: {user_id}, Top K: {top_k}")
    print(f"[RECOMMEND] Using XGBoost model for scoring")

    user = users_df[
        users_df["user_id"] == user_id
    ].iloc[0]

    rows = []

    # =================================================
    # LOOP ALL ROOMS
    # =================================================

    for _, room in rooms_df.iterrows():

        # ---------------------------------------------
        # Skip full room
        # ---------------------------------------------

        if (
            room["current_occupants"]
            >= room["maxOccupants"]
        ):
            continue
        # ---------------------------------------------
        # FEATURE ENGINEERING
        # ---------------------------------------------

        row = {

            # =========================================
            # LOCATION
            # =========================================

            "location_similarity":

                location_similarity(

                    user[
                        "preferred_location_district_id"
                    ],

                    room["districtId"]
                ),

            # =========================================
            # BUDGET
            # =========================================

            "budget_similarity":

                budget_similarity(

                    user["budget_min_vnd"],

                    user["budget_max_vnd"],

                    room["minimumBudget"]
                ),

            # =========================================
            # SMOKING
            # =========================================

            "smoking_match":

                binary_match(

                    user[
                        "accept_smoking_roommates"
                    ],

                    room["allowSmoking"]
                ),

            # =========================================
            # PET
            # =========================================

            "pet_match":

                binary_match(

                    user["accept_pets"],

                    room["allowPets"]
                ),

            "sleep_group_similarity":

                sleep_compatibility(

                    user["lifestyle_archetype"],

                    room["preferredSleepHabit"]
                ),

            "cleanliness_group_similarity":

                cleanliness_compatibility(

                    user["priority_cleanliness"],

                    room["cleanlinessRequired"]
                ),

            "social_group_similarity":

                social_compatibility(

                    user["priority_social_environment"],

                    room["noiseTolerance"],

                    room["guestPolicy"]
                ),

            "guest_group_similarity":

                guest_tolerance_compatibility(

                    user["priority_social_environment"],

                    room["guestPolicy"]
                ),

            "sleep_similarity":

                sleep_compatibility(

                    user["lifestyle_archetype"],

                    room["preferredSleepHabit"]
                ),

            "cleanliness_similarity":

                cleanliness_compatibility(

                    user["priority_cleanliness"],

                    room["cleanlinessRequired"]
                ),

            "social_similarity":

                social_compatibility(

                    user["priority_social_environment"],

                    room["noiseTolerance"],

                    room["guestPolicy"]
                ),

            "guest_similarity":

                guest_tolerance_compatibility(

                    user["priority_social_environment"],

                    room["guestPolicy"]
                ),
            "occupancy_ratio":

                occupancy_ratio(

                    room["current_occupants"],

                    room["maxOccupants"]
                ),
            "roomId": room["roomId"],

            "districtId": room["districtId"],

            "price": room["minimumBudget"]
        }

        rows.append(row)
    recommend_df = pd.DataFrame(rows)

    # =================================================
    # CALCULATE SCORES USING XGBOOST MODEL
    # =================================================
    def calculate_row_score(row):
        """Calculate score for a single room recommendation using XGBoost"""
        scores = {
            'location_similarity': row.get('location_similarity', 0.5),
            'budget_similarity': row.get('budget_similarity', 0.5),
            'smoking_match': row.get('smoking_match', 0.5),
            'pet_match': row.get('pet_match', 0.5),
            'sleep_group_similarity': row.get('sleep_group_similarity', 0.5),
            'cleanliness_group_similarity': row.get('cleanliness_group_similarity', 0.5),
            'social_group_similarity': row.get('social_group_similarity', 0.5),
            'guest_group_similarity': row.get('guest_group_similarity', 0.5),
            'sleep_similarity': row.get('sleep_similarity', 0.5),
            'cleanliness_similarity': row.get('cleanliness_similarity', 0.5),
            'social_similarity': row.get('social_similarity', 0.5),
            'guest_similarity': row.get('guest_similarity', 0.5),
            'occupancy_ratio': row.get('occupancy_ratio', 0.5),
        }
        # Use XGBoost model to calculate score (0-100)
        score_percent = calculate_xgboost_score(scores, model)
        return score_percent / 100.0  # Convert back to 0-1 scale for consistency
    
    recommend_df["recommendation_score"] = recommend_df.apply(calculate_row_score, axis=1)

    recommend_df = recommend_df.sort_values(
        by="recommendation_score",
        ascending=False
    )
    
    # ✅ Lấy top K rooms
    top_k_df = recommend_df.head(top_k).copy()
    
    print(f"\n[RECOMMEND] Top {len(top_k_df)} recommendations:")
    for idx, (_, row) in enumerate(top_k_df.iterrows(), 1):
        print(f"  {idx}. Room {row['roomId']}: {row['recommendation_score']*100:.2f}%")
    
    return top_k_df
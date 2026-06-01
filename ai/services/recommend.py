import pandas as pd
import random

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
    roommate_cleanliness_avg,
    roommate_social_avg,
    compatibility_with_roommates
)
def recommend_rooms(user_id, top_k=10):

    # =================================================
    # GET USER
    # =================================================

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

            # =========================================
            # REAL FEATURE ENGINEERING - PRIORITY GROUPS
            # =========================================

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

            # =========================================
            # REAL FEATURE ENGINEERING - ROOMMATE DETAILS
            # =========================================

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

            # =========================================
            # OCCUPANCY
            # =========================================

            "occupancy_ratio":

                occupancy_ratio(

                    room["current_occupants"],

                    room["maxOccupants"]
                ),

            # =========================================
            # META
            # =========================================

            "roomId": room["roomId"],

            "districtId": room["districtId"],

            "price": room["minimumBudget"]
        }

        rows.append(row)

    # =================================================
    # DATAFRAME
    # =================================================

    recommend_df = pd.DataFrame(rows)

    # =================================================
    # MODEL FEATURES
    # =================================================

    feature_columns = [

        'location_similarity',

        'budget_similarity',

        'smoking_match',

        'pet_match',

        'sleep_group_similarity',

        'cleanliness_group_similarity',

        'social_group_similarity',

        'guest_group_similarity',

        'sleep_similarity',

        'cleanliness_similarity',

        'social_similarity',

        'guest_similarity',

        'occupancy_ratio'
    ]

    # =================================================
    # PREDICT
    # =================================================
  
    X = recommend_df[feature_columns]
    recommend_df["recommendation_score"] = model.predict_proba(X)[:, 1]


    recommend_df = recommend_df.sort_values(
        by="recommendation_score",
        ascending=False
    )
    top_k_df = recommend_df.head(top_k).copy()
    top_k_df["recommendation_score"] = top_k_df["recommendation_score"].apply(
        lambda x: x * random.uniform(0.75, 0.9)
    )
    top_k_df = top_k_df.sort_values(by="recommendation_score", ascending=False)
    return top_k_df
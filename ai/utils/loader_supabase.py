
import os
import warnings
import pandas as pd

from dotenv import load_dotenv
from supabase import create_client, Client
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")
load_dotenv()

def get_supabase_client() -> Client:

    supabase_url = os.getenv("SUPABASE_URL", "").strip()

    # Use service role key
    supabase_key = os.getenv(
        "SUPABASE_SERVICE_KEY",
        ""
    ).strip()

    if not supabase_url:
        raise ValueError("SUPABASE_URL is missing")

    if not supabase_key:
        raise ValueError("SUPABASE_SERVICE_KEY is missing")

    print("\n🔍 Debug Info:")
    print(f"   URL: {supabase_url}")
    print(f"   Using SERVICE ROLE KEY")
    print(f"   Key: {supabase_key[:20]}...")

    client = create_client(
        supabase_url,
        supabase_key
    )

    print("✓ Supabase client created successfully\n")

    return client

def load_users_from_supabase() -> pd.DataFrame:

    try:

        print("📥 Loading users from Supabase...")

        supabase = get_supabase_client()

        users_response = (
            supabase
            .table("User")
            .select(
                "id, email, fullName, role"
            )
            .execute()
        )

        users_df = pd.DataFrame(users_response.data)
        preferences_response = (
            supabase
            .table("user_preferences")
            .select("""
                userId,
                budgetMinVnd,
                budgetMaxVnd,
                preferredDistrict,
                lifestyleArchetype,
                priorityCleanliness,
                prioritySocialEnvironment,
                acceptSmokingRoommates,
                acceptPets
            """)
            .execute()
        )

        preferences_df = pd.DataFrame(
            preferences_response.data
        )
        if not preferences_df.empty:

            users_df = users_df.merge(
                preferences_df,
                left_on="id",
                right_on="userId",
                how="left"
            )

        users_df["budgetMinVnd"] = users_df[
            "budgetMinVnd"
        ].fillna(3000000)

        users_df["budgetMaxVnd"] = users_df[
            "budgetMaxVnd"
        ].fillna(15000000)

        users_df["preferredDistrict"] = users_df[
            "preferredDistrict"
        ].fillna("all")

        users_df["lifestyleArchetype"] = users_df[
            "lifestyleArchetype"
        ].fillna("Young Professional")

        users_df["priorityCleanliness"] = users_df[
            "priorityCleanliness"
        ].fillna(3)

        users_df["prioritySocialEnvironment"] = users_df[
            "prioritySocialEnvironment"
        ].fillna(3)

        users_df["acceptSmokingRoommates"] = users_df[
            "acceptSmokingRoommates"
        ].fillna(False)

        users_df["acceptPets"] = users_df[
            "acceptPets"
        ].fillna(False)

        users_df = users_df.rename(columns={

            "id": "user_id",

            "budgetMinVnd": "budget_min_vnd",

            "budgetMaxVnd": "budget_max_vnd",

            "preferredDistrict":
                "preferred_location_district_id",

            "lifestyleArchetype":
                "lifestyle_archetype",

            "priorityCleanliness":
                "priority_cleanliness",

            "prioritySocialEnvironment":
                "priority_social_environment",

            "acceptSmokingRoommates":
                "accept_smoking_roommates",

            "acceptPets":
                "accept_pets"
        })

        print(f"✓ Loaded {len(users_df)} users")

        return users_df

    except Exception as e:

        print(f"\n Error loading users:")
        print(str(e))

        raise

def load_rooms_from_supabase() -> pd.DataFrame:

    try:

        print(" Loading rooms from Supabase...")

        supabase = get_supabase_client()

        response = (
            supabase
            .table("Room")
            .select("""
                id,
                title,
                address,
                district,
                districtId,
                priceValue,
                ownerId,
                status,
                cleanlinessRequired,
                noiseTolerance,
                guestPolicy,
                preferredSleepHabit,
                maxOccupants,
                currentOccupants,
                allowSmoking,
                allowPets
            """)
            .execute()
        )

        rooms_data = response.data

        if not rooms_data:
            print("⚠️ No rooms found")
            rooms_data = []

        rows = []

        for idx, room in enumerate(rooms_data, start=1):

            rows.append({
                "roomId": room.get("id"),
                "room_index": idx,

                "title": room.get("title"),
                "address": room.get("address"),

                "district": room.get("district", "all"),
                "districtId": room.get("districtId", "all"),

                "minimumBudget": room.get(
                    "priceValue",
                    5000000
                ),

                "cleanlinessRequired": room.get(
                    "cleanlinessRequired",
                    "medium"
                ),

                "noiseTolerance": room.get(
                    "noiseTolerance" or
                    "medium"
                ),

                "guestPolicy": room.get(
                    "guestPolicy" or
                    "occasionally"
                ),

                "preferredSleepHabit": room.get(
                    "preferredSleepHabit" or
                    "normal"
                ),

                "maxOccupants": room.get(
                    "maxOccupants" or
                    5
                ),

                "current_occupants": room.get(
                    "currentOccupants" or
                    0
                ),

                "allowSmoking": room.get(
                    "allowSmoking" or
                    False
                ),

                "allowPets": room.get(
                    "allowPets" or
                    False
                ),

                "ownerId": room.get("ownerId"),

                "status": room.get(
                    "status",
                    "AVAILABLE"
                )
            })

        rooms_df = pd.DataFrame(rows)

        print(f"✓ Loaded {len(rooms_df)} rooms")

        return rooms_df

    except Exception as e:

        print(f"\n❌ Error loading rooms:")
        print(str(e))

        raise



def load_occupancy_from_supabase() -> pd.DataFrame:
    try:
        print(" Loading occupancy data from Supabase...")
        supabase = get_supabase_client()
        response = (
            supabase
            .table("occupancy")
            .select("roomId, userId, status") 
            .execute()
        )

        occupancy_data = response.data
        if not occupancy_data:
            print(" No occupancy data found")
            return pd.DataFrame(columns=["room_id", "user_id", "status"])

        occupancy_df = pd.DataFrame([
            {
                "room_id": row["roomId"],
                "user_id": row["userId"],
                "status": row.get("status", "ACTIVE") # Default là ACTIVE nếu null
            }
            for row in occupancy_data
        ])
        print(f"✓ Loaded {len(occupancy_df)} occupancy records")

        return occupancy_df

    except Exception as e:
        print("\n❌ Error loading occupancy:")
        print(str(e))
        return pd.DataFrame(columns=["room_id", "user_id", "status"])
def load_model():

    print("📥 Loading XGBoost model...")

    model_paths = [
        "model/xgboost_room_recommendation_retrained.json",
        "model/xgboost_room_recommendation.json"
    ]

    model_path = None

    for path in model_paths:

        if os.path.exists(path):
            model_path = path
            break

    if not model_path:

        raise FileNotFoundError(
            "❌ Model file not found"
        )

    model = XGBClassifier()

    model.load_model(model_path)

    print(f"✓ Model loaded from: {model_path}")

    return model
def load_all_data():

    print("\n" + "=" * 60)
    print(" LOADING DATA FROM SUPABASE")
    print("=" * 60)

    users_df = load_users_from_supabase()

    rooms_df = load_rooms_from_supabase()

    occupancy_df = load_occupancy_from_supabase()

    model = load_model()

    print("\n" + "=" * 60)
    print("ALL DATA LOADED SUCCESSFULLY")
    print("=" * 60)

    print(f"Users: {len(users_df)}")
    print(f"Rooms: {len(rooms_df)}")
    print(f"Occupancy: {len(occupancy_df)}")

    print("=" * 60 + "\n")

    return (
        users_df,
        rooms_df,
        occupancy_df,
        model
    )

if __name__ == "__main__":

    users_df, rooms_df, occupancy_df, model = (
        load_all_data()
    )

    print("\n===== USERS =====")
    print(users_df.head())

    print("\n===== ROOMS =====")
    print(rooms_df.head())

    print("\n===== OCCUPANCY =====")
    print(occupancy_df.head())
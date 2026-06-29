import os
import warnings
import pandas as pd
import numpy as np

from dotenv import load_dotenv
from supabase import create_client, Client
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")
load_dotenv()

def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_KEY is missing")

    client = create_client(supabase_url, supabase_key)
    return client

def load_users_from_supabase() -> pd.DataFrame:
    try:
        print("📥 Loading users from Supabase...")
        supabase = get_supabase_client()

        users_response = (
            supabase
            .table("User")
            .select("id, email, fullName, role")
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
        preferences_df = pd.DataFrame(preferences_response.data)

        if users_df.empty:
            return pd.DataFrame(columns=[
                "userId", "email", "fullName", "role", "budget_min_vnd", "budget_max_vnd",
                "preferred_location_district_id", "lifestyle_archetype", "priority_cleanliness",
                "priority_social_environment", "accept_smoking_roommates", "accept_pets",
            ])

        # Thực hiện đổi tên cột 'id' thành 'userId' TRƯỚC khi merge để tránh tạo cột trùng lặp
        users_df.rename(columns={"id": "userId"}, inplace=True)

        if not preferences_df.empty:
            # Merge dựa trên cột chung 'userId' công bằng
            users_df = users_df.merge(preferences_df, on="userId", how="left")

        # Đảm bảo dọn sạch các cột trùng lặp nếu phát sinh ngoài ý muốn
        users_df = users_df.loc[:, ~users_df.columns.duplicated()]

        # Fillna các trường dữ liệu
        users_df["budgetMinVnd"] = users_df["budgetMinVnd"].fillna(3000000)
        users_df["budgetMaxVnd"] = users_df["budgetMaxVnd"].fillna(15000000)
        users_df["preferredDistrict"] = users_df["preferredDistrict"].fillna("all")
        users_df["lifestyleArchetype"] = users_df["lifestyleArchetype"].fillna("Young Professional")
        users_df["priorityCleanliness"] = users_df["priorityCleanliness"].fillna(3)
        users_df["prioritySocialEnvironment"] = users_df["prioritySocialEnvironment"].fillna(3)
        users_df["acceptSmokingRoommates"] = users_df["acceptSmokingRoommates"].fillna(False)
        users_df["acceptPets"] = users_df["acceptPets"].fillna(False)

        # Mapping lại tên cột chuẩn định dạng snake_case
        users_df = users_df.rename(columns={
            "budgetMinVnd": "budget_min_vnd",
            "budgetMaxVnd": "budget_max_vnd",
            "preferredDistrict": "preferred_location_district_id",
            "lifestyleArchetype": "lifestyle_archetype",
            "priorityCleanliness": "priority_cleanliness",
            "prioritySocialEnvironment": "priority_social_environment",
            "acceptSmokingRoommates": "accept_smoking_roommates",
            "acceptPets": "accept_pets"
        })

        # Xóa index trùng lặp bảo mật tuyệt đối
        users_df = users_df.reset_index(drop=True)
        print(f"✓ Loaded {len(users_df)} users")
        return users_df

    except Exception as e:
        print(f"\n❌ Error loading users: {e}")
        raise

def load_rooms_from_supabase() -> pd.DataFrame:
    try:
        print("📥 Loading rooms from Supabase...")
        supabase = get_supabase_client()

        response = (
            supabase
            .table("Room")
            .select("""
                id, title, address, district, districtId, priceValue, ownerId, status,
                cleanlinessRequired, noiseTolerance, guestPolicy, preferredSleepHabit,
                maxOccupants, currentOccupants, allowSmoking, allowPets
            """)
            .execute()
        )

        rooms_data = response.data or []
        rows = []

        for idx, room in enumerate(rooms_data, start=1):
            rows.append({
                "roomId": room.get("id"),
                "room_index": idx,
                "title": room.get("title"),
                "address": room.get("address"),
                "district": room.get("district", "all"),
                "districtId": room.get("districtId", "all"),
                "minimumBudget": room.get("priceValue", 5000000),
                "cleanlinessRequired": room.get("cleanlinessRequired", "medium"),
                "noiseTolerance": room.get("noiseTolerance") or "medium",
                "guestPolicy": room.get("guestPolicy") or "occasionally",
                "preferredSleepHabit": room.get("preferredSleepHabit") or "normal",
                "maxOccupants": room.get("maxOccupants") or 5,
                "current_occupants": room.get("currentOccupants") or 0,
                "allowSmoking": room.get("allowSmoking") or False,
                "allowPets": room.get("allowPets") or False,
                "ownerId": room.get("ownerId"),
                "status": room.get("status", "AVAILABLE")
            })

        rooms_df = pd.DataFrame(rows)
        # Loại bỏ cột trùng lặp cho rooms_df
        rooms_df = rooms_df.loc[:, ~rooms_df.columns.duplicated()].reset_index(drop=True)
        print(f"✓ Loaded {len(rooms_df)} rooms")
        return rooms_df

    except Exception as e:
        print(f"\n❌ Error loading rooms: {e}")
        raise

def load_occupancy_from_supabase() -> pd.DataFrame:
    try:
        print("📥 Loading occupancy data from Supabase...")
        supabase = get_supabase_client()
        response = supabase.table("occupancy").select("roomId, userId, status").execute()

        occupancy_data = response.data or []
        if not occupancy_data:
            return pd.DataFrame(columns=["roomId", "userId", "status"])

        occupancy_df = pd.DataFrame([
            {
                "roomId": row["roomId"],
                "userId": row["userId"],
                "status": row.get("status", "ACTIVE")
            }
            for row in occupancy_data
        ])
        occupancy_df = occupancy_df.loc[:, ~occupancy_df.columns.duplicated()].reset_index(drop=True)
        print(f"✓ Loaded {len(occupancy_df)} occupancy records")
        return occupancy_df
    except Exception as e:
        print(f"\n❌ Error loading occupancy: {e}")
        return pd.DataFrame(columns=["roomId", "userId", "status"])
    
def load_interactions_from_supabase() -> pd.DataFrame:
    try:
        print("📥 Loading room interactions from Supabase...")
        supabase = get_supabase_client()
        response = supabase.table("RoomInteraction").select("userId, roomId, interactionType, interactionValue").execute()
        
        df = pd.DataFrame(response.data)
        if not df.empty:
            df.rename(columns={"interactionValue": "rating"}, inplace=True)
            
        df = df.loc[:, ~df.columns.duplicated()].reset_index(drop=True)
        print(f"✓ Interactions loaded: {len(df)} rows")
        return df
    except Exception as e:
        print(f"❌ Error loading interactions: {e}")
        return pd.DataFrame(columns=["userId", "roomId", "interactionType", "rating"])    

def load_model():
    print("📥 Loading XGBoost model...")
    model_paths = ["model/xgboost_room_recommendation_retrained.json", "model/xgboost_room_recommendation.json"]
    model_path = next((path for path in model_paths if os.path.exists(path)), None)

    if not model_path:
        raise FileNotFoundError("❌ Model file not found")

    model = XGBClassifier()
    model.load_model(model_path)
    print(f"✓ Model loaded from: {model_path}")
    return model

def load_all_data():
    print("\n" + "=" * 60)
    print(" LOADING DATA FROM SUPABASE FOR PIPELINE")
    print("=" * 60)

    u_df = load_users_from_supabase()
    r_df = load_rooms_from_supabase()
    o_df = load_occupancy_from_supabase()
    i_df = load_interactions_from_supabase()
    mdl = load_model()

    print("\n" + "=" * 60)
    print("ALL DATA LOADED SUCCESSFULLY TO MEMORY")
    print("=" * 60)
    return u_df, r_df, o_df, i_df, mdl

users_df = pd.DataFrame()
rooms_df = pd.DataFrame()
occupancy_df = pd.DataFrame()
interact_df = pd.DataFrame()
model = None

try:
    users_df, rooms_df, occupancy_df, interact_df, model = load_all_data()
except Exception as e:
    print(f"❌ CRITICAL ERROR DURING DATA INITIALIZATION: {e}")
    import traceback
    traceback.print_exc()
    users_df = pd.DataFrame()
    rooms_df = pd.DataFrame()
    occupancy_df = pd.DataFrame()
    interact_df = pd.DataFrame()
    model = None

__all__ = [
    'users_df', 'rooms_df', 'occupancy_df', 'interact_df', 'model',
    'get_supabase_client', 'load_users_from_supabase', 'load_rooms_from_supabase',
    'load_occupancy_from_supabase', 'load_interactions_from_supabase', 'load_model', 'load_all_data'
]
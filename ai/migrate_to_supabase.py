#!/usr/bin/env python3
# =====================================================
# CSV TO SUPABASE MIGRATION UTILITY
# =====================================================

import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# =====================================================
# MIGRATE USERS
# =====================================================

def migrate_users_csv_to_supabase():
    """
    Migrate user preferences từ CSV sang Supabase
    """
    print("\n📤 Migrating Users...")
    
    try:
        # Load CSV
        users_df = pd.read_csv("data/preference_dataset.csv")
        supabase = get_supabase()
        
        migrated = 0
        failed = 0
        
        for _, row in users_df.iterrows():
            try:
                # Prepare preference data
                preference_data = {
                    "budgetMinVnd": int(row.get("budget_min_vnd", 3000000)),
                    "budgetMaxVnd": int(row.get("budget_max_vnd", 15000000)),
                    "preferredDistrict": row.get("preferred_location_district_id", "all"),
                    "lifestyleArchetype": row.get("lifestyle_archetype", "Young Professional"),
                    "priorityCleanliness": int(row.get("priority_cleanliness", 3)),
                    "prioritySocialEnvironment": int(row.get("priority_social_environment", 3)),
                    "acceptSmokingRoommates": bool(row.get("accept_smoking_roommates", False)),
                    "acceptPets": bool(row.get("accept_pets", False)),
                }
                
                user_id = str(row.get("user_id"))
                
                # Try to update or create
                response = supabase.table("UserPreference").upsert({
                    "userId": user_id,
                    **preference_data
                }).execute()
                
                migrated += 1
                
            except Exception as e:
                failed += 1
                print(f"  ✗ Error migrating user {user_id}: {e}")
        
        print(f"✓ Users migrated: {migrated} (failed: {failed})")
        
    except Exception as e:
        print(f"✗ Error: {e}")

# =====================================================
# MIGRATE ROOMS
# =====================================================

def migrate_rooms_csv_to_supabase():
    """
    Migrate room data từ CSV sang Supabase
    """
    print("\n📤 Migrating Rooms...")
    
    try:
        # Load CSV
        rooms_df = pd.read_csv("data/room_requirements.csv")
        supabase = get_supabase()
        
        migrated = 0
        failed = 0
        
        for _, row in rooms_df.iterrows():
            try:
                room_data = {
                    "id": str(row.get("roomId")),
                    "title": row.get("title", "Room"),
                    "address": row.get("address", ""),
                    "district": row.get("districtId", "all"),
                    "priceValue": int(row.get("minimumBudget", 5000000)),
                    "cleanlinessRequired": row.get("cleanlinessRequired", "medium"),
                    "noiseTolerance": row.get("noiseTolerance", "medium"),
                    "guestPolicy": row.get("guestPolicy", "occasionally"),
                    "preferredSleepHabit": row.get("preferredSleepHabit", "normal"),
                    "maxOccupants": int(row.get("maxOccupants", 2)),
                    "currentOccupants": int(row.get("current_occupants", 0)),
                    "allowSmoking": bool(row.get("allowSmoking", False)),
                    "allowPets": bool(row.get("allowPets", False)),
                    "status": "AVAILABLE",
                }
                
                # Upsert to Supabase
                response = supabase.table("Room").upsert(room_data).execute()
                
                migrated += 1
                
            except Exception as e:
                failed += 1
                print(f"  ✗ Error migrating room: {e}")
        
        print(f"✓ Rooms migrated: {migrated} (failed: {failed})")
        
    except Exception as e:
        print(f"✗ Error: {e}")

# =====================================================
# MIGRATE OCCUPANCY
# =====================================================

def migrate_occupancy_csv_to_supabase():
    """
    Migrate occupancy data từ CSV sang Supabase
    
    Note: Cách này giả sử bạn có table RoomOccupant hoặc tương tự
    """
    print("\n📤 Migrating Occupancy...")
    print("⚠️  Note: Occupancy migration phụ thuộc vào schema của bạn")
    print("   Hãy check nếu bạn có table để track user-room relationships")
    
    try:
        occupancy_df = pd.read_csv("data/room_occupancy_dataset.csv")
        supabase = get_supabase()
        
        print(f"Found {len(occupancy_df)} occupancy records")
        print("Occupancy mapping:")
        print(occupancy_df.head())
        
        # Bạn cần tự implement theo schema của project
        print("\n💡 Suggestion: Tạo table RoomOccupant hoặc User-Room relationship")
        
    except Exception as e:
        print(f"✗ Error: {e}")

# =====================================================
# VERIFY MIGRATION
# =====================================================

def verify_migration():
    """
    Kiểm tra dữ liệu đã được migrate chưa
    """
    print("\n✅ Verifying Migration...\n")
    
    try:
        supabase = get_supabase()
        
        # Count users
        users_response = supabase.table("User").select("id").execute()
        users_count = len(users_response.data)
        
        # Count preferences
        prefs_response = supabase.table("UserPreference").select("id").execute()
        prefs_count = len(prefs_response.data)
        
        # Count rooms
        rooms_response = supabase.table("Room").select("id").execute()
        rooms_count = len(rooms_response.data)
        
        print(f"✓ Users in DB: {users_count}")
        print(f"✓ User Preferences: {prefs_count}")
        print(f"✓ Rooms: {rooms_count}")
        
        if prefs_count < users_count:
            print(f"\n⚠️  Note: {users_count - prefs_count} users don't have preferences yet")
        
    except Exception as e:
        print(f"✗ Verification failed: {e}")

# =====================================================
# MAIN
# =====================================================

if __name__ == "__main__":
    print("="*60)
    print("CSV TO SUPABASE MIGRATION TOOL")
    print("="*60)
    
    # Validate config
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: SUPABASE_URL or SUPABASE_KEY not configured")
        print("Please set them in .env file")
        exit(1)
    
    print(f"\n🔗 Connected to: {SUPABASE_URL}")
    
    # Migration options
    print("\nMigration Options:")
    print("1. Migrate Users & Preferences")
    print("2. Migrate Rooms")
    print("3. Migrate Occupancy")
    print("4. Verify Migration")
    print("5. Migrate All")
    print("0. Exit")
    
    choice = input("\nSelect option (0-5): ").strip()
    
    if choice == "1":
        migrate_users_csv_to_supabase()
    elif choice == "2":
        migrate_rooms_csv_to_supabase()
    elif choice == "3":
        migrate_occupancy_csv_to_supabase()
    elif choice == "4":
        verify_migration()
    elif choice == "5":
        migrate_users_csv_to_supabase()
        migrate_rooms_csv_to_supabase()
        migrate_occupancy_csv_to_supabase()
        verify_migration()
    else:
        print("Exiting...")
    
    print("\n" + "="*60)

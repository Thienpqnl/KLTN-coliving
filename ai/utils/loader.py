import pandas as pd
import numpy as np
import os
from xgboost import XGBClassifier
from dotenv import load_dotenv

load_dotenv()

print("\n" + "="*60)
print("📋 DATA LOADER - Environment Check")
print("="*60)
print(f"SUPABASE_URL: {'✓ SET' if os.getenv('SUPABASE_URL') else '❌ NOT SET'}")
print(f"SUPABASE_SERVICE_KEY: {'✓ SET' if os.getenv('SUPABASE_SERVICE_KEY') else '❌ NOT SET'}")
print("="*60 + "\n")

USE_SERVICE_SCHEMAS = os.getenv("USE_SERVICE_SCHEMAS", "false").lower() == "true"
USE_REMOTE_DATA = USE_SERVICE_SCHEMAS or os.getenv("SUPABASE_URL") is not None

if USE_REMOTE_DATA:
    print("📊 MODE: Loading from SUPABASE")
    print("="*60)
    from utils.loader_supabase import load_all_data
    users_df, rooms_df, occupancy_df, interact_df ,model = load_all_data()
else:
    print("="*60)
    users_df = pd.read_csv(
        "data/preference_dataset.csv"
    )
    rooms_df = pd.read_csv(
        "data/room_requirements.csv"
    )
    occupancy_df = pd.read_csv(
        "data/room_occupancy_dataset.csv"
    )
    occupancy_df = pd.read_csv(
        "data/room_occupancy_dataset.csv"
    )
    if "room_index" not in rooms_df.columns:

        rooms_df["room_index"] = np.arange(
            1,
            len(rooms_df) + 1
        )
    occupancy_count = (

        occupancy_df
        .groupby("room_index")
        .size()
        .reset_index(name="current_occupants")
    )

    rooms_df = rooms_df.merge(

        occupancy_count,

        on="room_index",

        how="left"
    )
    rooms_df["current_occupants"] = (

        rooms_df["current_occupants"]
        .fillna(0)
    )
    model_path = "model/xgboost_room_recommendation_retrained.json"

    if not os.path.exists(model_path):
        model_path = "model/xgboost_room_recommendation.json"

    model = XGBClassifier()

    model.load_model(model_path)
print("Users:", users_df.shape)
print("Rooms:", rooms_df.shape)
print("Occupancy:", occupancy_df.shape)
print("\nRoom Columns:")
print(rooms_df.columns.tolist())

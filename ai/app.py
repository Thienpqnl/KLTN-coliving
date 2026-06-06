import os
import json
import numpy as np
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from services.recommend import recommend_rooms
from services.roommate import match_roommates
from services.room_user_similarity import get_detailed_compatibility

def convert_to_native_types(obj):
    """Convert numpy types and complex objects to native Python types for JSON serialization"""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
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
    return obj

app = FastAPI(
    title="Room Recommendation API",
    description="AI-powered room matching with real feature engineering",
    version="1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/recommend-room/{user_id}")
def recommend(user_id: str, top_k: int = 10):
    result = recommend_rooms(
        user_id=user_id,
        top_k=top_k
    )

    data = result.to_dict(orient="records")
    # Convert all numpy types and complex objects to native Python types
    return [convert_to_native_types(record) for record in data]

@app.get("/match-roommates/{user_id}/{roomId}")
def roommate_matching(
    user_id: str,
    roomId: str
):
    result = match_roommates(
        user_id=user_id,
        roomId=roomId
    )
    data = result.to_dict(orient="records")
    return [convert_to_native_types(record) for record in data]
@app.get("/compatibility-detail/{user_id}/{room_id}")
def get_compatibility_detail(user_id: str, room_id: str):
    result = get_detailed_compatibility(user_id, room_id)
    
    if "error" in result and len(result) <= 2:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=result.get("error"))
        
    return convert_to_native_types(result)
@app.get("/health")
def health_check():
    return {"status": "ok", "model": "xgboost_retrained_with_real_features"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
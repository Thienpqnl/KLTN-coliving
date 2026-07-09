import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.landlord_scoring import evaluate_user_for_landlord
from services.recommend import recommend_rooms
from services.room_user_similarity import get_detailed_compatibility
from services.roommate import match_roommates

load_dotenv()

NP_BOOL_TYPES = tuple(
    value
    for value in (getattr(np, "bool_", None), getattr(np, "bool8", None))
    if value is not None
)


def convert_to_native_types(obj):
    """Convert numpy and pandas-adjacent values to JSON-safe Python values."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    if NP_BOOL_TYPES and isinstance(obj, NP_BOOL_TYPES):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {key: convert_to_native_types(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [convert_to_native_types(item) for item in obj]
    return obj


def dataframe_records(result):
    if result is None:
        return []
    if hasattr(result, "to_dict"):
        return [
            convert_to_native_types(record)
            for record in result.to_dict(orient="records")
        ]
    if isinstance(result, list):
        return convert_to_native_types(result)
    return []


def success(data):
    return {"success": True, "data": convert_to_native_types(data), "error": None}


def failure(message, status_code=500, data=None):
    return {
        "success": False,
        "data": [] if data is None else convert_to_native_types(data),
        "error": message,
        "statusCode": status_code,
    }


app = FastAPI(
    title="Room Recommendation API",
    description="AI-powered room matching with real feature engineering",
    version="1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "model": "xgboost_retrained_with_real_features",
        "version": "1.0",
    }


@app.get("/recommend-room/{userId}")
def recommend(userId: str, top_k: int = 10):
    try:
        return dataframe_records(recommend_rooms(userId=userId, top_k=top_k))
    except Exception as error:
        print(f"[AI] recommend-room failed for user {userId}: {error}")
        return []


@app.get("/v1/recommend-room/{userId}")
def recommend_v1(userId: str, top_k: int = 10):
    try:
        return success(dataframe_records(recommend_rooms(userId=userId, top_k=top_k)))
    except Exception as error:
        print(f"[AI] v1 recommend-room failed for user {userId}: {error}")
        return failure(str(error), data=[])


@app.get("/match-roommates/{userId}/{roomId}")
def roommate_matching(userId: str, roomId: str):
    try:
        return dataframe_records(match_roommates(userId=userId, roomId=roomId))
    except Exception as error:
        print(f"[AI] match-roommates failed for user {userId}, room {roomId}: {error}")
        return []


@app.get("/v1/match-roommates/{userId}/{roomId}")
def roommate_matching_v1(userId: str, roomId: str):
    try:
        return success(dataframe_records(match_roommates(userId=userId, roomId=roomId)))
    except Exception as error:
        print(f"[AI] v1 match-roommates failed for user {userId}, room {roomId}: {error}")
        return failure(str(error), data=[])


@app.get("/compatibility-detail/{userId}/{roomId}")
def get_compatibility_detail(userId: str, roomId: str):
    result = get_detailed_compatibility(userId, roomId)
    if "error" in result and len(result) <= 2:
        raise HTTPException(status_code=404, detail=result.get("error"))
    return convert_to_native_types(result)


@app.get("/v1/compatibility-detail/{userId}/{roomId}")
def get_compatibility_detail_v1(userId: str, roomId: str):
    result = get_detailed_compatibility(userId, roomId)
    if "error" in result:
        status_code = 404 if len(result) <= 2 else 200
        return failure(result.get("error"), status_code=status_code, data=result)
    return success(result)


@app.get("/landlord/evaluate-applicant/{userId}/{roomId}")
def landlord_evaluate_applicant(userId: str, roomId: str):
    try:
        return convert_to_native_types(
            evaluate_user_for_landlord(userId=userId, roomId=roomId)
        )
    except Exception as error:
        print(f"[AI] landlord evaluate failed for user {userId}, room {roomId}: {error}")
        raise HTTPException(status_code=500, detail="Cannot evaluate applicant")


@app.get("/v1/landlord/evaluate-applicant/{userId}/{roomId}")
def landlord_evaluate_applicant_v1(userId: str, roomId: str):
    try:
        return success(evaluate_user_for_landlord(userId=userId, roomId=roomId))
    except Exception as error:
        print(f"[AI] v1 landlord evaluate failed for user {userId}, room {roomId}: {error}")
        return failure(str(error))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

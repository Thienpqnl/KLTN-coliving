
import os
import re
import threading
import time
import unicodedata

import pandas as pd
from decimal import Decimal
from utils.loader_supabase import (
    users_df,
    rooms_df,
    occupancy_df,
    interact_df, 
    model,
    cache_lock,
    use_ai_projections,
    refresh_projection_cache,
    get_cache_version,
    load_users_from_supabase,
    load_interactions_from_supabase,
    load_service_rows_live,
)
from services.similarity import (
    location_similarity,
    budget_similarity,
    binary_match,
    occupancy_ratio,
    cleanliness_compatibility,
    social_compatibility,
    sleep_compatibility,
    guest_tolerance_compatibility
)
from services.collaborative_filtering import calculate_collaborative_scores
from services.scoring import calculate_xgboost_score
from services.explain import explain_recommendation


_runtime_refresh_lock = threading.Lock()
_last_runtime_refresh = time.monotonic()
_runtime_generation = 1
_cf_cache_lock = threading.Lock()
_cf_cache = {}


def _cache_ttl_seconds(name: str, default: float) -> float:
    try:
        return max(0.0, float(os.getenv(name, str(default))))
    except (TypeError, ValueError):
        return default


MAJOR_CITY_DISTRICTS = {
    "HA_NOI": {
        "HOAN_KIEM", "BA_DINH", "NGOC_HA", "GIANG_VO", "DONG_DA", "VAN_MIEU",
        "LANG", "HAI_BA_TRUNG", "BACH_MAI", "VINH_TUY", "THANH_XUAN", "KHUONG_DINH",
        "CAU_GIAY", "NGHIA_DO", "YEN_HOA", "TAY_HO", "PHU_THUONG", "LONG_BIEN",
        "BO_DE", "VIET_HUNG", "HOANG_MAI", "LINH_DAM", "DINH_CONG", "HA_DONG",
        "DUONG_NOI", "VAN_PHUC", "NAM_TU_LIEM", "MY_DINH", "XUAN_PHUONG", "BAC_TU_LIEM",
        "MINH_KHAI", "CO_NHUE", "SON_TAY", "DONG_ANH", "ME_LINH", "SOC_SON",
        "GIA_LAM", "BAT_TRANG", "THANH_TRI", "TU_HIEP", "HOAI_DUC", "DAN_PHUONG",
        "THACH_THAT", "QUOC_OAI", "CHUONG_MY", "THUONG_TIN", "PHU_XUYEN", "UNG_HOA",
        "MY_DUC", "BA_VI", "PHUC_THO",
    },
    "HO_CHI_MINH": {
        "SAI_GON", "TAN_DINH", "BEN_THANH", "CAU_ONG_LANH", "BAN_CO", "XUAN_HOA",
        "NHIEU_LOC", "XOM_CHIEU", "KHANH_HOI", "VINH_HOI", "CHO_QUAN", "AN_DONG",
        "CHO_LON", "BINH_TAY", "BINH_TIEN", "BINH_PHU", "PHU_LAM", "TAN_THUAN",
        "PHU_THUAN", "TAN_MY", "TAN_HUNG", "CHANH_HUNG", "PHU_DINH", "BINH_DONG",
        "DIEN_HONG", "VUON_LAI", "HOA_HUNG", "MINH_PHUNG", "BINH_THOI", "HOA_BINH",
        "PHU_THO", "DONG_HUNG_THUAN", "TRUNG_MY_TAY", "TAN_THOI_HIEP", "THOI_AN", "AN_PHU_DONG",
        "AN_LAC", "TAN_TAO", "BINH_TAN", "BINH_TRI_DONG", "BINH_HUNG_HOA", "GIA_DINH",
        "BINH_THANH", "BINH_LOI_TRUNG", "THANH_MY_TAY", "BINH_QUOI", "HANH_THONG", "AN_NHON",
        "GO_VAP", "AN_HOI_DONG", "THONG_TAY_HOI", "AN_HOI_TAY", "DUC_NHUAN", "CAU_KIEU",
        "PHU_NHUAN", "TAN_SON_HOA", "TAN_SON_NHAT", "TAN_HOA", "BAY_HIEN", "TAN_BINH",
        "TAN_SON", "TAY_THANH", "TAN_SON_NHI", "PHU_THO_HOA", "TAN_PHU", "PHU_THANH",
        "HIEP_BINH", "THU_DUC", "TAM_BINH", "LINH_XUAN", "TANG_NHON_PHU", "LONG_BINH",
        "LONG_PHUOC", "LONG_TRUONG", "CAT_LAI", "BINH_TRUNG", "PHUOC_LONG", "AN_KHANH",
        "VINH_LOC", "TAN_VINH_LOC", "BINH_LOI", "TAN_NHUT", "BINH_CHANH", "HUNG_LONG",
        "BINH_HUNG", "BINH_KHANH", "AN_THOI_DONG", "CAN_GIO", "CU_CHI", "TAN_AN_HOI",
        "THAI_MY", "AN_NHON_TAY", "NHUAN_DUC", "PHU_HOA_DONG", "BINH_MY", "DONG_THANH",
        "HOC_MON", "XUAN_THOI_SON", "BA_DIEM", "NHA_BE", "HIEP_PHUOC", "LONG_SON",
        "HOA_HIEP", "BINH_CHAU", "THANH_AN", "DONG_HOA", "DI_AN", "TAN_DONG_HIEP",
        "THUAN_AN", "THUAN_GIAO", "BINH_HOA", "LAI_THIEU", "AN_PHU", "BINH_DUONG",
        "CHANH_HIEP", "THU_DAU_MOT", "PHU_LOI", "VINH_TAN", "BINH_CO", "TAN_UYEN",
        "TAN_HIEP", "TAN_KHANH", "HOA_LOI", "PHU_AN", "TAY_NAM", "LONG_NGUYEN",
        "BEN_CAT", "CHANH_PHU_HOA", "THOI_HOA", "BAC_TAN_UYEN", "THUONG_TAN", "AN_LONG",
        "PHUOC_THANH", "PHUOC_HOA", "PHU_GIAO", "TRU_VAN_THO", "BAU_BANG", "MINH_THANH",
        "LONG_HOA", "DAU_TIENG", "THANH_AN_BD", "VUNG_TAU", "TAM_THANG", "RACH_DUA",
        "PHUOC_THANG", "BA_RIA", "LONG_HUONG", "PHU_MY", "TAM_LONG", "TAN_THANH",
        "TAN_PHUOC", "TAN_HAI", "CHAU_PHA", "NGAI_GIAO", "BINH_GIA", "KIM_LONG",
        "CHAU_DUC", "XUAN_SON", "NGHIA_THANH", "HO_TRAM", "XUYEN_MOC", "HOA_HOI",
        "BAU_LAM", "PHUOC_HAI", "LONG_HAI", "DAT_DO", "LONG_DIEN", "CON_DAO",
    },
    "DA_NANG": {
        "HAI_CHAU", "THACH_THANG", "THANH_BINH", "SON_TRA", "AN_HAI", "NGU_HANH_SON",
        "HOA_XUAN", "CAM_LE", "HOA_THO", "LIEN_CHIEU", "HOA_KHANH", "THANH_KHE",
        "AN_KHE", "HOA_VANG", "HOA_BAC", "HOA_LIEN", "HOA_NINH", "HOANG_SA",
    },
}

MAJOR_CITY_ALIAS = {
    "HA_NOI": "HA_NOI",
    "HANOI": "HA_NOI",
    "HN": "HA_NOI",
    "HO_CHI_MINH": "HO_CHI_MINH",
    "HCM": "HO_CHI_MINH",
    "HCMC": "HO_CHI_MINH",
    "TPHCM": "HO_CHI_MINH",
    "SAI_GON": "HO_CHI_MINH",
    "DA_NANG": "DA_NANG",
    "DANANG": "DA_NANG",
    "DN": "DA_NANG",
}

MAJOR_CITY_GEO_BOUNDS = {
    "HA_NOI": {"lat_min": 20.80, "lat_max": 21.30, "lng_min": 105.55, "lng_max": 106.05},
    "HO_CHI_MINH": {"lat_min": 10.30, "lat_max": 11.20, "lng_min": 106.30, "lng_max": 107.05},
    "DA_NANG": {"lat_min": 15.90, "lat_max": 16.25, "lng_min": 107.95, "lng_max": 108.35},
}


def _safe_float(value, default=0.0):
    if value is None:
        return float(default)
    if isinstance(value, Decimal):
        return float(value)
    try:
        if pd.isna(value):
            return float(default)
    except (TypeError, ValueError):
        pass
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _safe_optional_float(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_location_token(value):
    text = str(value or "").strip().replace("Đ", "D").replace("đ", "d")
    text = "".join(
        character
        for character in unicodedata.normalize("NFD", text)
        if unicodedata.category(character) != "Mn"
    )
    return re.sub(r"[^A-Z0-9]+", "_", text.upper()).strip("_")


def _derive_preferred_coordinates(preferred_district, rooms: pd.DataFrame):
    district = str(preferred_district or "").strip()
    if not district or district.lower() == "all":
        return None, None

    if "districtId" not in rooms.columns:
        return None, None

    district_rooms = rooms[rooms["districtId"] == district]
    if district_rooms.empty:
        return None, None

    lat_series = pd.to_numeric(district_rooms.get("latitude"), errors="coerce")
    lng_series = pd.to_numeric(district_rooms.get("longitude"), errors="coerce")
    valid_mask = lat_series.notna() & lng_series.notna()
    if not valid_mask.any():
        return None, None

    target_lat = float(lat_series[valid_mask].median())
    target_lng = float(lng_series[valid_mask].median())
    return target_lat, target_lng


def _infer_major_city_from_geo(latitude, longitude):
    lat = _safe_optional_float(latitude)
    lng = _safe_optional_float(longitude)
    if lat is None or lng is None:
        return None
    for city, bounds in MAJOR_CITY_GEO_BOUNDS.items():
        if bounds["lat_min"] <= lat <= bounds["lat_max"] and bounds["lng_min"] <= lng <= bounds["lng_max"]:
            return city
    return None


def _infer_major_city(area_code, latitude=None, longitude=None, district_text=None, address_text=None):
    code = _normalize_location_token(area_code)
    if code in MAJOR_CITY_ALIAS:
        return MAJOR_CITY_ALIAS[code]
    for city, districts in MAJOR_CITY_DISTRICTS.items():
        if code in districts:
            return city

    city_from_geo = _infer_major_city_from_geo(latitude, longitude)
    if city_from_geo:
        return city_from_geo

    text = _normalize_location_token(f"{district_text or ''} {address_text or ''}")
    if "HA_NOI" in text or "HANOI" in text:
        return "HA_NOI"
    if "HO_CHI_MINH" in text or "TP_HCM" in text or "TPHCM" in text or "SAI_GON" in text:
        return "HO_CHI_MINH"
    if "DA_NANG" in text or "DANANG" in text:
        return "DA_NANG"

    return None


def _replace_in_place(target_df: pd.DataFrame, source_df: pd.DataFrame) -> None:
    target_df.drop(target_df.index, inplace=True)
    if len(target_df.columns) > 0:
        target_df.drop(columns=list(target_df.columns), inplace=True)
    for column in source_df.columns:
        target_df[column] = source_df[column].to_numpy(copy=True)
    target_df.reset_index(drop=True, inplace=True)


def _refresh_runtime_data() -> None:
    """Keep in-memory dataframes synchronized with latest preference/interaction changes."""
    global _last_runtime_refresh, _runtime_generation

    if use_ai_projections():
        # Projection data is loaded at service startup and refreshed by the RabbitMQ
        # projection consumer. Avoid seven synchronous database reads per request.
        # Only recover synchronously when the startup cache is unavailable.
        if users_df.empty or rooms_df.empty:
            with _runtime_refresh_lock:
                if users_df.empty or rooms_df.empty:
                    refresh_projection_cache()
        return

    ttl = _cache_ttl_seconds("AI_RUNTIME_CACHE_TTL_SECONDS", 60.0)
    now = time.monotonic()
    if now - _last_runtime_refresh < ttl:
        return

    with _runtime_refresh_lock:
        now = time.monotonic()
        if now - _last_runtime_refresh < ttl:
            return
        fresh_users = load_users_from_supabase()
        fresh_interactions = load_interactions_from_supabase()
        with cache_lock:
            _replace_in_place(users_df, fresh_users)
            _replace_in_place(interact_df, fresh_interactions)
        _runtime_generation += 1
        _last_runtime_refresh = now


def _collaborative_scores(user_id):
    data_version = get_cache_version() if use_ai_projections() else _runtime_generation
    ttl = _cache_ttl_seconds("AI_CF_CACHE_TTL_SECONDS", 60.0)
    now = time.monotonic()
    key = (data_version, user_id)

    with _cf_cache_lock:
        cached = _cf_cache.get(key)
        if cached and now - cached[0] < ttl:
            return cached[1]

    scores = calculate_collaborative_scores(interact_df, user_id)
    with _cf_cache_lock:
        _cf_cache.clear()
        _cf_cache[key] = (now, scores)
    return scores

def recommend_rooms(userId, top_k=10, preference_override=None):
    started_at = time.perf_counter()
    print(f"\n[RECOMMEND] ===== STARTING RECOMMENDATIONS =====")
    print(f"[RECOMMEND] User ID: {userId}, Top K: {top_k}")
    _refresh_runtime_data()
    refreshed_at = time.perf_counter()
    cf_scores_dict = _collaborative_scores(userId)
    cf_at = time.perf_counter()

    if users_df.empty or userId not in users_df["userId"].values:
        print(f" User {userId} không tìm thấy hoặc dữ liệu trống.")
        return pd.DataFrame()

    user = users_df[users_df["userId"] == userId].iloc[0].copy()
    if preference_override:
        field_mapping = {
            "budgetMinVnd": "budget_min_vnd",
            "budgetMaxVnd": "budget_max_vnd",
            "preferredCity": "preferred_city",
            "preferredDistrict": "preferred_location_district_id",
            "lifestyleArchetype": "lifestyle_archetype",
            "priorityCleanliness": "priority_cleanliness",
            "prioritySocialEnvironment": "priority_social_environment",
            "acceptSmokingRoommates": "accept_smoking_roommates",
            "acceptPets": "accept_pets",
        }
        for source_field, target_field in field_mapping.items():
            if source_field in preference_override:
                value = preference_override[source_field]
                if source_field == "preferredDistrict" and not value:
                    value = "all"
                user[target_field] = value
    user_budget_min = _safe_float(user.get("budget_min_vnd"), 3000000)
    user_budget_max = _safe_float(user.get("budget_max_vnd"), 15000000)
    priority_cleanliness = _safe_float(user.get("priority_cleanliness"), 3)
    priority_social_environment = _safe_float(user.get("priority_social_environment"), 3)
    preferred_city = user.get("preferred_city")
    preferred_district = user.get("preferred_location_district_id")
    preferred_major_city = _infer_major_city(preferred_city) or _infer_major_city(preferred_district)
    preferred_lat, preferred_lng = _derive_preferred_coordinates(preferred_district, rooms_df)

    def build_rows(enforce_preference_filters: bool, enforce_capacity: bool):
        rows = []
        for _, room in rooms_df.iterrows():
            room_major_city = _infer_major_city(
                room.get("districtId"),
                room.get("latitude"),
                room.get("longitude"),
                room.get("district"),
                room.get("address"),
            )
            if preferred_major_city and room_major_city != preferred_major_city:
                continue
            if enforce_capacity and room["current_occupants"] >= room["maxOccupants"]:
                continue
            if enforce_preference_filters and room.get("allowSmoking") == True and user.get("accept_smoking_roommates") == False:
                continue
            if enforce_preference_filters and room.get("allowPets") == False and user.get("accept_pets") == True:
                continue

            roomId = room["roomId"]
            cf_score = cf_scores_dict.get(roomId, 0.5)
            room_minimum_budget = _safe_float(room.get("minimumBudget"), 5000000)
            room_current_occupants = _safe_float(room.get("current_occupants"), 0)
            room_max_occupants = _safe_float(room.get("maxOccupants"), 1)
            room_latitude = _safe_optional_float(room.get("latitude"))
            room_longitude = _safe_optional_float(room.get("longitude"))

            row = {
                "location_similarity": location_similarity(
                    preferred_district,
                    room["districtId"],
                    preferred_lat,
                    preferred_lng,
                    room_latitude,
                    room_longitude,
                ),
                "major_city_match": 1.0 if preferred_major_city and preferred_major_city == room_major_city else 0.0,
                "budget_similarity": budget_similarity(user_budget_min, user_budget_max, room_minimum_budget),
                "smoking_match": binary_match(user["accept_smoking_roommates"], room["allowSmoking"]),
                "pet_match": binary_match(user["accept_pets"], room["allowPets"]),
                "sleep_similarity": sleep_compatibility(user["lifestyle_archetype"], room["preferredSleepHabit"]),
                "cleanliness_similarity": cleanliness_compatibility(priority_cleanliness, room["cleanlinessRequired"]),
                "social_similarity": social_compatibility(priority_social_environment, room["noiseTolerance"], room["guestPolicy"]),
                "guest_similarity": guest_tolerance_compatibility(priority_social_environment, room["guestPolicy"]),
                "occupancy_ratio": occupancy_ratio(room_current_occupants, room_max_occupants),
                "cf_score": cf_score,
                "roomId": roomId,
                "title": room.get("title", "Phòng Coliving"),
                "districtId": room["districtId"],
                "latitude": room_latitude,
                "longitude": room_longitude,
                "price": room_minimum_budget,
            }
            rows.append(row)
        return rows

    rows = build_rows(enforce_preference_filters=True, enforce_capacity=True)
    if not rows:
        print("[RECOMMEND] No strict-match rooms found; returning fallback default rooms.")
        rows = build_rows(enforce_preference_filters=False, enforce_capacity=True)

    if not rows:
        print("[RECOMMEND] All available rooms were filtered out by capacity; returning extended fallback rooms.")
        rows = build_rows(enforce_preference_filters=False, enforce_capacity=False)

    if not rows:
        print("[RECOMMEND] No rooms available to recommend.")
        return pd.DataFrame()

    recommend_df = pd.DataFrame(rows)

    def calculate_row_score(row):
        weights = {
            "major_city_match": 0.30,
            "location_similarity": 0.12,
            "budget_similarity": 0.12,
            "cleanliness_similarity": 0.12,
            "sleep_similarity": 0.10,
            "social_similarity": 0.08,
            "smoking_match": 0.08,
            "pet_match": 0.04,
            "occupancy_ratio": 0.04,
        }
        # Tính toán điểm Heuristic cơ bản
        colab_heuristic_score = sum(row.get(feat, 0.5) * weight for feat, weight in weights.items())
        # 80% Điểm Heuristic cốt lõi + 20% Điểm Lọc cộng tác hành vi thực tế (cf_score)
        final_score = (colab_heuristic_score * 0.80) + (row.get("cf_score", 0.5) * 0.20)
        
        return round(final_score, 4)
    
    # Áp dụng tính điểm
    recommend_df["recommendation_score"] = recommend_df.apply(calculate_row_score, axis=1)

    # Only the highest-ranked rows need human-readable explanations. Generating
    # explanations for every room adds work that is discarded by head(top_k).
    recommend_df = recommend_df.sort_values(by="recommendation_score", ascending=False).head(top_k).copy()
    scored_at = time.perf_counter()

    def apply_explanation(row):
        exp_data = explain_recommendation(row)
        return pd.Series({
            "status": exp_data["status"],
            "explanation": exp_data["explanation"],
            "score_breakdown": exp_data.get("score_breakdown"),
            "positive_reasons": exp_data.get("positive_reasons"),
            "concerns": exp_data.get("concerns"),
        })

    # Merge giải thích vào DataFrame
    explanation_df = recommend_df.apply(apply_explanation, axis=1)
    recommend_df = pd.concat([recommend_df, explanation_df], axis=1)

    finished_at = time.perf_counter()
    print(
        "[RECOMMEND][TIMING] "
        f"refresh={(refreshed_at - started_at) * 1000:.1f}ms "
        f"cf={(cf_at - refreshed_at) * 1000:.1f}ms "
        f"score={(scored_at - cf_at) * 1000:.1f}ms "
        f"explain={(finished_at - scored_at) * 1000:.1f}ms "
        f"total={(finished_at - started_at) * 1000:.1f}ms"
    )
    return recommend_df

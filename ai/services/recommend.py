
import pandas as pd
from utils.loader_supabase import (
    users_df,
    rooms_df,
    occupancy_df,
    interact_df, 
    model
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
from services.roommate import get_roommates
from services.explain import explain_recommendation

def recommend_rooms(user_id, top_k=10):
    print(f"\n[RECOMMEND] ===== STARTING RECOMMENDATIONS =====")
    print(f"[RECOMMEND] User ID: {user_id}, Top K: {top_k}")

    # 1. Chạy thuật toán Lọc cộng tác bằng cách lấy trực tiếp dữ liệu RAM `interact_df`
    cf_scores_dict = calculate_collaborative_scores(interact_df, user_id)

    if users_df.empty or user_id not in users_df["user_id"].values:
        print(f"⚠️ User {user_id} không tìm thấy hoặc dữ liệu trống.")
        return pd.DataFrame()

    user = users_df[users_df["user_id"] == user_id].iloc[0]
    rows = []

    # VÒNG LẶP DUYỆT QUA TẤT CẢ CÁC PHÒNG
    for _, room in rooms_df.iterrows():
        # Bước 1: Rule-based Matching (Lọc cứng điều kiện cơ bản)
        if room["current_occupants"] >= room["maxOccupants"]:
            continue
        if room.get("allowSmoking") == True and user.get("accept_smoking_roommates") == False: 
            continue
        if room.get("allowPets") == False and user.get("accept_pets") == True:
            continue

        room_id = room["roomId"]
        
        # 2. Lấy điểm Collaborative Filtering tương ứng của phòng (mặc định 0.5 nếu là Cold Start)
        cf_score = cf_scores_dict.get(room_id, 0.5)

        # Tính toán các chỉ số tương đồng (Feature Engineering)
        row = {
            "location_similarity": location_similarity(user["preferred_location_district_id"], room["districtId"]),
            "budget_similarity": budget_similarity(user["budget_min_vnd"], user["budget_max_vnd"], room["minimumBudget"]),
            "smoking_match": binary_match(user["accept_smoking_roommates"], room["allowSmoking"]),
            "pet_match": binary_match(user["accept_pets"], room["allowPets"]),
            "sleep_similarity": sleep_compatibility(user["lifestyle_archetype"], room["preferredSleepHabit"]),
            "cleanliness_similarity": cleanliness_compatibility(user["priority_cleanliness"], room["cleanlinessRequired"]),
            "social_similarity": social_compatibility(user["priority_social_environment"], room["noiseTolerance"], room["guestPolicy"]),
            "guest_similarity": guest_tolerance_compatibility(user["priority_social_environment"], room["guestPolicy"]),
            "occupancy_ratio": occupancy_ratio(room["current_occupants"], room["maxOccupants"]),
            
            # Đính kèm điểm Collaborative Filtering từ hành vi tương tác thực tế
            "cf_score": cf_score,
            
            "roomId": room["roomId"],
            "title": room.get("title", "Phòng Coliving"),
            "districtId": room["districtId"],
            "price": room["minimumBudget"]
        }
        rows.append(row)

    if not rows:
        return pd.DataFrame()

    recommend_df = pd.DataFrame(rows)

    # 3. HÀM TÍNH ĐIỂM CHỦ YẾU DỰA TRÊN MÔ HÌNH FILE COLAB (HEURISTIC WEIGHTED)
    def calculate_row_score(row):
        # Trọng số phân bổ ưu tiên chính xác theo cấu trúc mô hình file Colab Heuristic (Tổng = 1.0)
        weights = {
            "location_similarity": 0.15,
            "budget_similarity": 0.15,
            "cleanliness_similarity": 0.15,
            "sleep_similarity": 0.15,
            "social_similarity": 0.10,
            "smoking_match": 0.10,
            "pet_match": 0.10,
            "occupancy_ratio": 0.10
        }
        
        # Tính toán điểm Heuristic cơ bản
        colab_heuristic_score = sum(row.get(feat, 0.5) * weight for feat, weight in weights.items())

        # 🌟 CÔNG THỨC LAI GHÉP ƯU TIÊN PHÂN TÍCH LUẬN VĂN:
        # 80% Điểm Heuristic cốt lõi (từ file Colab) + 20% Điểm Lọc cộng tác hành vi thực tế (cf_score)
        final_score = (colab_heuristic_score * 0.80) + (row.get("cf_score", 0.5) * 0.20)
        
        return round(final_score, 4)
    
    # Áp dụng tính điểm
    recommend_df["recommendation_score"] = recommend_df.apply(calculate_row_score, axis=1)

    # Áp dụng giải thích văn phong mềm mại và lấy toàn bộ dữ liệu giải thích
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

    # Sắp xếp phòng có điểm tương thích cao nhất lên đầu
    recommend_df = recommend_df.sort_values(by="recommendation_score", ascending=False)
    
    return recommend_df.head(top_k)
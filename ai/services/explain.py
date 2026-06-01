# =====================================================
# EXPLAIN RECOMMENDATION
# =====================================================

def explain_recommendation(row):

    reasons = []

    # =================================================
    # LOCATION
    # =================================================

    if row["location_similarity"] >= 0.75:

        reasons.append(
            "Vị trí phù hợp với khu vực mong muốn"
        )

    elif row["location_similarity"] <= 0.4:

        reasons.append(
            "Vị trí chưa thật sự phù hợp"
        )

    # =================================================
    # BUDGET
    # =================================================

    if row["budget_similarity"] >= 0.75:

        reasons.append(
            "Ngân sách phù hợp"
        )

    elif row["budget_similarity"] <= 0.4:

        reasons.append(
            "Giá phòng chênh lệch khá nhiều so với ngân sách"
        )

    # =================================================
    # CLEANLINESS
    # =================================================

    if row["cleanliness_similarity"] >= 0.75:

        reasons.append(
            "Phong cách sống sạch sẽ tương đồng"
        )

    elif row["cleanliness_similarity"] <= 0.4:

        reasons.append(
            "Mức độ gọn gàng và sạch sẽ chưa tương đồng"
        )

    # =================================================
    # SOCIAL
    # =================================================

    if row["social_similarity"] >= 0.75:

        reasons.append(
            "Mức độ hòa đồng phù hợp"
        )

    elif row["social_similarity"] <= 0.4:

        reasons.append(
            "Phong cách sinh hoạt xã hội có sự khác biệt"
        )

    # =================================================
    # SLEEP
    # =================================================

    if row["sleep_similarity"] >= 0.75:

        reasons.append(
            "Thói quen sinh hoạt và giờ giấc phù hợp"
        )

    elif row["sleep_similarity"] <= 0.4:

        reasons.append(
            "Khác biệt về giờ giấc sinh hoạt"
        )

    # =================================================
    # SMOKING
    # =================================================

    if row["smoking_match"] >= 0.75:

        reasons.append(
            "Tương thích thói quen hút thuốc"
        )

    elif row["smoking_match"] <= 0.25:

        reasons.append(
            "Khác biệt về thói quen hút thuốc"
        )

    # =================================================
    # PET
    # =================================================

    if row["pet_match"] >= 0.75:

        reasons.append(
            "Chính sách thú cưng phù hợp"
        )

    elif row["pet_match"] <= 0.25:

        reasons.append(
            "Chính sách thú cưng chưa phù hợp"
        )

    # =================================================
    # OCCUPANCY
    # =================================================

    if row["occupancy_ratio"] >= 0.7:

        reasons.append(
            "Phòng còn khá thoải mái"
        )

    elif row["occupancy_ratio"] <= 0.35:

        reasons.append(
            "Phòng hiện có khá nhiều người ở"
        )

    # =================================================
    # ROOMMATE COMPATIBILITY
    # =================================================

    if "roommate_compatibility" in row:

        if row["roommate_compatibility"] >= 0.75:

            reasons.append(
                "Có độ hòa hợp tốt với bạn cùng phòng"
            )

        elif row["roommate_compatibility"] <= 0.4:

            reasons.append(
                "Khó hòa hợp với một số bạn cùng phòng hiện tại"
            )

    # =================================================
    # FALLBACK
    # =================================================

    if not reasons:

        reasons.append(
            "Mức độ phù hợp ở mức trung bình"
        )

    return reasons
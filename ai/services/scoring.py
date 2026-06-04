
import pandas as pd

def calculate_xgboost_score(scores_dict, model=None) -> float:
    if model is None:
        return calculate_weighted_score(scores_dict)
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

    row_data = {col: scores_dict.get(col, 0.5) for col in feature_columns}
    X = pd.DataFrame([row_data])

    try:
        prob = model.predict_proba(X)[0, 1]
        return round(prob * 100, 2)
    except Exception as e:
        print(f"[SCORING] XGBoost prediction error: {e}, fallback to weighted sum")
        return calculate_weighted_score(scores_dict)


def calculate_weighted_score(scores: dict) -> float:
    
    weights = {
        "location_similarity": 0.10,
        "budget_similarity": 0.20,
        "cleanliness_similarity": 0.15,
        "social_similarity": 0.10,
        "sleep_similarity": 0.20,
        "smoking_match": 0.05,
        "pet_match": 0.05,
        "occupancy_ratio": 0.05,
        "roommate_compatibility": 0.10,
    }
    

    weighted_sum = 0
    for key, weight in weights.items():
        score_value = scores.get(key, 0.5) 
        weighted_sum += score_value * weight

    normalized_score = weighted_sum * 100
    
    return round(normalized_score, 2)


def calculate_compatibility_score(scores: dict) -> float:
    return calculate_weighted_score(scores)

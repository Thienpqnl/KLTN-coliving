import os
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd


AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))
os.environ["AI_USE_PROJECTIONS"] = "true"
os.environ["USE_SERVICE_SCHEMAS"] = "true"
os.environ["AI_DATABASE_URL"] = ""
os.environ["DATABASE_URL"] = ""
os.environ["AI_SKIP_INITIAL_LOAD"] = "true"

from services import recommend  # noqa: E402
from services import room_user_similarity  # noqa: E402


class RecommendationOptimizationTests(unittest.TestCase):
    def setUp(self):
        recommend._cf_cache.clear()

    def test_projection_request_reuses_populated_memory_cache(self):
        with patch.object(recommend, "users_df", pd.DataFrame([{"userId": "u1"}])), \
             patch.object(recommend, "rooms_df", pd.DataFrame([{"roomId": "r1"}])), \
             patch.object(recommend, "refresh_projection_cache") as refresh:
            recommend._refresh_runtime_data()
        refresh.assert_not_called()

    def test_projection_request_recovers_when_startup_cache_is_empty(self):
        with patch.object(recommend, "users_df", pd.DataFrame()), \
             patch.object(recommend, "rooms_df", pd.DataFrame()), \
             patch.object(recommend, "refresh_projection_cache") as refresh:
            recommend._refresh_runtime_data()
        refresh.assert_called_once_with()

    def test_collaborative_scores_are_reused_for_same_cache_version(self):
        with patch.object(recommend, "get_cache_version", return_value=3), \
             patch.object(recommend, "calculate_collaborative_scores", return_value={"r1": 0.8}) as calculate:
            first = recommend._collaborative_scores("u1")
            second = recommend._collaborative_scores("u1")

        self.assertEqual(first, second)
        calculate.assert_called_once()

    def test_explanations_are_generated_only_for_top_k_rooms(self):
        users = pd.DataFrame(
            [{
                "userId": "u1",
                "budget_min_vnd": 3_000_000,
                "budget_max_vnd": 8_000_000,
                "preferred_location_district_id": "all",
                "lifestyle_archetype": "Young Professional",
                "priority_cleanliness": 3,
                "priority_social_environment": 3,
                "accept_smoking_roommates": False,
                "accept_pets": False,
            }]
        )
        rooms = pd.DataFrame(
            [{
                "roomId": f"r{i}",
                "title": f"Room {i}",
                "districtId": "D1",
                "district": "District 1",
                "address": "HCMC",
                "latitude": 10.77,
                "longitude": 106.70,
                "minimumBudget": 4_000_000 + i * 100_000,
                "current_occupants": 0,
                "maxOccupants": 2,
                "allowSmoking": False,
                "allowPets": False,
                "preferredSleepHabit": "NORMAL",
                "cleanlinessRequired": 3,
                "noiseTolerance": 3,
                "guestPolicy": "LIMITED",
            } for i in range(5)]
        )
        explanation = {
            "status": "GOOD",
            "explanation": "Phù hợp",
            "score_breakdown": {},
            "positive_reasons": [],
            "concerns": [],
        }

        with patch.object(recommend, "users_df", users), \
             patch.object(recommend, "rooms_df", rooms), \
             patch.object(recommend, "_refresh_runtime_data"), \
             patch.object(recommend, "_collaborative_scores", return_value={}), \
             patch.object(recommend, "explain_recommendation", return_value=explanation) as explain:
            result = recommend.recommend_rooms("u1", top_k=2)

        self.assertEqual(len(result), 2)
        self.assertEqual(explain.call_count, 2)

    def test_selected_city_excludes_rooms_from_other_cities(self):
        users = pd.DataFrame([{
            "userId": "u1",
            "budget_min_vnd": 3_000_000,
            "budget_max_vnd": 8_000_000,
            "preferred_city": "HO_CHI_MINH",
            "preferred_location_district_id": "all",
            "lifestyle_archetype": "Young Professional",
            "priority_cleanliness": 3,
            "priority_social_environment": 3,
            "accept_smoking_roommates": False,
            "accept_pets": False,
        }])
        rooms = pd.DataFrame([
            {
                "roomId": "da-nang-room", "title": "Phòng Đà Nẵng", "districtId": "AN_HAI",
                "district": "An Hải", "address": "Đà Nẵng", "minimumBudget": 4_000_000,
                "current_occupants": 0, "maxOccupants": 2, "allowSmoking": False,
                "allowPets": False, "preferredSleepHabit": "NORMAL",
                "cleanlinessRequired": 3, "noiseTolerance": 3, "guestPolicy": "LIMITED",
            },
            {
                "roomId": "hcm-room", "title": "Phòng TP.HCM", "districtId": "AN_KHANH",
                "district": "An Khánh", "address": "TP. Hồ Chí Minh", "minimumBudget": 4_000_000,
                "current_occupants": 0, "maxOccupants": 2, "allowSmoking": False,
                "allowPets": False, "preferredSleepHabit": "NORMAL",
                "cleanlinessRequired": 3, "noiseTolerance": 3, "guestPolicy": "LIMITED",
            },
        ])
        explanation = {
            "status": "GOOD", "explanation": "Phù hợp", "score_breakdown": {},
            "positive_reasons": [], "concerns": [],
        }

        with patch.object(recommend, "users_df", users), \
             patch.object(recommend, "rooms_df", rooms), \
             patch.object(recommend, "_refresh_runtime_data"), \
             patch.object(recommend, "_collaborative_scores", return_value={}), \
             patch.object(recommend, "explain_recommendation", return_value=explanation):
            result = recommend.recommend_rooms(
                "u1",
                top_k=12,
                preference_override={
                    "preferredCity": "DA_NANG",
                    "preferredDistrict": None,
                },
            )

        self.assertEqual(result["roomId"].tolist(), ["da-nang-room"])

    def test_vietnamese_city_name_and_new_ward_code_are_recognized(self):
        self.assertEqual(recommend._infer_major_city("AN_HAI"), "DA_NANG")
        self.assertEqual(
            recommend._infer_major_city(None, address_text="Phường Hải Châu, Đà Nẵng"),
            "DA_NANG",
        )

    def test_ai_city_areas_match_preference_form_options(self):
        source = (AI_ROOT.parent / "app" / "components" / "PreferenceQuestionnaire.tsx").read_text(
            encoding="utf-8"
        )
        markers = {
            "HO_CHI_MINH": '{selectedCity === "HO_CHI_MINH"',
            "HA_NOI": '{selectedCity === "HA_NOI"',
            "DA_NANG": '{selectedCity === "DA_NANG"',
        }
        ordered_cities = list(markers)
        starts = [source.index(markers[city], 4_000) for city in ordered_cities]
        starts.append(source.index("</select>", starts[-1]))

        for index, city in enumerate(ordered_cities):
            section = source[starts[index]:starts[index + 1]]
            form_codes = set(re.findall(r'<option value="([A-Z0-9_]+)">', section))
            self.assertSetEqual(recommend.MAJOR_CITY_DISTRICTS[city], form_codes)
        self.assertEqual(
            recommend._infer_major_city(None, latitude=16.0544, longitude=108.2022),
            "DA_NANG",
        )

    def test_compatibility_reuses_projection_frames(self):
        users = pd.DataFrame([{"userId": "u1"}])
        rooms = pd.DataFrame([{"roomId": "r1"}])
        occupancy = pd.DataFrame([{"roomId": "r1", "userId": "u2"}])

        with patch.object(room_user_similarity, "cached_users_df", users), \
             patch.object(room_user_similarity, "cached_rooms_df", rooms), \
             patch.object(room_user_similarity, "cached_occupancy_df", occupancy), \
             patch.object(room_user_similarity, "load_users_from_supabase") as load_users, \
             patch.object(room_user_similarity, "load_rooms_from_supabase") as load_rooms, \
             patch.object(room_user_similarity, "load_occupancy_from_supabase") as load_occupancy:
            actual_users, actual_rooms, actual_occupancy = room_user_similarity._runtime_frames()

        self.assertEqual(actual_users.iloc[0]["userId"], "u1")
        self.assertEqual(actual_rooms.iloc[0]["roomId"], "r1")
        self.assertEqual(actual_occupancy.iloc[0]["userId"], "u2")
        load_users.assert_not_called()
        load_rooms.assert_not_called()
        load_occupancy.assert_not_called()

    def test_compatibility_uses_latest_preference_snapshot(self):
        cached_user = pd.Series({
            "preferred_city": "HO_CHI_MINH",
            "preferred_location_district_id": "HANH_THONG",
        })

        updated_user = room_user_similarity.apply_preference_override(
            cached_user,
            {
                "preferredCity": "DA_NANG",
                "preferredDistrict": "HAI_CHAU",
            },
        )

        self.assertEqual(updated_user["preferred_city"], "DA_NANG")
        self.assertEqual(updated_user["preferred_location_district_id"], "HAI_CHAU")
        self.assertEqual(cached_user["preferred_location_district_id"], "HANH_THONG")


if __name__ == "__main__":
    unittest.main()

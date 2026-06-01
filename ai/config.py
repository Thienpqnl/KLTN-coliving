
import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "https://your-project.supabase.co"
)

SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY",
    "your-anon-key"
)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/coliving"
)

MODEL_PATH = "model/xgboost_room_recommendation_retrained.json"
MODEL_FALLBACK_PATH = "model/xgboost_room_recommendation.json"
DEFAULT_TOP_K = 10
MAX_TOP_K = 50

def validate_config():
    """
    Kiểm tra xem tất cả các cấu hình cần thiết có được thiết lập không
    """
    
    if SUPABASE_URL.startswith("https://your-project"):
        raise ValueError(
            " SUPABASE_URL chưa được cấu hình. "
            "Vui lòng thiết lập trong file .env"
        )
    
    if SUPABASE_KEY == "your-anon-key":
        raise ValueError(
            "SUPABASE_KEY chưa được cấu hình. "
            "Vui lòng thiết lập trong file .env"
        )
    
    print("✓ Supabase configuration is valid")

if __name__ == "__main__":
    validate_config()
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    print(f"DATABASE_URL: {DATABASE_URL[:50]}...")

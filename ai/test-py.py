from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL").strip()
key = os.getenv("SUPABASE_SERVICE_KEY").strip()

supabase = create_client(url, key)

response = (
    supabase
    .table("user_preferences")
    .select("*")
    .limit(1)
    .execute()
)

print(response.data)
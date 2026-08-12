import sys
from pathlib import Path

from dotenv import load_dotenv

AI_ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(AI_ROOT))
load_dotenv(AI_ROOT / ".env")

from services.projection_reconciliation import reconcile_projections


if __name__ == "__main__":
    result = reconcile_projections()
    print(result)

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from services.projection_reconciliation import reconcile_projections


if __name__ == "__main__":
    result = reconcile_projections()
    print(result)

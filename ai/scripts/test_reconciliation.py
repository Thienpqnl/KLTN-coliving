import os
import sys
import uuid
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).parents[1]))

from services.projection_reconciliation import reconcile_projections


def run():
    database_url = os.environ["AI_DATABASE_URL"]
    orphan_id = f"reconciliation-test-{uuid.uuid4()}"
    with psycopg.connect(database_url, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute('''
                SELECT p.room_id, r."title"
                FROM ai.room_profiles p
                JOIN property."Room" r ON r."id" = p.room_id
                ORDER BY p.room_id LIMIT 1
            ''')
            room_id, source_title = cursor.fetchone()
            cursor.execute("UPDATE ai.room_profiles SET title = %s WHERE room_id = %s", ("DRIFT_TEST", room_id))
            cursor.execute("INSERT INTO ai.room_profiles (room_id, title) VALUES (%s, %s)", (orphan_id, "ORPHAN_TEST"))

    result = reconcile_projections()
    with psycopg.connect(database_url, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT title FROM ai.room_profiles WHERE room_id = %s", (room_id,))
            repaired_title = cursor.fetchone()[0]
            cursor.execute("SELECT count(*) FROM ai.room_profiles WHERE room_id = %s", (orphan_id,))
            orphan_count = cursor.fetchone()[0]
    if result.get("status") != "COMPLETED":
        raise RuntimeError(f"Reconciliation did not complete: {result}")
    if repaired_title != source_title:
        raise RuntimeError(f"Room drift was not repaired: {repaired_title!r} != {source_title!r}")
    if orphan_count != 0:
        raise RuntimeError("Orphan projection was not removed")
    print(f"Reconciliation test OK: run={result['runId']}, details={result['details']}")


if __name__ == "__main__":
    run()

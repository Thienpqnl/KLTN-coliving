import os
import time

import psycopg
from dotenv import load_dotenv

load_dotenv()

ROOM_ID = os.getenv("AI_PROJECTION_TEST_ROOM_ID", "b99cea3c-45c7-49ca-9f11-bdd4eb144634")


def run():
    projection_database_url = os.environ["AI_DATABASE_URL"]
    source_database_url = os.getenv("AI_TEST_SOURCE_DATABASE_URL")
    if not source_database_url:
        raise RuntimeError(
            "AI_TEST_SOURCE_DATABASE_URL is required for this privileged integration test. "
            "Do not use the AI runtime database role for source writes."
        )

    with psycopg.connect(projection_database_url, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM ai.processed_events")
            before = cursor.fetchone()[0]

    with psycopg.connect(source_database_url, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute('SELECT "id" FROM identity."User" ORDER BY "createdAt" LIMIT 1')
            user_id = cursor.fetchone()[0]
            cursor.execute('SELECT "userId" FROM preference.user_preferences ORDER BY "createdAt" LIMIT 1')
            preference_user_id = cursor.fetchone()[0]
            cursor.execute('SELECT "id" FROM rental.occupancy ORDER BY "joinedAt" LIMIT 1')
            occupancy_id = cursor.fetchone()[0]
            cursor.execute('UPDATE property."Room" SET "title" = "title" WHERE "id" = %s', (ROOM_ID,))
            cursor.execute('UPDATE identity."User" SET "fullName" = "fullName" WHERE "id" = %s', (user_id,))
            cursor.execute('''
                UPDATE preference.user_preferences
                SET "priorityCleanliness" = "priorityCleanliness" WHERE "userId" = %s
            ''', (preference_user_id,))
            cursor.execute('UPDATE rental.occupancy SET "status" = "status" WHERE "id" = %s', (occupancy_id,))

    expected = [
        ("property.property_outbox_events", "property.room.changed", ROOM_ID),
        ("identity.identity_outbox_events", "identity.user.changed", user_id),
        ("preference.preference_outbox_events", "preference.user-preference.changed", preference_user_id),
        ("rental.rental_outbox_events", "rental.occupancy-profile.changed", occupancy_id),
    ]
    events = {}
    after = before
    for _ in range(60):
        time.sleep(1)
        with psycopg.connect(source_database_url, connect_timeout=10) as connection:
            with connection.cursor() as cursor:
                for table, event_type, aggregate_id in expected:
                    cursor.execute(f'''
                        SELECT "id", "status" FROM {table}
                        WHERE "eventType" = %s AND "aggregateId" = %s
                        ORDER BY "createdAt" DESC LIMIT 1
                    ''', (event_type, aggregate_id))
                    row = cursor.fetchone()
                    if row:
                        events[event_type] = row
        if len(events) == len(expected):
            ids = [event[0] for event in events.values()]
            with psycopg.connect(projection_database_url, connect_timeout=10) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT count(*) FROM ai.processed_events WHERE event_id = ANY(%s)",
                        (ids,),
                    )
                    if cursor.fetchone()[0] == len(expected):
                        cursor.execute("SELECT count(*) FROM ai.processed_events")
                        after = cursor.fetchone()[0]
                        break
    failures = [event_type for _, event_type, _ in expected if events.get(event_type, (None, None))[1] != "PUBLISHED"]
    if failures or after < before + len(expected):
        raise RuntimeError(f"Projection events failed: failures={failures}, before={before}, after={after}")
    print(f"Projection events OK: count={len(expected)}, before={before}, after={after}")


if __name__ == "__main__":
    run()

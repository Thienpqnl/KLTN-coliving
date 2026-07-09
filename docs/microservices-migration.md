# Coliving microservices migration

## Compatibility contract

The browser continues to call the existing Next.js `/api/*` routes. During the
migration, those routes act as a Backend for Frontend (BFF): they call an
extracted service when its URL is configured and otherwise execute the existing
local implementation. A service timeout or connection failure also falls back
to local code until the corresponding migration phase is signed off.

## Target bounded contexts

| Service | Port | Responsibility |
| --- | ---: | --- |
| Identity | 4001 | Authentication, users, roles, phone verification |
| Property | 4002 | Rooms, amenities, capacity rules, room verification |
| Rental | 4003 | Bookings, occupancy, contracts, deposits, utility bills |
| Community | 4004 | Reviews, favorites, shared resources, notifications |
| AI Matching | 8000 | Room and roommate recommendations, compatibility |

Booking, occupancy and contracts stay in the same Rental bounded context so a
confirmed booking and room capacity can be committed consistently.

## Current extraction

Property Service currently owns these read-only vertical slices:

- `GET /v1/rooms/map`
- `GET /v1/rooms`
- `GET /v1/rooms/available`
- `GET /v1/rooms/:id`

Their public contracts remain `/api/rooms/map`, `/api/rooms`,
`/api/rooms/available` and `/api/rooms/:id`; no frontend URL changes are
required. Room creation, update, deletion and host room listing now execute in
Property Service. Image/amenity replacement and verification reset are committed
inside a single transaction so a failed command cannot leave a partial room.

All `/v1/*` service endpoints require `x-internal-service-token` in production.
The BFF adds this header automatically from `INTERNAL_SERVICE_TOKEN` and sends
the authenticated user ID/role only when an endpoint needs authorization.

Identity Service currently owns login, registration, current-user lookup,
editable profile data and password changes. The browser still uses the existing
`/api/auth/*` and `/api/user/*` paths; the BFF continues to set the HTTP-only
cookie and preserves every existing response shape and role redirect.
Phone OTP creation, attempt limiting and verification are also owned by Identity
Service; the successful verification updates the OTP record and user identity in
one database transaction.

Rental Service currently owns booking and occupancy flows. The BFF routes keep
the existing `/api/bookings`, `/api/user/bookings`, `/api/host/bookings`,
`/api/host/occupancy/*` and `/api/user/occupancy` contracts while forwarding to
`RENTAL_SERVICE_URL` when configured. Booking confirmation and manual occupancy
changes use serializable transactions and shared capacity rules so rooms cannot
exceed `maxOccupants`.

## Local operation

1. Keep `.env` as the source for database and Supabase secrets.
2. Run `docker compose -f docker-compose.microservices.yml up --build`.
3. Set `PROPERTY_SERVICE_URL=http://localhost:4002` and
   `RENTAL_SERVICE_URL=http://localhost:4003` and
   `AI_SERVICE_URL=http://localhost:8000` for Next.js.
4. Run `npm run dev` as usual.

Without `PROPERTY_SERVICE_URL`, Next.js queries Prisma exactly as before.

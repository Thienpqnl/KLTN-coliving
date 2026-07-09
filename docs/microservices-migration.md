# Coliving microservices migration

## Compatibility contract

The browser continues to call the existing Next.js `/api/*` routes. During the
migration, those routes act as a Backend for Frontend (BFF): they call an
extracted service when its URL is configured and otherwise execute the existing
local implementation. A service timeout or connection failure also falls back
to local code until the corresponding migration phase is signed off.

The default runtime mode is strict microservice mode. When
`MICROSERVICE_STRICT` is unset or set to `true`, the BFF returns
`503 SERVICE_UNAVAILABLE` when a required service URL is missing or a service
cannot be reached, making the microservice dependency explicit instead of
silently using local fallback code. Set `MICROSERVICE_STRICT=false` only for
local debugging when you intentionally want to use the legacy fallback code.

## Target bounded contexts

| Service | Port | Responsibility |
| --- | ---: | --- |
| Identity | 4001 | Authentication, users, roles, phone verification |
| Property | 4002 | Rooms, amenities, capacity rules, room verification |
| Rental | 4003 | Bookings, occupancy, contracts, deposits, utility bills |
| Community | 4004 | Reviews, favorites, shared resources, notifications |
| Preference | 4005 | User room preferences and recommendation input profile |
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

Rental Service currently owns booking, occupancy, contract and utility-billing
flows. The BFF routes keep the existing `/api/bookings`, `/api/user/bookings`,
`/api/host/bookings`, `/api/host/occupancy/*`, `/api/user/occupancy`,
`/api/contracts/*`, `/api/admin/contracts` and `/api/utility-bills/*`
contracts while forwarding to `RENTAL_SERVICE_URL` when configured. Booking
confirmation, contract handover and manual occupancy changes use serializable
transactions and shared capacity rules so rooms cannot exceed `maxOccupants`.
Utility bill push notifications remain in the BFF because Firebase is still an
edge integration of the Next.js app; Rental Service returns the notification
intent together with the bill result.

Community Service currently owns favorites, room reviews, host/admin review
moderation, shared resources, shared-resource bookings, shared-space activities
and device-token registration. The existing `/api/favorites/*`,
`/api/reviews/*`, `/api/rooms/:id/reviews`,
`/api/host/reviews`, `/api/admin/reviews/*`,
`/api/host/resources/*`, `/api/rooms/:id/shared-resources/*`,
`/api/shared-resources/bookings/*` and `/api/device-tokens` routes remain the
browser-facing contract. Firebase push delivery still happens in the BFF; the
Community Service returns notification intents for actions that need FCM.

Preference Service currently owns user room-preference storage and update flows.
The existing `/api/preferences` route remains the browser-facing contract while
the BFF forwards reads and writes to `PREFERENCE_SERVICE_URL` when configured.

## Local operation

1. Keep `.env` as the source for database and Supabase secrets.
2. Run `docker compose -f docker-compose.microservices.yml up --build`.
3. Set `IDENTITY_SERVICE_URL=http://localhost:4001`,
   `PROPERTY_SERVICE_URL=http://localhost:4002`,
   `RENTAL_SERVICE_URL=http://localhost:4003`,
   `COMMUNITY_SERVICE_URL=http://localhost:4004`,
   `PREFERENCE_SERVICE_URL=http://localhost:4005` and
   `AI_SERVICE_URL=http://localhost:8000` for Next.js.
4. Run `npm run dev` as usual.

Without a service URL, Next.js returns `503 SERVICE_UNAVAILABLE` by default.
Set `MICROSERVICE_STRICT=false` only when you intentionally want Next.js to use
the legacy Prisma fallback while developing locally.

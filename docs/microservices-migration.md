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

### Rental and Property data boundary

Rental capacity decisions use the `rental_room_snapshots` projection instead
of reading `Room` directly. The projection has no Prisma relation or foreign
key to the Property model and contains only `roomId`, owner, availability,
capacity and display fields needed by Rental.

- Property exposes `GET /v1/internal/rooms/:id/rental-profile` and pushes room
  changes to `PUT /v1/internal/room-snapshots/:roomId`.
- Rental exposes `POST /v1/internal/rooms/availability` and room/admin rental
  statistics so Property does not query Booking or Occupancy tables.
- Occupancy changes are committed in Rental first, then projected back to
  Property through `PATCH /v1/internal/rooms/:id/occupancy`.
- Migration `20260710000000_add_rental_room_snapshots` backfills existing rooms;
  it does not delete or rewrite Room, Booking or Occupancy data.

This is the first database-ownership slice. Legacy relation declarations remain
in the shared Prisma schema for the temporary monolith fallback, but Rental
runtime queries no longer depend on the Property Room relation.

### Rental events and Transactional Outbox

Rental no longer joins Property's `Room` model when returning bookings,
contracts or applicant evaluations. Booking responses are composed from
`RentalRoomSnapshot`, while signed contract room data comes from the immutable
`contentSnapshot` stored with the contract.

Occupancy projection updates use a Transactional Outbox:

1. The occupancy change, Rental room projection and `RentalOutboxEvent` are
   written in the same database transaction.
2. Rental's outbox worker claims pending events and publishes them to the
   durable `coliving.events` RabbitMQ topic exchange.
3. Property consumes `rental.occupancy.changed` from its durable queue and
   updates `Room.currentOccupants` and the AVAILABLE/OCCUPIED status.
4. A broker failure leaves the event PENDING with exponential retry. Events
   move to DEAD after ten failed attempts instead of being silently lost.

Migrations `20260710010000_expand_rental_room_snapshots` and
`20260710020000_add_rental_outbox` add the response projection and outbox table.
Run `npx prisma migrate deploy` before restarting Rental and Property services.

### Central audit ownership

`AdminLog` is owned by Identity. Property and Community no longer write that
table when an admin approves a room or moderates a review. They publish the
`audit.admin.action.requested` integration event through RabbitMQ instead:

1. The domain update and a `PropertyOutboxEvent` or `CommunityOutboxEvent` are
   committed in the same local transaction.
2. Each service outbox worker publishes the event with its stable outbox ID and
   source service name.
3. Identity consumes the durable `identity-service.audit-events` queue and
   writes `IdentityInboxEvent` plus `AdminLog` in one transaction.
4. The unique inbox `eventId` makes redelivery idempotent, so an event can be
   acknowledged repeatedly without creating duplicate audit rows.

Identity-owned account administration still writes `AdminLog` directly because
the user change and log share the same bounded context. Legacy Next.js fallback
services may still contain local Prisma log writes, but strict microservice mode
does not execute those paths.

Migration `20260710030000_add_audit_outbox_inbox` creates both domain outboxes
and the Identity inbox. Run `npx prisma migrate deploy` before starting the new
workers.

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

### Identity and Preference boundaries

Identity runtime queries no longer join Booking, Room, Review, Invoice or
Preference data:

- User profile bookings are composed from Rental and profile reviews from
  Community.
- Admin user counters come from Rental (`bookings`) and Property (`rooms`)
  through batch count endpoints.
- Public user summaries contain only Identity-owned fields; roommate
  preferences remain owned by Preference/AI.
- Preference trusts the authenticated internal `x-user-id` and no longer reads
  the User table before every preference query or update.

Self-service account deletion is an idempotent privacy workflow. Rental first
blocks deletion while an active booking, contract or occupancy exists.
Community removes favorites/device tokens and hides review content; Preference
deletes the preference record. Only after those operations succeed does
Identity mark the user `DELETED`, replace credentials and redact personal
fields. The User row and ID remain for contract/audit referential integrity.
Locked and deleted accounts are rejected during login.

### Identity profile composition

Identity is now the only runtime owner that queries the `User` model. It exposes
token-protected internal profile contracts for the other bounded contexts:

- `POST /v1/internal/domain/users/batch` resolves many user IDs in one call.
- `POST /v1/internal/domain/users/search` resolves user IDs for role, status and
  admin search filters.
- `GET /v1/internal/domain/users/:id` resolves one domain-safe user profile.

Property uses these contracts for room owners, verification reviewers and
Community Manager assignment. Rental uses them for booking applicants and
occupancy members. Community uses them for review authors, resource bookings
and activity participants. These services store user IDs but no longer join the
Identity-owned `User` table. Password hashes and other authentication secrets
are never exposed by the internal profile API.

Contract parties are intentionally different: their names and contact details
come from the immutable `contentSnapshot` captured when the contract is
created. This preserves the signed legal content even if either party later
updates their Identity profile. Contract event actors are still resolved from
Identity for display.

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

### Community service boundaries

Community runtime code no longer reads Property or Rental tables directly:

- Favorites store only `userId` and `roomId`; room cards are composed from the
  Property batch profile API.
- Review eligibility is calculated by Rental from Booking and Contract data.
  Property supplies room ownership and display information.
- Shared resource booking and activity creation verify active occupancy through
  Rental instead of joining the Occupancy table.
- Resource creation, deletion and host approval verify room ownership through
  Property. This also prevents one host from managing another host's resource.
- Admin review search asks Property for matching room IDs and Identity for
  matching user IDs, then combines those IDs with Community-owned review
  filters.

The internal contracts are under `/v1/internal/community/*` in Property and
Rental. Community uses `IDENTITY_SERVICE_URL`, `PROPERTY_SERVICE_URL`,
`RENTAL_SERVICE_URL`, the shared internal token and the standard microservice
timeout. A required dependency failure is returned as `503` instead of falling
back to a cross-database query.

Preference Service currently owns user room-preference storage and update flows.
The existing `/api/preferences` route remains the browser-facing contract while
the BFF forwards reads and writes to `PREFERENCE_SERVICE_URL` when configured.

## Local operation

1. Keep `.env` as the source for database and Supabase secrets.
2. Run `docker compose -f docker-compose.microservices.yml up --build`.
   This also starts RabbitMQ on port `5672`; its local management console is
   exposed on `http://localhost:15672`.
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

## Schema-per-service migration

The Supabase PostgreSQL project can keep the legacy `public` schema while each
bounded context moves to an independently managed schema:

| Service | PostgreSQL schema | Prisma datamodel |
| --- | --- | --- |
| Identity | `identity` | `services/identity-service/prisma/schema.prisma` |
| Property | `property` | `services/property-service/prisma/schema.prisma` |
| Rental | `rental` | `services/rental-service/prisma/schema.prisma` |
| Community | `community` | `services/community-service/prisma/schema.prisma` |
| Preference | `preference` | `services/preference-service/prisma/schema.prisma` |

Each datamodel has its own generated Prisma client and baseline migration. Cross
context IDs such as `ownerId`, `userId` and `roomId` are scalar values without
database foreign keys. Local relations, such as Contract to ContractEvent or
Room to RoomImage, remain enforced inside the owning schema.

### Safe cutover

1. Back up the current Supabase database and stop application writes.
2. Use a direct PostgreSQL connection in `SCHEMA_SPLIT_DATABASE_URL`.
3. Run the non-destructive preparation tool:

   ```powershell
   $env:CONFIRM_SCHEMA_SPLIT="true"
   npm run schema:split:prepare
   ```

   It creates the five schemas, deploys each baseline migration, copies common
   columns from `public`, preserves UUIDs, converts enum values into each target
   schema's enum types and uses `ON CONFLICT DO NOTHING` for safe retries. It
   never drops, truncates or updates a `public` table.

4. Verify row counts independently:

   ```powershell
   npm run schema:split:verify
   ```

5. Set `IDENTITY_DATABASE_URL`, `PROPERTY_DATABASE_URL`,
   `RENTAL_DATABASE_URL`, `COMMUNITY_DATABASE_URL` and
   `PREFERENCE_DATABASE_URL` using the same Supabase connection with the
   matching `?schema=` value.
6. Restart the five services, then run end-to-end login, room, booking,
   contract, review and preference checks before accepting new writes.
7. Keep Next.js `DATABASE_URL` on `public` only for controlled legacy rollback.

Unset the five service database URLs to roll service processes back to the
legacy `public` schema. Do not run old and new writers concurrently for a long
period because this migration intentionally does not implement dual-write.

## AI projections

AI owns read models in the `ai` PostgreSQL schema and does not require the
service schemas to be exposed through Supabase Data API/PostgREST. The current
projection tables are `user_profiles`, `room_profiles`, `occupancy_profiles`
and `room_interactions`; `processed_events` reserves idempotency keys for the
incremental RabbitMQ consumer.

Bootstrap or reconcile the projections with:

```powershell
npm run ai:projections:bootstrap
```

On a fresh database, provision tables with an administrator connection before
creating the runtime role:

```powershell
$env:AI_PROVISION_SCHEMA="true"
npm run ai:projections:bootstrap
Remove-Item Env:AI_PROVISION_SCHEMA
npm run ai:database:configure-role
```

The command creates missing AI tables, replaces only projection rows and reads
the authoritative source schemas. It does not modify domain data. With
`USE_SERVICE_SCHEMAS=true` and `AI_USE_PROJECTIONS=true`, AI runtime queries
only the `ai` read models. Identity, Property, Preference and Rental publish
transactional outbox events for incremental updates. Bootstrap remains the
full reconciliation and recovery mechanism.

Run incremental reconciliation manually without truncating projections:

```powershell
npm run ai:projections:reconcile
```

AI also schedules this job using `AI_RECONCILIATION_INTERVAL_SECONDS` (24 hours
by default) and runs it once at startup when `AI_RECONCILIATION_RUN_ON_START`
is enabled. A PostgreSQL advisory lock prevents overlapping jobs. Each run is
recorded in `ai.projection_reconciliation_runs`, and `/health` exposes the last
scheduler result. Bootstrap remains reserved for initial creation or full
recovery.

The `ai_service_runtime` PostgreSQL role has column-level `SELECT` access only
to the source fields required by reconciliation and read/write access only to
schema `ai`. It cannot read `identity.User.password` and cannot update domain
tables. Rotate or recreate the role safely with:

```powershell
npm run ai:database:configure-role
```

The command backs up `.env` and `ai/.env`, rotates a random password, runs
positive and negative privilege checks, then updates `AI_DATABASE_URL` without
printing the credential.

`npm run ai:projections:test-event` intentionally performs no-op writes in the
source schemas to verify the complete outbox pipeline. Supply a separate
administrator URL through `AI_TEST_SOURCE_DATABASE_URL` only while running
this privileged integration test; never add that credential to the AI runtime
container.

## Central observability

The microservice Compose stack includes Prometheus and Grafana. Every HTTP
service exposes `/metrics`, returns an `x-correlation-id` response header and
writes a structured JSON access log containing service, correlation ID, path,
status and duration. Internal Node service clients forward the active
correlation ID so one request can be followed across service logs.

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Dashboard: `Coliving / Coliving Microservices Overview`

Grafana uses `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` (both default to
`admin` for local development). Set a non-default password in `.env` for any
shared or deployed environment. Prometheus keeps 15 days of metrics in a named
Docker volume; Grafana dashboards and datasource provisioning live under
`observability/` and are version controlled.

## API Gateway compatibility cutover

`api-gateway` is the single synchronous entry point between the Next.js BFF
and backend services. It runs on `http://localhost:4000` and provides an
explicit service allowlist, internal-token authentication, correlation ID,
rate limiting, body-size limits, upstream timeout handling, structured logs
and Prometheus metrics.

Next.js keeps its existing `app/api` routes as a compatibility layer, so the
browser contract does not change. When `API_GATEWAY_URL` is set, the shared BFF
client and direct AI calls use routes shaped like:

```text
/v1/services/property-service/v1/rooms
/v1/services/rental-service/v1/bookings
/v1/services/ai-service/v1/recommend-room/{userId}
```

To roll back locally, stop Next.js, remove or clear `API_GATEWAY_URL`, then
restart Next.js. The BFF will call each configured service URL directly again.
The gateway contains no domain business logic and services continue to require
`x-internal-service-token`.

## Event retries and dead-letter queues

Consumers retry failed messages a maximum of `EVENT_CONSUMER_MAX_RETRIES`
times (five by default). Retry attempts use the `x-retry-count` header. A
message that still fails is published to `RABBITMQ_DEAD_LETTER_EXCHANGE` and
stored in `<queue>.dlq`; `x-dead-reason` records the final failure.

Inspect the known dead-letter queues:

```powershell
npm run events:dlq:status
```

Replay only after correcting the payload or consumer bug:

```powershell
npm run events:dlq:replay -- ai-service.projections 20
```

Replay resets the retry count and acknowledges the DLQ message only after the
broker confirms publication to the primary exchange.

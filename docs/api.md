# API Reference

Base URL (local): `http://localhost:3000` · Format: JSON · Authentication: **none** (see the [README](../README.md#authentication-and-authorization)).

A machine-readable version of this document is available in [`openapi.yaml`](openapi.yaml).

> **About the examples.** Request and response examples below are written from the Prisma schema, the Zod validation schemas and the service code. They show the real field names, types and status codes, but they were not captured from a live server run. Values are illustrative. Fields such as `id`, `createdAt` and `updatedAt` will differ. `price` is returned as a **string** because Prisma serialises `Decimal` values that way.

## Contents

- [Conventions](#conventions)
- [Health](#health)
- [Patients](#patients)
- [Dentists](#dentists)
- [Dental Services](#dental-services)
- [Treatment Plans](#treatment-plans)
- [Appointments](#appointments)
- [Dental Visits](#dental-visits)

## Conventions

**Content type:** requests with a body must be `application/json`.

**IDs:** path parameter `:id` (and `:itemId`) must be a positive integer.

**Pagination:** list endpoints accept `page` (default `1`) and `limit` (`1–100`; default `10`, except appointments: default `50`) and return:

```json
{
  "data": [ /* ... */ ],
  "meta": { "total": 48, "page": 1, "limit": 10, "totalPages": 5 }
}
```

**Errors:** every error has a `message` and optionally `details`.

```json
{
  "message": "Validation failed",
  "details": [
    { "field": "phone", "message": "Phone must be a valid Egyptian mobile number" }
  ]
}
```

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Validation failed, malformed JSON, or a referenced entity in the body does not exist |
| `404` | Resource not found |
| `409` | Conflict: duplicate unique value, invalid state transition, or business rule violated |
| `500` | Unexpected server error |

**Partial updates:** `PATCH` bodies accept a subset of the create fields; at least one field is required.

**Activation flags:** records are enabled/disabled via `isActive`; list endpoints can filter with `?isActive=true|false`.

## Endpoint summary

| Module | Method | Path | Description |
|---|---|---|---|
| Health | GET | `/health` | Liveness check |
| Health | GET | `/health/db` | Database connectivity check (returns PostgreSQL version) |
| Patients | POST | `/patients` | Create a patient |
| Patients | GET | `/patients` | List patients (search, filter, paginate) |
| Patients | GET | `/patients/:id` | Get one patient |
| Patients | PATCH | `/patients/:id` | Update a patient |
| Patients | PATCH | `/patients/:id/deactivate` | Deactivate a patient |
| Dentists | POST | `/dentists` | Create a dentist |
| Dentists | GET | `/dentists` | List dentists |
| Dentists | GET | `/dentists/:id` | Get one dentist |
| Dentists | PATCH | `/dentists/:id` | Update a dentist |
| Dentists | PATCH | `/dentists/:id/status` | Activate / deactivate a dentist |
| Dentists | GET | `/dentists/:id/services` | List services a dentist offers |
| Dentists | PUT | `/dentists/:id/services` | Replace the services a dentist offers |
| Services | POST | `/services` | Create a dental service |
| Services | GET | `/services` | List services |
| Services | GET | `/services/:id` | Get one service |
| Services | PATCH | `/services/:id` | Update a service |
| Services | PATCH | `/services/:id/status` | Activate / deactivate a service |
| Services | GET | `/services/:id/dentists` | List dentists who offer a service |
| Treatment Plans | POST | `/treatment-plans` | Create a plan (optionally with items) |
| Treatment Plans | GET | `/treatment-plans` | List plans |
| Treatment Plans | GET | `/treatment-plans/:id` | Get a plan with its items |
| Treatment Plans | PATCH | `/treatment-plans/:id` | Update plan title / notes |
| Treatment Plans | POST | `/treatment-plans/:id/items` | Add an item to a plan |
| Treatment Plans | PATCH | `/treatment-plans/:id/items/:itemId` | Update an item (dentist / notes) |
| Treatment Plans | PATCH | `/treatment-plans/:id/items/:itemId/status` | Change an item's status |
| Treatment Plans | DELETE | `/treatment-plans/:id/items/:itemId` | Delete a `PENDING` item |
| Appointments | POST | `/appointments` | Book an appointment |
| Appointments | GET | `/appointments` | List appointments |
| Appointments | GET | `/appointments/:id` | Get one appointment |
| Appointments | PATCH | `/appointments/:id` | Reschedule / change dentist, service, notes |
| Appointments | PATCH | `/appointments/:id/status` | Confirm or cancel |
| Dental Visits | POST | `/dental-visit` | Start a visit from an appointment |
| Dental Visits | GET | `/dental-visit` | List visits |
| Dental Visits | GET | `/dental-visit/:id` | Get a visit with its procedures |
| Dental Visits | POST | `/dental-visit/:id/procedures` | Record a performed procedure |
| Dental Visits | PATCH | `/dental-visit/:id/notes` | Update visit notes |
| Dental Visits | POST | `/dental-visit/:id/complete` | Complete the visit |

> The visits router is mounted at `/dental-visit` (singular), exactly as in `src/app.ts`.

---

## Health

```bash
curl http://localhost:3000/health
```
```json
{ "status": "ok" }
```

```bash
curl http://localhost:3000/health/db
```
```json
{ "db": "ok", "version": "PostgreSQL 16.x ..." }
```

---

## Patients

### `POST /patients`

| Field | Type | Rules |
|---|---|---|
| `fileNumber` | string | required, 1–20 chars, unique |
| `name` | string | required, 2–100 chars |
| `phone` | string | required, Egyptian mobile `01[0125]` + 8 digits, unique |
| `dateOfBirth` | date | optional, not in the future |
| `notes` | string | optional, ≤ 500 chars |

```bash
curl -X POST http://localhost:3000/patients \
  -H "Content-Type: application/json" \
  -d '{
    "fileNumber": "PT-1001",
    "name": "Ahmed Mohamed",
    "phone": "01012345678",
    "dateOfBirth": "1990-04-12",
    "notes": "Prefers morning appointments."
  }'
```

`201 Created`
```json
{
  "id": 1,
  "fileNumber": "PT-1001",
  "name": "Ahmed Mohamed",
  "phone": "01012345678",
  "dateOfBirth": "1990-04-12T00:00:00.000Z",
  "notes": "Prefers morning appointments.",
  "isActive": true,
  "createdAt": "2026-11-16T09:05:00.000Z",
  "updatedAt": "2026-11-16T09:05:00.000Z"
}
```

Errors: `400` validation · `409` `{"message":"File number already exists"}` or `{"message":"Phone already exists"}`.

### `GET /patients`

Query: `search` (matches name or phone, case-insensitive), `isActive`, `page`, `limit`. Newest first.

```bash
curl "http://localhost:3000/patients?search=ahmed&isActive=true&page=1&limit=10"
```
```json
{
  "data": [ { "id": 1, "fileNumber": "PT-1001", "name": "Ahmed Mohamed", "...": "..." } ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### `GET /patients/:id`
Returns the patient object, or `404 {"message":"Patient not found"}`.

### `PATCH /patients/:id`
Any subset of the create fields. Duplicate `fileNumber`/`phone` → `409`.

### `PATCH /patients/:id/deactivate`
No body. Sets `isActive` to `false` and returns the patient. Deactivated patients cannot receive new appointments or treatment plans (`409 Patient is inactive`).

---

## Dentists

### `POST /dentists`

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, 2–100 chars |
| `specialty` | string | optional, 2–100 chars |
| `phone` | string | optional, Egyptian mobile format, unique |

```bash
curl -X POST http://localhost:3000/dentists \
  -H "Content-Type: application/json" \
  -d '{ "name": "Dr. Youssef Ali", "specialty": "General Dentist", "phone": "01098765432" }'
```

`201 Created`
```json
{
  "id": 2,
  "name": "Dr. Youssef Ali",
  "specialty": "General Dentist",
  "phone": "01098765432",
  "isActive": true,
  "createdAt": "2026-11-04T17:30:00.000Z",
  "updatedAt": "2026-11-04T17:30:00.000Z"
}
```

### `GET /dentists`
Query: `search` (name, specialty or phone), `isActive`, `page`, `limit`.

### `GET /dentists/:id` · `PATCH /dentists/:id`
Get / partially update. Duplicate phone → `409 Phone already exists`.

### `PATCH /dentists/:id/status`
Body: `{ "isActive": false }`. Returns the dentist.

### `GET /dentists/:id/services`
```json
{
  "id": 2,
  "name": "Dr. Youssef Ali",
  "services": [
    { "id": 3, "name": "Teeth Cleaning", "price": "550", "durationMin": 45, "isActive": true, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### `PUT /dentists/:id/services`
Replaces the dentist's services with exactly this set (duplicates are ignored, max 100).

```bash
curl -X PUT http://localhost:3000/dentists/2/services \
  -H "Content-Type: application/json" \
  -d '{ "serviceIds": [3, 4] }'
```

Returns the same shape as `GET /dentists/:id/services`. Errors: `400` `{"message":"Some services do not exist","details":{"missingServiceIds":[9]}}` · `409` `{"message":"Inactive services cannot be assigned","details":{"inactiveServiceIds":[5]}}`.

---

## Dental Services

### `POST /services`

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, 2–100 chars, unique (case-insensitive) |
| `price` | number | required, 0–1,000,000, at most 2 decimals |
| `durationMin` | integer | required, 5–480 |

```bash
curl -X POST http://localhost:3000/services \
  -H "Content-Type: application/json" \
  -d '{ "name": "Teeth Cleaning", "price": 550, "durationMin": 45 }'
```

`201 Created`
```json
{
  "id": 3,
  "name": "Teeth Cleaning",
  "price": "550",
  "durationMin": 45,
  "isActive": true,
  "createdAt": "2026-11-04T17:40:00.000Z",
  "updatedAt": "2026-11-04T17:40:00.000Z"
}
```

### `GET /services`
Query: `search` (name), `isActive`, `page`, `limit`. Sorted by name A→Z.

### `GET /services/:id` · `PATCH /services/:id`
Get / partially update. Duplicate name → `409 Service name already exists`.

### `PATCH /services/:id/status`
Body: `{ "isActive": false }`.

### `GET /services/:id/dentists`
```json
{ "id": 3, "name": "Teeth Cleaning", "dentists": [ { "id": 2, "name": "Dr. Youssef Ali", "...": "..." } ] }
```

---

## Treatment Plans

### `POST /treatment-plans`

| Field | Type | Rules |
|---|---|---|
| `patientId` | integer | required, must exist and be active |
| `title` | string | required, 2–150 chars |
| `notes` | string | optional, ≤ 1000 chars |
| `items` | array | optional (default `[]`), ≤ 50. Each: `{ serviceId, dentistId, notes? }` |

Each item's service and dentist must exist and be active, and the dentist must offer the service. The item **price is copied from the service** at this moment.

```bash
curl -X POST http://localhost:3000/treatment-plans \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "title": "Preventive Dental Care Plan",
    "notes": "Maintain oral health with cleaning and a focused restorative review.",
    "items": [
      { "serviceId": 3, "dentistId": 2, "notes": "Routine cleaning." },
      { "serviceId": 4, "dentistId": 2, "notes": "Assess filling at review." }
    ]
  }'
```

`201 Created`
```json
{
  "id": 10,
  "patientId": 1,
  "title": "Preventive Dental Care Plan",
  "notes": "Maintain oral health with cleaning and a focused restorative review.",
  "createdAt": "2026-11-16T11:30:00.000Z",
  "updatedAt": "2026-11-16T11:30:00.000Z",
  "patient": { "id": 1, "name": "Ahmed Mohamed", "fileNumber": "PT-1001" },
  "items": [
    {
      "id": 21, "planId": 10, "serviceId": 3, "dentistId": 2,
      "price": "550", "status": "PENDING", "notes": "Routine cleaning.",
      "createdAt": "2026-11-16T11:30:00.000Z", "updatedAt": "2026-11-16T11:30:00.000Z",
      "service": { "id": 3, "name": "Teeth Cleaning" },
      "dentist": { "id": 2, "name": "Dr. Youssef Ali" }
    },
    {
      "id": 22, "planId": 10, "serviceId": 4, "dentistId": 2,
      "price": "700", "status": "PENDING", "notes": "Assess filling at review.",
      "createdAt": "2026-11-16T11:30:00.000Z", "updatedAt": "2026-11-16T11:30:00.000Z",
      "service": { "id": 4, "name": "Tooth Filling" },
      "dentist": { "id": 2, "name": "Dr. Youssef Ali" }
    }
  ],
  "summary": { "totalItems": 2, "completedItems": 0, "remainingItems": 2 }
}
```

Errors: `400` `{"message":"Patient does not exist"}` · `409` `{"message":"Patient is inactive"}` · `400`/`409` `{"message":"Some plan items are invalid","details":[{"itemIndex":1,"field":"dentistId","message":"Dentist does not provide this service"}]}` (`400` if something is missing, `409` otherwise).

### `GET /treatment-plans`
Query: `patientId`, `hasRemaining` (`true` = at least one item not completed; `false` = all items completed or no items), `page`, `limit`. Each row has `patient`, plan fields and `summary` (no items).

### `GET /treatment-plans/:id`
Full plan (as in the create response). `404 {"message":"Treatment plan not found"}`.

### `PATCH /treatment-plans/:id`
Body: `title` and/or `notes` (`notes` may be `null`). Returns the full plan.

### `POST /treatment-plans/:id/items`
Body: `{ "serviceId", "dentistId", "notes"? }`. Same checks as above.

`201 Created`
```json
{
  "item": { "id": 23, "planId": 10, "serviceId": 3, "dentistId": 2, "price": "550", "status": "PENDING", "notes": null, "service": { "id": 3, "name": "Teeth Cleaning" }, "dentist": { "id": 2, "name": "Dr. Youssef Ali" }, "createdAt": "...", "updatedAt": "..." },
  "summary": { "totalItems": 3, "completedItems": 0, "remainingItems": 3 }
}
```

### `PATCH /treatment-plans/:id/items/:itemId`
Body: `dentistId` and/or `notes` (nullable). A new dentist must be active and offer the item's service. Completed items → `409 Completed items cannot be edited`. Returns the item.

### `PATCH /treatment-plans/:id/items/:itemId/status`
Body: `{ "status": "IN_PROGRESS" }` (`PENDING` → `IN_PROGRESS` | `COMPLETED`; `IN_PROGRESS` → `COMPLETED`).

```json
{
  "item": { "id": 21, "status": "IN_PROGRESS", "...": "..." },
  "summary": { "totalItems": 2, "completedItems": 0, "remainingItems": 2 }
}
```

Invalid transition → `409`:
```json
{
  "message": "Cannot change status from COMPLETED to PENDING",
  "details": { "from": "COMPLETED", "to": "PENDING", "allowed": [] }
}
```

### `DELETE /treatment-plans/:id/items/:itemId`
Only `PENDING` items. Returns `200 { "summary": { ... } }`; otherwise `409 Only pending items can be deleted`.

---

## Appointments

### `POST /appointments`

| Field | Type | Rules |
|---|---|---|
| `patientId` | integer | required, active patient |
| `dentistId` | integer | required, active dentist who offers the service |
| `serviceId` | integer | required, active service |
| `startAt` | string | required, ISO 8601 **with offset**, must be in the future |
| `durationMin` | integer | optional, 5–480; defaults to the service's `durationMin` |
| `notes` | string | optional, ≤ 500 chars |

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "dentistId": 2,
    "serviceId": 3,
    "startAt": "2026-11-25T10:00:00+02:00",
    "notes": "First cleaning"
  }'
```

`201 Created`
```json
{
  "id": 7,
  "patientId": 1,
  "dentistId": 2,
  "serviceId": 3,
  "startAt": "2026-11-25T08:00:00.000Z",
  "endAt": "2026-11-25T08:45:00.000Z",
  "status": "SCHEDULED",
  "notes": "First cleaning",
  "cancelReason": null,
  "createdAt": "2026-11-22T12:00:00.000Z",
  "updatedAt": "2026-11-22T12:00:00.000Z",
  "patient": { "id": 1, "name": "Ahmed Mohamed", "fileNumber": "PT-1001", "phone": "01012345678" },
  "dentist": { "id": 2, "name": "Dr. Youssef Ali" },
  "service": { "id": 3, "name": "Teeth Cleaning", "durationMin": 45 }
}
```

Errors:
- `400` `{"message":"Appointment must start in the future","details":[{"field":"startAt","message":"..."}]}`
- `400`/`409` `{"message":"Appointment cannot be booked","details":[{"field":"dentistId","message":"Dentist does not provide this service"}]}`
- `409` double booking:
```json
{
  "message": "Dentist is not available at this time",
  "details": {
    "conflictingAppointment": { "id": 5, "startAt": "2026-11-25T07:30:00.000Z", "endAt": "2026-11-25T08:15:00.000Z" }
  }
}
```

### `GET /appointments`
Query: `date` (`YYYY-MM-DD`, interpreted in `CLINIC_TIMEZONE`), `dentistId`, `patientId`, `status` (`SCHEDULED|CONFIRMED|CANCELLED|COMPLETED`), `page`, `limit` (default 50). Ordered by start time. When `date` is given, `meta.range` echoes the UTC window and time zone used:

```json
"meta": {
  "total": 3, "page": 1, "limit": 50, "totalPages": 1,
  "range": { "from": "2026-11-21T22:00:00.000Z", "to": "2026-11-22T22:00:00.000Z", "timeZone": "Africa/Cairo" }
}
```

### `GET /appointments/:id`
Returns the appointment with `patient`, `dentist`, `service`.

### `PATCH /appointments/:id`
Any of `startAt`, `durationMin`, `dentistId`, `serviceId`, `notes` (nullable). Only `SCHEDULED`/`CONFIRMED` appointments can be edited. Changing the schedule, dentist or service re-runs the availability check (ignoring this appointment). Changing the service without sending `durationMin` resets the duration to the new service's.

### `PATCH /appointments/:id/status`
```json
{ "status": "CANCELLED", "cancelReason": "Patient called to cancel" }
```
`status` is `CONFIRMED` or `CANCELLED`; `cancelReason` (2–300 chars) is allowed only with `CANCELLED`. Allowed: `SCHEDULED → CONFIRMED | CANCELLED`, `CONFIRMED → CANCELLED`. Otherwise:
```json
{
  "message": "Cannot change status from CANCELLED to CONFIRMED",
  "details": { "from": "CANCELLED", "to": "CONFIRMED", "allowed": [] }
}
```

---

## Dental Visits

Mounted at `/dental-visit`.

### `POST /dental-visit`
Body: `{ "appointmentId": 7, "notes"?: string (≤ 5000) }`. The appointment must be `SCHEDULED` or `CONFIRMED` and must not already have a visit. The visit inherits the appointment's patient and dentist.

`201 Created` (abbreviated; the real response embeds the full `appointment` (with its `service`), `patient`, `dentist` and `procedures` rows)
```json
{
  "id": 4,
  "appointmentId": 7,
  "patientId": 1,
  "dentistId": 2,
  "status": "ACTIVE",
  "notes": null,
  "startedAt": "2026-11-25T08:02:00.000Z",
  "completedAt": null,
  "appointment": { "id": 7, "status": "CONFIRMED", "service": { "id": 3, "name": "Teeth Cleaning" } },
  "patient": { "id": 1, "name": "Ahmed Mohamed" },
  "dentist": { "id": 2, "name": "Dr. Youssef Ali" },
  "procedures": []
}
```

Errors: `404 Appointment not found` · `409 Appointment is not in a valid state for a visit` · `409 A visit already exists for this appointment`.

### `GET /dental-visit`
Query: `patientId`, `dentistId`, `status` (`ACTIVE|COMPLETED`), `page`, `limit`. Newest first.

### `GET /dental-visit/:id`
Visit with appointment, patient, dentist and procedures (ordered by `performedAt`).

### `POST /dental-visit/:id/procedures`
Body: `{ "serviceId": 3, "treatmentPlanItemId"?: 21, "notes"?: string (≤ 2000) }`

```bash
curl -X POST http://localhost:3000/dental-visit/4/procedures \
  -H "Content-Type: application/json" \
  -d '{ "serviceId": 3, "treatmentPlanItemId": 21, "notes": "Cleaning completed" }'
```

`201 Created`
```json
{
  "id": 9,
  "visitId": 4,
  "serviceId": 3,
  "treatmentPlanItemId": 21,
  "notes": "Cleaning completed",
  "performedAt": "2026-11-25T08:40:00.000Z",
  "createdAt": "2026-11-25T08:40:00.000Z",
  "service": { "id": 3, "name": "Teeth Cleaning", "price": "550", "durationMin": 45, "isActive": true, "createdAt": "...", "updatedAt": "..." },
  "treatmentPlanItem": { "id": 21, "planId": 10, "status": "COMPLETED", "...": "..." }
}
```

When `treatmentPlanItemId` is given, the item must belong to a plan of the same patient, be assigned to the visit's dentist, match `serviceId`, and not be completed; the item is then marked `COMPLETED` in the same transaction. The embedded `treatmentPlanItem` is the item as read before that update, so its `status` in this response is the previous one (`PENDING` or `IN_PROGRESS`); fetch the plan to see `COMPLETED`.

Errors: `404 Dental visit not found` · `404 Treatment plan item not found` · `400 Treatment plan item must match the visit patient, dentist, and service` · `409 Procedures cannot be added to a completed visit` · `409 Treatment plan item is already completed` · `409 This treatment plan item is already recorded for the visit`.

### `PATCH /dental-visit/:id/notes`
Body: `{ "notes": "Patient tolerated the procedure well." }` (or `null` to clear). Only while `ACTIVE`; otherwise `409 Notes cannot be changed after the visit is completed`. Returns the visit.

### `POST /dental-visit/:id/complete`
No body. Marks the visit `COMPLETED` (sets `completedAt`) and its appointment `COMPLETED` in one transaction. Returns the visit. Completing twice → `409 Dental visit is already completed`.

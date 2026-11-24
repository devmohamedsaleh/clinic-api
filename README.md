<div align="center">

# 🦷 Dental Care Clinic API

A TypeScript / Express / PostgreSQL REST API for managing a dental clinic: patients, dentists, services, treatment plans, appointments and dental visits.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4.x-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)

</div>

---

## At a Glance

| | |
|---|---|
| **What it is** | The backend (REST API) of a dental clinic management system |
| **Business flow covered** | Patients → Dentists & Services → Treatment Plans → Appointments → Dental Visits |
| **Size** | 6 business modules · 39 API endpoints · 9 database tables · 8 migrations · 12 unit tests |
| **Stack** | TypeScript · Node.js · Express 5 · PostgreSQL · Prisma 7 · Zod |
| **Documentation** | Full API reference, OpenAPI 3 spec, architecture and database docs (see [`docs/`](docs/)) |
| **Status** | Backend implemented for all 6 modules; authentication is planned (see [Future Improvements](#future-improvements)) |
| **Built by** | [@devmohamedsaleh](https://github.com/devmohamedsaleh) |

## What This Project Demonstrates

- **Clean, layered backend design:** every module is split into routes, controllers, services and validation, with one global error handler.
- **Input validation and clear errors:** all requests are validated with Zod and failures return a consistent JSON error format.
- **Real business rules:** only active patients, dentists and services can be used; a dentist can only be booked for services they offer; treatment-plan items and appointments follow explicit status flows.
- **Data integrity under concurrency:** double bookings are blocked by the database itself (a PostgreSQL exclusion constraint), and multi-step operations such as completing a visit run inside transactions.
- **Relational data modelling:** 9 related tables, many-to-many and one-to-one relations, indexes and versioned SQL migrations.
- **Testing and documentation:** unit tests for the visit workflow, a hand-written OpenAPI 3 specification, and architecture and database documents with diagrams.

## Screenshots Preview

The clinic's web application is a separate frontend project; its screenshots are shown here to demonstrate the system in use. Click any image to view it full size, or jump to the [full gallery with captions](#web-application-screenshots).

<p align="center">
  <a href="docs/screenshots/01-dashboard-overview.png"><img src="docs/screenshots/01-dashboard-overview.png" alt="Dashboard overview" width="100%"></a>
  <br><sub><b>Dashboard:</b> clinic summary and today's appointments</sub>
</p>

<table>
  <tr>
    <td width="50%"><a href="docs/screenshots/03-patients-list.png"><img src="docs/screenshots/03-patients-list.png" alt="Patients list"></a><br><sub><b>Patients:</b> search, filters and status</sub></td>
    <td width="50%"><a href="docs/screenshots/04-patient-details.png"><img src="docs/screenshots/04-patient-details.png" alt="Patient details"></a><br><sub><b>Patient profile:</b> personal and medical information</sub></td>
  </tr>
  <tr>
    <td width="50%"><a href="docs/screenshots/07-dentists-list.png"><img src="docs/screenshots/07-dentists-list.png" alt="Dentists list"></a><br><sub><b>Dentists:</b> specialties, contacts and status</sub></td>
    <td width="50%"><a href="docs/screenshots/09-dental-services.png"><img src="docs/screenshots/09-dental-services.png" alt="Dental services"></a><br><sub><b>Dental services:</b> catalogue with price and duration</sub></td>
  </tr>
  <tr>
    <td width="50%"><a href="docs/screenshots/10-treatment-plans-list.png"><img src="docs/screenshots/10-treatment-plans-list.png" alt="Treatment plans list"></a><br><sub><b>Treatment plans:</b> progress and status tracking</sub></td>
    <td width="50%"><a href="docs/screenshots/12-treatment-plan-details.png"><img src="docs/screenshots/12-treatment-plan-details.png" alt="Treatment plan details"></a><br><sub><b>Plan details:</b> cost, progress and assigned dentist</sub></td>
  </tr>
</table>

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features and Business Modules](#key-features-and-business-modules)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema and Relationships](#database-schema-and-relationships)
6. [Authentication and Authorization](#authentication-and-authorization)
7. [API Documentation](#api-documentation)
8. [Web Application Screenshots](#web-application-screenshots)
9. [Installation and Setup](#installation-and-setup)
10. [Environment Variables](#environment-variables)
11. [Running the Project Locally](#running-the-project-locally)
12. [Project Structure](#project-structure)
13. [Future Improvements](#future-improvements)

---

## Project Overview

This repository is the **backend** of a Dental Care Management System. It exposes a JSON REST API that covers the clinic's core workflow end to end:

> register patients → maintain dentists and the service catalogue → build treatment plans → book appointments → run the dental visit → record the procedures performed.

The emphasis is on **correct business rules and data integrity**: validated input, explicit state machines, transactional multi-step operations, and double-booking prevention enforced by PostgreSQL itself.

The clinic's web application is a **separate frontend project**. Screenshots of it are included [below](#web-application-screenshots) to show the system in use; no frontend code lives in this repository.

## Key Features and Business Modules

| Module | What it does |
|---|---|
| **Patients** | Create, search, update and deactivate patients. Unique file number and Egyptian mobile number; optional date of birth and notes. |
| **Dentists** | Manage dentists (name, optional specialty and phone), activate/deactivate them, and assign which dental services each dentist offers. |
| **Dental Services** | Service catalogue with price and default duration; activate/deactivate; see which dentists offer a service. |
| **Treatment Plans** | A titled plan per patient made of items (service + dentist). The price is snapshotted from the service when an item is added. Items follow a status flow `PENDING → IN_PROGRESS → COMPLETED`; each plan response includes a progress summary. |
| **Appointments** | Book, reschedule, confirm and cancel appointments. Duration defaults to the service's duration; overlapping bookings for the same dentist are rejected. Filter by day (in the clinic time zone), dentist, patient and status. |
| **Dental Visits** | Start a visit from an appointment, record performed procedures (optionally fulfilling a treatment-plan item), edit notes, and complete the visit, which also completes the appointment. |

Cross-cutting capabilities:

- Request validation with **Zod** and a uniform `{ message, details }` error format.
- **Pagination, search and filters** on every list endpoint.
- **Race-safe state changes** (compare-and-set updates and transactions).
- **Database-level double-booking guard** (`EXCLUDE USING gist` constraint).
- **Time-zone-aware** day filtering (`CLINIC_TIMEZONE`, default `Africa/Cairo`).
- Health checks for the service and the database.
- Unit tests for the dental-visit workflow using an in-memory fake of the Prisma client.

## Technology Stack

| Concern | Technology |
|---|---|
| Language | TypeScript 7 (ES modules, `strict`) |
| Runtime | Node.js |
| Web framework | Express 5 |
| Database | PostgreSQL |
| ORM / migrations | Prisma 7 with the `@prisma/adapter-pg` driver adapter (`pg`) |
| Validation | Zod 4 |
| Dates / time zones | `@date-fns/tz` |
| Configuration | `dotenv` |
| Dev tooling | `tsx` (watch mode and runtime), `tsc --noEmit` type-checking |
| Testing | Node.js built-in test runner (`node --test`) |
| API docs | OpenAPI 3 specification in [`docs/openapi.yaml`](docs/openapi.yaml) |

## Backend Architecture

A layered, feature-module design:

```mermaid
flowchart LR
    C[HTTP client] --> E["Express app<br/>express.json()"]
    E --> R["Router"]
    R --> K["Controller<br/>Zod validation"]
    K --> S["Service<br/>business rules + transactions"]
    S --> P["Prisma Client"]
    P --> D[(PostgreSQL)]
    K -. errors .-> H["Global errorHandler"]
    S -. errors .-> H
```

- **Router → Controller → Service** per module, each with its own Zod `validation.ts`.
- Services throw a typed `AppError(status, message, details)`; one global handler turns it into the JSON error response.
- Pure, testable rules are separated from I/O (for example `dental-visits.rules.ts`).
- Concurrency is handled with conditional updates, transactions and a PostgreSQL exclusion constraint.

📄 Full details, including the request lifecycle, error table, state machines and concurrency design: **[docs/architecture.md](docs/architecture.md)**.

## Database Schema and Relationships

Nine tables: `Patient`, `Dentist`, `DentalService`, `DentistService` (join), `TreatmentPlan`, `TreatmentPlanItem`, `Appointment`, `DentalVisit` and `PerformedProcedure`.

```mermaid
erDiagram
    Patient ||--o{ TreatmentPlan : has
    Patient ||--o{ Appointment : books
    Patient ||--o{ DentalVisit : attends
    Dentist ||--o{ DentistService : offers
    DentalService ||--o{ DentistService : "offered by"
    TreatmentPlan ||--o{ TreatmentPlanItem : contains
    DentalService ||--o{ TreatmentPlanItem : "planned as"
    Dentist ||--o{ TreatmentPlanItem : "assigned to"
    Dentist ||--o{ Appointment : "treats in"
    DentalService ||--o{ Appointment : "booked for"
    Appointment ||--o| DentalVisit : "results in"
    Dentist ||--o{ DentalVisit : performs
    DentalVisit ||--o{ PerformedProcedure : records
    DentalService ||--o{ PerformedProcedure : "performed as"
    TreatmentPlanItem |o--o{ PerformedProcedure : "fulfilled by"
```

Highlights:

- `Dentist ↔ DentalService` is many-to-many through `DentistService`.
- `Appointment → DentalVisit` is one-to-one; a visit records many `PerformedProcedure`s, each optionally linked to the `TreatmentPlanItem` it fulfils.
- `TreatmentPlanItem.price` is a snapshot, so later catalogue price changes do not rewrite existing plans.
- `Appointment` has a `CHECK (endAt > startAt)` and an exclusion constraint that prevents overlapping `SCHEDULED`/`CONFIRMED` appointments for the same dentist.

📄 Column-level diagram, entity descriptions, indexes and enums: **[docs/database.md](docs/database.md)**.

## Authentication and Authorization

**Not implemented yet.** The API currently has no login, no user model, no tokens and no role checks, and it does not configure CORS. Every endpoint is open, so this service is intended for local development and portfolio demonstration and **must not be exposed publicly as-is**. Authentication and role-based authorization are the first item under [Future Improvements](#future-improvements).

(The web-application screenshots show a signed-in "Clinic Admin" user; that belongs to the separate frontend project and is not provided by this API.)

## API Documentation

39 endpoints across 6 modules plus 2 health checks. The base URL for local development is `http://localhost:3000`.

| Module | Base path | Endpoints |
|---|---|---|
| Health | `/health`, `/health/db` | 2 |
| Patients | `/patients` | 5 |
| Dentists | `/dentists` | 7 |
| Dental Services | `/services` | 6 |
| Treatment Plans | `/treatment-plans` | 8 |
| Appointments | `/appointments` | 5 |
| Dental Visits | `/dental-visit` | 6 |

- 📘 **Human-readable reference with examples:** [docs/api.md](docs/api.md)
- 🧾 **OpenAPI 3 specification:** [docs/openapi.yaml](docs/openapi.yaml)

### Viewing the API in Swagger UI

The application does not serve Swagger UI itself; the OpenAPI file in `docs/` is a standalone specification. Pick any of these ways to view it:

1. **Swagger Editor (no install):** open <https://editor.swagger.io>, choose *File → Import file*, and select `docs/openapi.yaml`.
2. **Local Swagger UI with Docker** (run from the repository root):
   ```bash
   docker run --rm -p 8081:8080 \
     -e SWAGGER_JSON=/spec/openapi.yaml \
     -v "$(pwd)/docs:/spec" \
     swaggerapi/swagger-ui
   ```
   Then open <http://localhost:8081>.
3. **VS Code:** open `docs/openapi.yaml` with an OpenAPI/Swagger preview extension.

> Swagger UI's "Try it out" sends requests from the browser, and this API does not enable CORS, so use it for reading the documentation. To call the API, use `curl`, Postman, or a REST client, as in the examples below.

### Example: book an appointment

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

`201 Created` (illustrative; see the note in [docs/api.md](docs/api.md))

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
  "patient": { "id": 1, "name": "Ahmed Mohamed", "fileNumber": "PT-1001", "phone": "01012345678" },
  "dentist": { "id": 2, "name": "Dr. Youssef Ali" },
  "service": { "id": 3, "name": "Teeth Cleaning", "durationMin": 45 }
}
```

Booking an overlapping slot for the same dentist returns `409 Conflict`:

```json
{
  "message": "Dentist is not available at this time",
  "details": {
    "conflictingAppointment": { "id": 5, "startAt": "2026-11-25T07:30:00.000Z", "endAt": "2026-11-25T08:15:00.000Z" }
  }
}
```

## Web Application Screenshots

> Full gallery with captions. A quick preview is at the [top of this page](#screenshots-preview).

These screenshots come from the clinic's **separate web application** (the frontend project). They are included to show how the system looks in use. **This repository contains only the backend API**, and the web UI is not part of it.

> **API coverage note.** The screenshots show some fields and screens that this API does not model yet, for example: patient gender, email, address and medical details (allergies, conditions, medications); dentist email, working days, experience and fee; service category and required specialty; a plan-level status, dates and assigned dentist (the API tracks status per plan *item*); and the dashboard statistics. See [Future Improvements](#future-improvements). The API documentation above describes exactly what the backend implements.

### Dashboard

![Dashboard overview](docs/screenshots/01-dashboard-overview.png)
*Overview page: summary cards for patients, dentists, today's appointments, treatment plans and dental visits, with today's appointment schedule.*

![Dashboard recent activity](docs/screenshots/02-dashboard-recent-activity.png)
*Recently added patients, recent dental visits and quick actions for common clinic tasks.*

### Patients

![Patients list](docs/screenshots/03-patients-list.png)
*Patient directory with search, filters and sorting. Related API: `GET /patients` (search by name/phone, `isActive` filter, pagination).*

![Patient details](docs/screenshots/04-patient-details.png)
*Patient profile with summary cards and tabs for personal and medical information.*

![Patient recent activity](docs/screenshots/05-patient-details-activity.png)
*Lower part of the patient profile: personal details and a recent-activity timeline.*

![Add patient form](docs/screenshots/06-add-patient-modal.png)
*"Add New Patient" form. Related API: `POST /patients` (file number, name, phone, date of birth, notes).*

### Dentists

![Dentists list](docs/screenshots/07-dentists-list.png)
*Dentist directory with specialties, contact details, working days and status. Related API: `GET /dentists`.*

![Add dentist form](docs/screenshots/08-add-dentist-modal.png)
*"Add New Dentist" form with personal and professional information. Related API: `POST /dentists`.*

### Dental Services

![Dental services](docs/screenshots/09-dental-services.png)
*Service catalogue with category, duration, price, required specialty and status. Related API: `GET /services`, `POST /services`, `PATCH /services/:id/status`.*

### Treatment Plans

![Treatment plans list](docs/screenshots/10-treatment-plans-list.png)
*Treatment plans with assigned dentist, estimated total, progress and status. Related API: `GET /treatment-plans` (returns a progress `summary` per plan).*

![Create treatment plan form](docs/screenshots/11-create-treatment-plan-modal.png)
*"Create Treatment Plan" form, where a plan is built from the service catalogue. Related API: `POST /treatment-plans` (plan with items).*

![Treatment plan details](docs/screenshots/12-treatment-plan-details.png)
*Plan details: estimated cost, procedure counts, overall progress, patient and dentist information, and plan notes.*

![Treatment plan procedures and timeline](docs/screenshots/13-treatment-plan-procedures.png)
*Planned procedures with price, duration and status, plus the plan timeline. Related API: `GET /treatment-plans/:id`, `PATCH /treatment-plans/:id/items/:itemId/status`.*

## Installation and Setup

### Prerequisites

- **Node.js** (a current LTS release; the repository does not pin a version) and npm
- **PostgreSQL** with permission to create the `btree_gist` extension (it ships with PostgreSQL's standard contrib modules and is required by the appointment-overlap constraint)

### Steps

```bash
# 1. Clone and enter the project
git clone https://github.com/devmohamedsaleh/clinic-api.git
cd clinic-api

# 2. Install dependencies
npm install

# 3. Create your environment file and edit DATABASE_URL
cp .env.example .env

# 4. Create the database (example using the PostgreSQL CLI)
createdb clinic_api

# 5. Apply the migrations and generate the Prisma client
npm run db:migrate
npm run db:generate
```

## Environment Variables

Defined in `.env` (copy from [`.env.example`](.env.example)); `.env` is git-ignored.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | none | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/clinic_api`. The app refuses to start without it. |
| `CLINIC_TIMEZONE` | No | `Africa/Cairo` | IANA time zone used to interpret the `date` filter of `GET /appointments`. An invalid value stops the app at startup. |

The HTTP port is currently fixed at `3000` (`src/index.ts`).

## Running the Project Locally

```bash
npm run dev          # start with auto-reload (tsx watch)
# or
npm start            # start once
```

The API listens on <http://localhost:3000>. Verify it:

```bash
curl http://localhost:3000/health       # { "status": "ok" }
curl http://localhost:3000/health/db    # { "db": "ok", "version": "PostgreSQL ..." }
```

Other scripts:

| Script | Purpose |
|---|---|
| `npm run typecheck` | Type-check the project (`tsc --noEmit`) |
| `npm test` | Run the dental-visit unit tests (needs `DATABASE_URL` set and the client generated, but does not query the database) |
| `npm run db:migrate` | `prisma migrate dev`: apply migrations in development |
| `npm run db:generate` | Generate the Prisma client into `generated/` |
| `npm run db:studio` | Open Prisma Studio to browse the data |

## Project Structure

```text
clinic-api/
├── docs/
│   ├── api.md                  # Endpoint reference with examples
│   ├── architecture.md         # Layers, request lifecycle, concurrency, state machines
│   ├── database.md             # ER diagram, entities, constraints, indexes
│   ├── openapi.yaml            # OpenAPI 3 specification
│   └── screenshots/            # Web application screenshots (separate frontend project)
├── prisma/
│   ├── schema.prisma           # Data model
│   └── migrations/             # SQL migrations (incl. appointment overlap constraint)
├── src/
│   ├── index.ts                # Server entry point (port 3000)
│   ├── app.ts                  # Express app, routers, health checks, error handler
│   ├── config/clinic.ts        # CLINIC_TIMEZONE
│   ├── lib/prisma.ts           # Prisma client (pg adapter)
│   ├── utils/                  # AppError, validate(), shared Zod schemas, date + Prisma-error helpers
│   └── modules/
│       ├── patients/           # routes · controller · service · validation (+ global error middleware)
│       ├── dentists/
│       ├── dental-services/
│       ├── treatment-plans/    # + plan-item-status.ts (status transitions)
│       ├── appointments/       # + appointment-status.ts (status transitions)
│       └── dental-visits/      # + rules.ts and rules.test.ts
├── .env.example
├── package.json
├── prisma7.config.ts           # Prisma configuration
└── tsconfig.json
```

## Future Improvements

Based on gaps in the current implementation:

- **Authentication and authorization:** user accounts, token-based login and role-based access (for example admin, dentist, receptionist), plus CORS configuration.
- **Serve the OpenAPI spec** with Swagger UI from the application, and keep it in sync with the Zod schemas.
- **Broaden the data model** to match the web application: patient demographics and medical details, dentist profile fields and working schedule, service categories, plan-level status and dates, and dashboard statistics endpoints.
- **Appointment availability:** enforce dentist working hours and offer a free-slot search endpoint.
- **More tests:** extend coverage beyond the dental-visit module and add integration tests against a real PostgreSQL database.
- **Delivery tooling:** Docker / Docker Compose for the app and database, a CI pipeline (type-check and tests), and a configurable `PORT`.
- **Housekeeping:** remove duplicated route registrations in the appointments and treatment-plans routers, drop the redundant `src/index.js`, and move the global error middleware out of the `patients` module.

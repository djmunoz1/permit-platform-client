# Permit Platform

A multi-tenant permit licensing and registration management system built with React + TypeScript, Node/Express, and PostgreSQL.

## Features

- **Multi-tenant** — multiple agencies/jurisdictions fully isolated by `tenant_id`
- **Configurable permit types** — define any permit type with custom form fields (no code changes)
- **Visual workflow builder** — admin UI to create/edit stages, transitions, and SLAs
- **Application management** — full lifecycle: draft → review → investigation → approval
- **Stage progress bar** — visual pipeline with one-click transitions
- **Checklist system** — per-application completion tracking
- **Contact & entity management** — applicants, businesses, locations
- **Investigation tab** — background checks, inspections, enforcements
- **Communication timeline** — notes, emails, phone calls, portal comments
- **Documents** — upload tracking with approval workflow
- **Role-based access** — superadmin / admin / staff / readonly

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

---

## Setup

### 1. Clone and install

```bash
cd permit-platform
npm install
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
```

### 3. Create the database

```sql
createdb permit_platform
```

### 4. Run migrations

```bash
npm run db:migrate --workspace=server
```

### 5. Seed demo data

```bash
npm run db:seed --workspace=server
```

This creates:
- Tenant: `California ABC` (slug: `ca-abc`)
- Admin user: `admin@ca-abc.gov` / `admin123`
- Staff user: `staff@ca-abc.gov` / `admin123`
- 3 permit types (Beer Manufacturer, Wine Retailer, Spirits Distributor)
- Full 7-stage workflow
- Sample application `APL-0000001056`

### 6. Start development

```bash
# From root
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

---

## Project Structure

```
permit-platform/
├── client/               # React + TypeScript + Tailwind
│   └── src/
│       ├── contexts/     # Auth context
│       ├── lib/          # Axios instance
│       ├── pages/
│       │   ├── applications/   # List, Detail (tabs), New
│       │   ├── contacts/       # List, Detail
│       │   └── admin/          # Workflows, PermitTypes, Users
│       └── components/   # Layout, sidebar
└── server/               # Express + TypeScript + pg
    └── src/
        ├── db/           # Schema, migrate, seed
        ├── middleware/   # JWT auth
        └── routes/       # applications, workflows, contacts, etc.
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/applications` | List applications (filterable) |
| GET | `/api/applications/:id` | Full application with stages, docs, etc. |
| POST | `/api/applications` | Create application |
| PATCH | `/api/applications/:id` | Update fields/checklist |
| POST | `/api/applications/:id/transition` | Move to a new workflow stage |
| POST | `/api/applications/:id/activities` | Add note/email/activity |
| GET/POST/PATCH | `/api/workflows` | CRUD workflows |
| POST | `/api/workflows/:id/stages` | Add stage |
| PATCH | `/api/workflows/:id/stages/:stageId` | Edit stage |
| DELETE | `/api/workflows/:id/stages/:stageId` | Delete stage |
| POST/DELETE | `/api/workflows/:id/transitions` | Add/delete transition |
| GET/POST/PATCH | `/api/contacts` | Contact CRUD |
| GET/POST/PATCH | `/api/permit-types` | Permit type CRUD + form schema |
| GET/POST/PATCH | `/api/inspections` | Inspection management |
| GET/POST/PATCH | `/api/users` | User management (admin only) |

---

## Adding a New Permit Type (No Code)

1. Go to **Administration → Permit Types**
2. Click **+ New** and set name, code, fee
3. Add form fields (text, boolean, date, select, etc.)
4. Go to **Administration → Workflows**
5. Create a workflow for the new type, add stages and transitions
6. New applications can now use this permit type + workflow

---

## Adding a New Workflow Stage (No Code)

1. Go to **Administration → Workflows**
2. Select the workflow
3. Click **Add Stage**, configure name/color/SLA/terminal flag
4. Add **Transitions** to define which stages can follow which
5. All active applications on that workflow immediately see the new stage

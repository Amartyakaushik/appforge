# AppForge - AI App Generator

A config-driven application runtime that converts JSON configurations into fully working web applications with dynamic UI, APIs, and database.

## Architecture

```
Frontend (Next.js 15)  →  Backend (Express + TS)  →  PostgreSQL (Supabase)
     Vercel                    Render                   JSONB storage
```

**Core Design:**
- **Component Registry** pattern for extensibility — add a new UI type in 1 file + 1 line
- **JSONB storage** instead of dynamic table creation — handles schema changes without migrations
- **Config-driven everything** — change JSON, get a different app instantly

## Features

### Core System
- Monaco JSON editor for writing app configs
- Dynamic form rendering from entity field definitions
- Dynamic table with sorting, pagination, edit/delete actions
- Dashboard with stat widgets (count, avg, sum)
- Graceful fallback for unknown component types (never crashes)

### 3 Integrated Features
1. **CSV Import** — Upload CSV → map columns → preview → bulk import with validation
2. **Config-Driven Auth UI** — Login/register pages generated from auth config fields
3. **Event-Based Notifications** — Toast notifications with configurable templates per CRUD event

### Edge Case Handling
- Missing/incomplete config → sensible defaults applied automatically
- Unknown component types → warning UI, no crash
- Invalid JSON → Monaco shows errors, save blocked
- Missing entity fields → default values applied
- Empty states + loading states + error states on every page

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui, Monaco Editor |
| Backend | Express, TypeScript, Zod validation |
| Database | PostgreSQL (Supabase), Prisma ORM, JSONB |
| Auth | bcryptjs + JWT |
| Deploy | Vercel (FE) + Render (BE) + Supabase (DB) |

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase account)

### Backend
```bash
cd backend
cp .env.example .env  # Fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma db push
npx tsx src/seed.ts    # Seed sample apps
npm run dev            # Starts on port 3001
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local  # Set NEXT_PUBLIC_API_URL
npm install
npm run dev            # Starts on port 3000
```

## Project Structure

```
├── frontend/                # Next.js 15 app
│   ├── src/app/             # App Router pages
│   ├── src/components/
│   │   ├── runtime/         # Dynamic renderers (registry pattern)
│   │   ├── csv/             # CSV import modal
│   │   ├── auth/            # Auth context + provider
│   │   └── ui/              # shadcn components
│   └── src/lib/             # API client, types
├── backend/
│   ├── src/routes/          # Express route handlers
│   ├── src/middleware/       # Auth JWT middleware
│   ├── src/lib/             # Config parser, schema builder, Prisma
│   └── prisma/              # Database schema
└── EXECUTION_PLAN.md        # Full technical blueprint
```

## JSON Config Schema

```json
{
  "appName": "My App",
  "auth": { "enabled": true, "fields": [...], "methods": ["email"] },
  "entities": {
    "products": {
      "fields": {
        "name": { "type": "string", "required": true },
        "price": { "type": "number" }
      }
    }
  },
  "pages": [
    { "name": "Products", "type": "table", "entity": "products" },
    { "name": "Add Product", "type": "form", "entity": "products" },
    { "name": "Dashboard", "type": "dashboard", "widgets": [...] }
  ],
  "notifications": {
    "onCreate": "{{entity}} created!",
    "onUpdate": "{{entity}} updated!",
    "onDelete": "{{entity}} deleted!"
  }
}
```

## Tradeoffs

- **JSONB vs dynamic tables**: Chose JSONB for resilience to config changes — no migrations needed when evaluators modify configs
- **Monaco vs visual builder**: Monaco lets evaluators paste any config directly; visual builder would take 2x longer
- **JWT in localStorage**: Simple for MVP; would use httpOnly cookies in production
- **Client-side CSV parsing**: Simpler architecture — no file upload middleware needed on backend

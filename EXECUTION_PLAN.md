# AI App Generator - Execution Plan & Technical Blueprint

> **Track:** A - AI App Generator (Advanced / Systems Thinking)
> **Timeline:** 2 Days (May 6-7, 2026)
> **Submission:** Live URL + GitHub + Loom Video (5-10 min)
> **Status:** IN PROGRESS

---

## Table of Contents

- [Design Decisions](#design-decisions)
- [Architecture](#architecture)
- [JSON Config Schema](#json-config-schema)
- [Database Design](#database-design)
- [Backend API Spec](#backend-api-spec)
- [Frontend Pages & Components](#frontend-pages--components)
- [3 Mandatory Features](#3-mandatory-features)
- [Edge Case Handling](#edge-case-handling)
- [Sample Configs](#sample-configs)
- [Tech Stack](#tech-stack)
- [Day-by-Day Execution](#day-by-day-execution)
- [Deployment](#deployment)
- [Loom Video Strategy](#loom-video-strategy)
- [Checklist](#checklist)

---

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Config editor | Monaco Editor | Fast to build, evaluators paste JSON directly, base44 uses same |
| Dynamic DB strategy | JSONB columns | Handles schema changes naturally, no dynamic DDL, evaluator-proof |
| 3 Features | CSV Import + Auth UI + Notifications | High demo impact, all config-driven, feasible in 2 days |
| Deployment | Supabase + Render + Vercel | All free tier, no credit card needed |
| Sample configs | Todo + Inventory + Blog | Familiar patterns, evaluators understand instantly |

---

## Architecture

```
+-----------------------------------------------------+
|                 FRONTEND (Next.js 15)                |
|                     Vercel                           |
|                                                      |
|  +-----------+  +-------------+  +-----------+       |
|  | Config    |  | App Runtime |  | Auth UI   |       |
|  | Editor    |  | (Dynamic    |  | (Config-  |       |
|  | (Monaco)  |  |  Renderer)  |  |  driven)  |       |
|  +-----+-----+  +------+------+  +-----+-----+      |
|        |               |               |             |
|  +-----+---------------+---------------+--------+    |
|  |              Component Registry               |   |
|  |  form | table | dashboard | chart | card      |   |
|  +------------------------+---------------------+    |
|                           |                          |
|        CSV Import Module  |  Notification System     |
+---------------------------+--------------------------+
                            | REST API
+---------------------------+--------------------------+
|            BACKEND (Express + TypeScript)             |
|                     Render                          |
|                                                      |
|  +------------+  +------------+  +--------------+    |
|  | Config     |  | Dynamic    |  | Validation   |    |
|  | Parser &   |  | CRUD       |  | Layer (Zod)  |    |
|  | Validator  |  | Router     |  |              |    |
|  +-----+------+  +-----+------+  +------+-------+   |
|        |               |                |            |
|  Endpoints:                                          |
|  POST /api/apps                                      |
|  GET  /api/apps/:id                                  |
|  PUT  /api/apps/:id                                  |
|  GET  /api/apps/:id/entities/:name                   |
|  POST /api/apps/:id/entities/:name                   |
|  PUT  /api/apps/:id/entities/:name/:entityId         |
|  DELETE /api/apps/:id/entities/:name/:entityId       |
|  POST /api/apps/:id/import-csv                       |
|  POST /api/apps/:id/auth/register                    |
|  POST /api/apps/:id/auth/login                       |
|  GET  /api/apps/:id/stats/:entity                    |
+------------------------+----------------------------+
                         | Prisma ORM
+------------------------+----------------------------+
|             PostgreSQL (Supabase)                     |
|                                                      |
|  apps:                                               |
|    id (uuid, PK)                                     |
|    name (string)                                     |
|    config (JSONB)                                    |
|    created_at (timestamp)                            |
|    updated_at (timestamp)                            |
|                                                      |
|  entity_data:                                        |
|    id (uuid, PK)                                     |
|    app_id (uuid, FK -> apps.id)                      |
|    entity_name (string)                              |
|    data (JSONB)                                      |
|    created_by (uuid, nullable, for user-scoped data) |
|    created_at (timestamp)                            |
|    updated_at (timestamp)                            |
|                                                      |
|  app_users:                                          |
|    id (uuid, PK)                                     |
|    app_id (uuid, FK -> apps.id)                      |
|    email (string)                                    |
|    password_hash (string)                            |
|    profile (JSONB)                                   |
|    created_at (timestamp)                            |
+------------------------------------------------------+
```

---

## JSON Config Schema

This is what users write in the Monaco editor. The system parses this and generates everything dynamically.

```json
{
  "appName": "My App",

  "auth": {
    "enabled": true,
    "fields": [
      { "name": "email", "type": "email", "required": true },
      { "name": "password", "type": "password", "required": true },
      { "name": "fullName", "type": "string", "required": false }
    ],
    "methods": ["email"]
  },

  "entities": {
    "products": {
      "fields": {
        "name": { "type": "string", "required": true, "label": "Product Name" },
        "price": { "type": "number", "required": true, "label": "Price (INR)" },
        "category": {
          "type": "string",
          "enum": ["Electronics", "Clothing", "Food"],
          "label": "Category"
        },
        "inStock": { "type": "boolean", "default": true, "label": "In Stock" },
        "description": { "type": "text", "required": false, "label": "Description" }
      }
    }
  },

  "pages": [
    {
      "name": "Products",
      "type": "table",
      "entity": "products",
      "columns": ["name", "price", "category", "inStock"],
      "actions": ["create", "edit", "delete"]
    },
    {
      "name": "Add Product",
      "type": "form",
      "entity": "products"
    },
    {
      "name": "Dashboard",
      "type": "dashboard",
      "widgets": [
        { "type": "stat", "label": "Total Products", "entity": "products", "operation": "count" },
        { "type": "stat", "label": "Avg Price", "entity": "products", "field": "price", "operation": "avg" }
      ]
    }
  ],

  "notifications": {
    "onCreate": "{{entity}} created successfully",
    "onUpdate": "{{entity}} updated",
    "onDelete": "{{entity}} deleted"
  }
}
```

### Config Field Types Supported

| Type | Renders As | Validation |
|------|-----------|------------|
| `string` | Text input | Max 255 chars |
| `text` | Textarea | Max 5000 chars |
| `number` | Number input | Min/max if provided |
| `boolean` | Toggle/Checkbox | true/false |
| `email` | Email input | Email regex |
| `password` | Password input | Min 6 chars |
| `date` | Date picker | Valid date |
| `string` + `enum` | Select dropdown | Must be in enum array |

### Config Defaults (when fields are missing)

| Missing Field | Default |
|--------------|---------|
| `auth` | `{ enabled: false }` |
| `entities` | Empty object, show "No entities defined" |
| `pages` | Auto-generate table + form per entity |
| `field.required` | `false` |
| `field.default` | `""` for string, `0` for number, `false` for boolean |
| `field.label` | Capitalize field name |
| `notifications` | Default CRUD messages |
| `page.actions` | `["create", "edit", "delete"]` |
| `page.columns` | All fields in entity |

---

## Database Design

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model App {
  id         String       @id @default(uuid())
  name       String
  config     Json
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")
  entities   EntityData[]
  users      AppUser[]

  @@map("apps")
}

model EntityData {
  id         String   @id @default(uuid())
  appId      String   @map("app_id")
  entityName String   @map("entity_name")
  data       Json
  createdBy  String?  @map("created_by") // nullable: null when auth disabled, user ID when enabled
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  app App @relation(fields: [appId], references: [id], onDelete: Cascade)

  @@index([appId, entityName])
  @@map("entity_data")
}

model AppUser {
  id           String   @id @default(uuid())
  appId        String   @map("app_id")
  email        String
  passwordHash String   @map("password_hash")
  profile      Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")

  app App @relation(fields: [appId], references: [id], onDelete: Cascade)

  @@unique([appId, email])
  @@map("app_users")
}
```

### Why JSONB Works Here

- Evaluators WILL modify the config, add/remove fields. JSONB handles this with zero migrations.
- "Handle schema mismatches" and "optional fields" -- JSONB does this by default.
- Query/filter with PostgreSQL: `WHERE data->>'category' = 'Electronics'`
- No dynamic `CREATE TABLE` = no SQL injection risk, no migration headaches.

---

## Backend API Spec

### App Management

#### `POST /api/apps` -- Create new app
```
Request Body: { name: string, config: object }
Response: { id, name, config, createdAt }
Validation: config must be valid JSON, name required
```

#### `GET /api/apps` -- List all apps
```
Response: [{ id, name, createdAt }]
```

#### `GET /api/apps/:id` -- Get app with full config
```
Response: { id, name, config, createdAt }
Error: 404 if not found
```

#### `PUT /api/apps/:id` -- Update app config
```
Request Body: { name?, config? }
Response: { id, name, config, updatedAt }
```

#### `DELETE /api/apps/:id` -- Delete app and all its data
```
Response: { success: true }
Cascade deletes: entity_data + app_users for this app
```

### Dynamic Entity CRUD

#### `GET /api/apps/:id/entities/:entityName` -- List entity data
```
Query Params: ?page=1&limit=20&sort=fieldName&order=asc&filter[field]=value
Response: { data: [...], total: number, page: number, totalPages: number }
Supports: pagination, sorting, filtering on JSONB fields
```

#### `POST /api/apps/:id/entities/:entityName` -- Create entity record
```
Request Body: { data: { name: "Laptop", price: 50000, ... } }
Validation: validates against entity field definitions in config
Response: { id, entityName, data, createdAt }
Returns: { event: "onCreate", entity: entityName } for notifications
```

#### `PUT /api/apps/:id/entities/:entityName/:entityId` -- Update record
```
Request Body: { data: { price: 45000 } } (partial update supported)
Response: { id, entityName, data, updatedAt }
Returns: { event: "onUpdate", entity: entityName }
```

#### `DELETE /api/apps/:id/entities/:entityName/:entityId` -- Delete record
```
Response: { success: true }
Returns: { event: "onDelete", entity: entityName }
```

### Dashboard Stats

#### `GET /api/apps/:id/stats/:entityName` -- Get stats for entity
```
Query: ?operations=count,avg:price,sum:price
Response: { count: 42, avg_price: 35000, sum_price: 1470000 }
Computed from JSONB data using PostgreSQL aggregations
```

### CSV Import

#### `POST /api/apps/:id/import-csv` -- Import CSV data
```
Content-Type: application/json
Body: { entityName: string, rows: [{ field: value, ... }] }
Note: CSV is parsed CLIENT-SIDE with papaparse. Frontend sends mapped JSON rows.
Process: validate each row against entity schema -> bulk insert
Response: { imported: 45, failed: 3, errors: [{ row: 3, message: "..." }] }
```

### Auth (per-app)

#### `POST /api/apps/:id/auth/register`
```
Body: { email, password, ...extraFields }
Validates against auth.fields in config
Returns: { token, user: { id, email, profile } }
```

#### `POST /api/apps/:id/auth/login`
```
Body: { email, password }
Returns: { token, user: { id, email, profile } }
```

### Validation Layer

All endpoints use Zod schemas:
- Config validation: ensures proper structure, applies defaults for missing fields
- Entity data validation: dynamically built from entity field definitions
- CSV validation: per-row validation against entity schema
- Auth validation: against auth.fields config

---

## Frontend Pages & Components

### Page Structure

```
/                          -> Landing page (list of apps + create new)
/app/[appId]               -> App runtime (sidebar + dynamic pages)
/app/[appId]/config        -> Monaco config editor
/app/[appId]/auth/login    -> Dynamic login page
/app/[appId]/auth/register -> Dynamic register page
```

### Component Registry

The core extensibility mechanism. Adding a new component = 1 file + 1 line in registry.

```typescript
// registry.ts
const componentRegistry: Record<string, React.ComponentType<RendererProps>> = {
  table: TableRenderer,
  form: FormRenderer,
  dashboard: DashboardRenderer,
  card: CardRenderer,
  // Adding a new component:
  // chart: ChartRenderer,
};

export function getComponent(type: string): React.ComponentType<RendererProps> {
  return componentRegistry[type] || UnknownComponent;
}
```

### Dynamic Renderers

#### FormRenderer
- Reads entity fields from config
- Renders appropriate input for each field type (text, number, select, toggle, etc.)
- Handles validation (required fields, type checking)
- Shows loading state during submission
- Shows error messages per field

#### TableRenderer
- Reads columns from page config (or defaults to all fields)
- Fetches data from API
- Supports sorting (click column header)
- Supports inline actions (edit, delete)
- Pagination
- Empty state ("No data yet")
- CSV import button

#### DashboardRenderer
- Reads widgets array from config
- Fetches stats from /stats API
- Renders stat cards with labels and values
- Handles missing/invalid widget configs gracefully

#### UnknownComponent
- Renders when page type is not in registry
- Shows: "Component type '{type}' is not supported yet"
- Does NOT crash the app

### UI States (EVERY component must handle these)

1. **Loading** -- Skeleton/spinner while fetching
2. **Empty** -- "No data yet" / "No entities defined"
3. **Error** -- Red banner with error message, retry button
4. **Data** -- Normal render

---

## 3 Mandatory Features

### Feature 1: CSV Import System

**Flow:**
1. User clicks "Import CSV" button on any table page
2. Modal opens with file upload dropzone
3. User uploads .csv file
4. System parses CSV headers, shows column mapping UI
5. Auto-matches CSV headers to entity fields (case-insensitive)
6. User can manually adjust mapping or skip columns
7. Preview first 5 rows with mapped data
8. Click "Import" -> validates each row -> bulk inserts
9. Shows result: "45 imported, 3 failed" with error details
10. Table refreshes with new data

**Edge Cases:**
- Empty CSV -> "File is empty"
- No matching columns -> all manual mapping
- Invalid data in rows -> skip row, report error
- Huge file -> limit to 1000 rows with warning
- Duplicate headers -> append number

**Implementation:**
- Frontend: papaparse for CSV parsing, mapping UI with dropdowns
- Backend: POST /api/apps/:id/import-csv, bulk Prisma createMany
- Validation: reuse same entity field validators

### Feature 2: Customizable Auth UI

**Config Example:**
```json
{
  "auth": {
    "enabled": true,
    "fields": [
      { "name": "email", "type": "email", "required": true },
      { "name": "password", "type": "password", "required": true },
      { "name": "fullName", "type": "string", "required": false },
      { "name": "role", "type": "string", "enum": ["admin", "user"], "default": "user" }
    ],
    "methods": ["email"]
  }
}
```

**What it does:**
- Login/Register pages render dynamically from config
- Change config fields -> different form appears (no code change)
- JWT token stored in localStorage
- Protected routes check for token
- User-scoped data: entity queries filtered by user ID when auth enabled

**Edge Cases:**
- Auth not in config -> auth disabled, all pages public
- No password field -> reject config with error
- Empty methods array -> default to ["email"]

### Feature 3: Event-Based Notifications

**Config Example:**
```json
{
  "notifications": {
    "onCreate": "New {{entity}} added!",
    "onUpdate": "{{entity}} updated successfully",
    "onDelete": "{{entity}} removed"
  }
}
```

**What it does:**
- CRUD operations return event type in response
- Frontend intercepts response, finds matching notification template
- Replaces `{{entity}}` with actual entity name
- Shows toast notification (sonner library)
- Toast types: success (create/update), destructive (delete), error (failures)

**Edge Cases:**
- No notifications in config -> use default messages
- Unknown event type -> generic "Operation completed"
- Template with unknown variables -> leave as-is

---

## Edge Case Handling (What Evaluators Will Test)

### Config-Level Edge Cases

| Scenario | How We Handle |
|----------|--------------|
| Empty JSON `{}` | Show "No entities defined" with helpful message |
| Missing `pages` array | Auto-generate table + form page per entity |
| Missing `entities` | Show empty state on all pages |
| Unknown page `type` | Render UnknownComponent with type name |
| Missing field `type` | Default to "string" |
| Missing field `label` | Capitalize field name ("productName" -> "Product Name") |
| Invalid JSON in editor | Monaco red squiggles, save button disabled |
| Extra unknown keys in config | Ignore, don't crash (loose parsing) |
| Entity with zero fields | Show "No fields defined for this entity" |
| Page referencing non-existent entity | Show "Entity 'xyz' not found in config" |

### Data-Level Edge Cases

| Scenario | How We Handle |
|----------|--------------|
| Missing required field in data | Reject with field-specific error |
| Wrong type (string where number expected) | Attempt coercion, reject if impossible |
| Extra fields not in config | Store but don't display (JSONB is flexible) |
| Null values | Render as "-" in tables, skip in stats |
| Empty string | Accept, render as empty cell |
| Very long strings | Truncate in table (full in detail view) |

### System-Level Edge Cases

| Scenario | How We Handle |
|----------|--------------|
| API timeout | Show error state with retry button |
| Invalid app ID in URL | 404 page with "App not found" |
| Concurrent config updates | Last write wins (simple for MVP) |
| Backend down | Frontend shows "Cannot connect to server" |
| CSV with 10000 rows | Limit to 1000, show warning |

---

## Sample Configs

### 1. Todo App (Simple)

```json
{
  "appName": "Todo App",
  "auth": { "enabled": false },
  "entities": {
    "tasks": {
      "fields": {
        "title": { "type": "string", "required": true, "label": "Task" },
        "completed": { "type": "boolean", "default": false, "label": "Done" },
        "priority": { "type": "string", "enum": ["Low", "Medium", "High"], "label": "Priority" }
      }
    }
  },
  "pages": [
    { "name": "Tasks", "type": "table", "entity": "tasks", "columns": ["title", "priority", "completed"] },
    { "name": "Add Task", "type": "form", "entity": "tasks" }
  ],
  "notifications": {
    "onCreate": "Task added!",
    "onDelete": "Task removed"
  }
}
```

### 2. Inventory Manager (Medium)

```json
{
  "appName": "Inventory Manager",
  "auth": {
    "enabled": true,
    "fields": [
      { "name": "email", "type": "email", "required": true },
      { "name": "password", "type": "password", "required": true }
    ],
    "methods": ["email"]
  },
  "entities": {
    "products": {
      "fields": {
        "name": { "type": "string", "required": true, "label": "Product Name" },
        "sku": { "type": "string", "required": true, "label": "SKU" },
        "price": { "type": "number", "required": true, "label": "Price (INR)" },
        "quantity": { "type": "number", "default": 0, "label": "Quantity" },
        "category": { "type": "string", "enum": ["Electronics", "Clothing", "Food", "Other"], "label": "Category" },
        "inStock": { "type": "boolean", "default": true, "label": "In Stock" }
      }
    },
    "suppliers": {
      "fields": {
        "name": { "type": "string", "required": true, "label": "Supplier Name" },
        "email": { "type": "email", "required": true, "label": "Email" },
        "phone": { "type": "string", "label": "Phone" },
        "city": { "type": "string", "label": "City" }
      }
    }
  },
  "pages": [
    { "name": "Products", "type": "table", "entity": "products", "columns": ["name", "sku", "price", "quantity", "category"] },
    { "name": "Add Product", "type": "form", "entity": "products" },
    { "name": "Suppliers", "type": "table", "entity": "suppliers" },
    { "name": "Add Supplier", "type": "form", "entity": "suppliers" },
    {
      "name": "Dashboard",
      "type": "dashboard",
      "widgets": [
        { "type": "stat", "label": "Total Products", "entity": "products", "operation": "count" },
        { "type": "stat", "label": "Total Suppliers", "entity": "suppliers", "operation": "count" },
        { "type": "stat", "label": "Avg Price", "entity": "products", "field": "price", "operation": "avg" }
      ]
    }
  ],
  "notifications": {
    "onCreate": "New {{entity}} added to inventory!",
    "onUpdate": "{{entity}} record updated",
    "onDelete": "{{entity}} removed from inventory"
  }
}
```

### 3. Blog CMS (Complex)

```json
{
  "appName": "Blog CMS",
  "auth": {
    "enabled": true,
    "fields": [
      { "name": "email", "type": "email", "required": true },
      { "name": "password", "type": "password", "required": true },
      { "name": "displayName", "type": "string", "required": true }
    ],
    "methods": ["email"]
  },
  "entities": {
    "posts": {
      "fields": {
        "title": { "type": "string", "required": true, "label": "Title" },
        "content": { "type": "text", "required": true, "label": "Content" },
        "author": { "type": "string", "required": true, "label": "Author" },
        "category": { "type": "string", "enum": ["Tech", "Lifestyle", "Business", "Other"], "label": "Category" },
        "published": { "type": "boolean", "default": false, "label": "Published" },
        "publishDate": { "type": "date", "label": "Publish Date" }
      }
    },
    "comments": {
      "fields": {
        "postTitle": { "type": "string", "required": true, "label": "Post" },
        "commenter": { "type": "string", "required": true, "label": "Name" },
        "body": { "type": "text", "required": true, "label": "Comment" },
        "approved": { "type": "boolean", "default": false, "label": "Approved" }
      }
    }
  },
  "pages": [
    { "name": "All Posts", "type": "table", "entity": "posts", "columns": ["title", "author", "category", "published"] },
    { "name": "New Post", "type": "form", "entity": "posts" },
    { "name": "Comments", "type": "table", "entity": "comments", "columns": ["postTitle", "commenter", "approved"] },
    {
      "name": "Dashboard",
      "type": "dashboard",
      "widgets": [
        { "type": "stat", "label": "Total Posts", "entity": "posts", "operation": "count" },
        { "type": "stat", "label": "Total Comments", "entity": "comments", "operation": "count" }
      ]
    }
  ],
  "notifications": {
    "onCreate": "{{entity}} created!",
    "onUpdate": "{{entity}} updated!",
    "onDelete": "{{entity}} deleted!"
  }
}
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 (App Router) | Spec says "preferred", SSR, file-based routing |
| Styling | Tailwind CSS | Spec says mandatory. Fast responsive UI |
| UI Components | shadcn/ui | Production-quality table, form, card, dialog, toast |
| Code Editor | @monaco-editor/react | JSON editing with syntax highlighting + validation |
| CSV Parsing | papaparse | Client-side CSV parsing, battle-tested |
| Notifications | sonner | Lightweight toast library, works with shadcn |
| Backend | Express + TypeScript | Simple, fast to build, spec says Node.js + TS preferred |
| Validation | Zod | Type-safe schemas, dynamic schema generation from config |
| ORM | Prisma | Spec mentions it for Track C, clean JSONB support |
| Auth | bcryptjs + jsonwebtoken | Simple JWT auth, no external dependency |
| Database | PostgreSQL (Supabase) | Spec says preferred, JSONB support, free tier |
| FE Deploy | Vercel | Zero-config Next.js hosting, free |
| BE Deploy | Render | Free 750 hrs/month, no credit card needed (Render requires card now) |

### Package List

**Frontend (package.json):**
```
next, react, react-dom
tailwindcss
@monaco-editor/react
@radix-ui/* (via shadcn)
lucide-react (icons)
papaparse
sonner
axios
clsx, tailwind-merge
```

**Backend (package.json):**
```
express, cors, helmet
typescript, ts-node, tsx
@prisma/client, prisma
zod
bcryptjs, jsonwebtoken
dotenv
```

---

## Day-by-Day Execution

### DAY 1 (May 6) -- Backend + DB + Core Frontend Shell

#### Morning Block (4 hours)

- [ ] **Project Setup**
  - Create monorepo: `/frontend` + `/backend`
  - Init Next.js with TypeScript + Tailwind + App Router
  - Init Express with TypeScript
  - Install all dependencies
  - Set up shadcn/ui (button, table, card, dialog, input, select, toast)

- [ ] **Database Setup**
  - Create Supabase project
  - Write Prisma schema (apps, entity_data, app_users)
  - Run prisma migrate dev
  - Test connection

- [ ] **Backend Core APIs**
  - POST /api/apps (create app with config)
  - GET /api/apps (list apps)
  - GET /api/apps/:id (get app + config)
  - PUT /api/apps/:id (update config)
  - Config validation with Zod (apply defaults for missing fields)

#### Afternoon Block (4 hours)

- [ ] **Dynamic CRUD APIs**
  - GET /api/apps/:id/entities/:name (list with pagination, sort, filter)
  - POST /api/apps/:id/entities/:name (create with validation)
  - PUT /api/apps/:id/entities/:name/:entityId (update)
  - DELETE /api/apps/:id/entities/:name/:entityId (delete)
  - Dynamic Zod schema generation from entity field config
  - GET /api/apps/:id/stats/:entity (count, avg, sum operations)

- [ ] **Auth APIs**
  - POST /api/apps/:id/auth/register
  - POST /api/apps/:id/auth/login
  - JWT middleware for protected routes
  - User-scoped data filtering

#### Evening Block (2 hours)

- [ ] **Frontend Shell**
  - Landing page: list apps + "Create New" button
  - App layout: sidebar with pages from config
  - Config editor page with Monaco
  - Basic routing structure
  - Connect frontend to backend API

- [ ] **Deploy Backend**
  - Push backend to Render
  - Set environment variables
  - Test deployed API

---

### DAY 2 (May 7) -- Frontend Renderers + Features + Deploy + Video

#### Morning Block (4 hours)

- [ ] **Component Registry + Renderers**
  - Build registry.ts (type -> component mapping)
  - FormRenderer: dynamic form from entity fields
  - TableRenderer: dynamic table with sort, pagination, actions
  - DashboardRenderer: stat widgets from config
  - UnknownComponent: graceful fallback

- [ ] **Auth UI**
  - Dynamic login page from config
  - Dynamic register page from config
  - JWT token management (localStorage)
  - Protected route wrapper
  - User context provider

#### Afternoon Block (4 hours)

- [ ] **CSV Import Feature**
  - File upload modal on table pages
  - CSV parsing with papaparse
  - Column mapping UI (auto-match + manual)
  - Preview rows before import
  - Bulk import API call
  - Success/error result display

- [ ] **Notification System**
  - Sonner toast integration
  - Template parsing (replace {{entity}})
  - Hook into all CRUD operations
  - Success/error/warning variants

- [ ] **Edge Cases & Polish**
  - Loading skeletons on all pages
  - Empty states on all pages
  - Error boundaries
  - Mobile responsiveness check
  - Seed sample configs (Todo, Inventory, Blog)

#### Evening Block (2 hours)

- [ ] **Deploy Frontend**
  - Push to Vercel
  - Set API URL environment variable
  - End-to-end smoke test on live URLs

- [ ] **Record Loom Video** (5-8 min)
  - Architecture walkthrough
  - Live demo of all features
  - Edge case demonstration
  - Tradeoffs discussion

- [ ] **Final Submission**
  - Clean up GitHub repo
  - Write README with setup instructions
  - Submit via Google Form: Live URL + GitHub + Loom

---

## Deployment

### Supabase (Database)
1. Create new project at supabase.com
2. Copy DATABASE_URL from project settings
3. Run `npx prisma migrate deploy`
4. Database ready

### Render (Backend)
1. Create new Web Service on render.com
2. Connect GitHub repo
3. Set root directory to `/backend`
4. Set env vars: DATABASE_URL, JWT_SECRET, FRONTEND_URL
5. Build command: `npm install && npm run build`
6. Start command: `npm start`
7. Note: Free tier spins down after 15 min inactivity. First request takes ~30s cold start. Acceptable for demo.
8. Deploy

### Vercel (Frontend)
1. Import GitHub repo
2. Set root directory to `/frontend`
3. Set env var: NEXT_PUBLIC_API_URL
4. Framework preset: Next.js
5. Deploy

### Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://...@supabase.co:5432/postgres
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://your-app.vercel.app
PORT=3001
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## Loom Video Strategy (5-8 min)

### Script

**[0:00-0:30] Hook**
"I built a config-driven application runtime -- give it a JSON config and it generates a fully working app with dynamic UI, APIs, and database. Let me show you how it works."

**[0:30-2:00] Architecture (show diagram or code structure)**
- "The system has three layers: Next.js frontend, Express+TS backend, PostgreSQL with JSONB"
- "The key design decision: JSONB columns instead of dynamic table creation. This means any config change works instantly without migrations."
- "Component Registry pattern for extensibility -- adding a new component type is one file and one line of code"
- Show the registry.ts file briefly

**[2:00-4:00] Live Demo**
- Start with empty system, create new app
- Paste Inventory Manager config into Monaco editor
- Show the generated app: sidebar, table page, form page, dashboard
- Add a product through the form -> see it in table
- Show toast notification appearing (Feature 3)
- Click "Import CSV" -> upload a products CSV (Feature 1)
- Show 50 products loaded with mapping step
- Switch to auth-enabled config -> show login page generated dynamically (Feature 2)

**[4:00-5:30] Edge Cases (THIS IS WHERE YOU WIN)**
- "Watch what happens when I remove the pages array" -> auto-generates pages
- "Here's an unknown component type" -> graceful fallback, no crash
- "Empty config" -> helpful empty state
- "Invalid JSON" -> Monaco shows errors, can't save
- "Missing fields in entity data" -> defaults applied
- "I added a completely new entity to config" -> it just works, no restart needed

**[5:30-6:30] Tradeoffs**
- "JSONB vs dynamic tables: chose JSONB for resilience to config changes"
- "JWT in localStorage vs httpOnly cookies: chose localStorage for simplicity, would use cookies in production"
- "Monaco vs visual builder: Monaco lets evaluators paste any config directly"
- "Given more time: undo/redo, config versioning, visual drag-drop builder, real-time collaboration"

### Stand-Out Tips
- Show your terminal -- run the backend, show logs for validation
- Keep energy high but don't rush
- Always explain the WHY, not just the WHAT
- Mention "Component Registry" and "config-driven" repeatedly -- these are the buzzwords they want

---

## Critical Implementation Notes (From Audit)

### 1. CORS Setup (MUST DO or deployed app breaks)
```typescript
// backend/src/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL, // e.g., https://your-app.vercel.app
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```
Test CORS on deployed URL BEFORE recording Loom.

### 2. Stats API uses raw SQL (Prisma can't aggregate JSONB natively)
```typescript
// Use prisma.$queryRaw (safe from SQL injection with tagged templates)
const stats = await prisma.$queryRaw`
  SELECT
    COUNT(*)::int as count,
    AVG((data->>${field})::numeric) as avg
  FROM entity_data
  WHERE app_id = ${appId} AND entity_name = ${entityName}
`;
```
Do NOT use `$queryRawUnsafe`. Always use tagged template literals.

### 3. .gitignore (create at repo root)
```
node_modules/
.env
.env.local
.next/
dist/
```

### 4. Render cold-start handling
Free Render instance sleeps after 15 min. Frontend should show a "Waking up server..." loading state if the first API call takes >5 seconds. Use axios timeout + retry.

### 5. Project Structure (NOT a monorepo, just two folders)
```
/
├── frontend/          # Next.js 15 app
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/
│   │   │   ├── runtime/    # Dynamic renderers
│   │   │   │   ├── registry.ts
│   │   │   │   ├── FormRenderer.tsx
│   │   │   │   ├── TableRenderer.tsx
│   │   │   │   ├── DashboardRenderer.tsx
│   │   │   │   └── UnknownComponent.tsx
│   │   │   ├── ui/         # shadcn components
│   │   │   ├── csv/        # CSV import modal + mapping
│   │   │   └── auth/       # Auth pages + context
│   │   └── lib/
│   │       ├── api.ts      # Axios instance + API calls
│   │       ├── config.ts   # Config parser + defaults
│   │       └── types.ts    # TypeScript types
│   ├── package.json
│   └── .env.local
├── backend/
│   ├── src/
│   │   ├── index.ts        # Express app entry
│   │   ├── routes/
│   │   │   ├── apps.ts     # App CRUD routes
│   │   │   ├── entities.ts # Dynamic entity CRUD
│   │   │   ├── auth.ts     # Auth routes
│   │   │   ├── stats.ts    # Dashboard stats
│   │   │   └── csv.ts      # CSV import endpoint
│   │   ├── middleware/
│   │   │   ├── auth.ts     # JWT middleware
│   │   │   └── validate.ts # Zod validation middleware
│   │   ├── lib/
│   │   │   ├── config-parser.ts  # Parse + apply defaults
│   │   │   └── schema-builder.ts # Dynamic Zod from config
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── package.json
│   └── .env
├── .gitignore
├── README.md
└── EXECUTION_PLAN.md
```

### 6. User-Scoped Data Flow
When auth is enabled for an app:
- POST entity data -> set `created_by` = JWT user ID
- GET entity data -> add WHERE `created_by` = JWT user ID
- When auth disabled -> `created_by` = null, no filtering

---

## Checklist

### Must Ship (Non-Negotiable)
- [ ] Monaco editor for JSON config
- [ ] Dynamic form rendering from config
- [ ] Dynamic table rendering from config
- [ ] Dynamic dashboard with stat widgets
- [ ] Full CRUD APIs (create, read, update, delete)
- [ ] Validation layer (rejects bad data)
- [ ] Component Registry (extensible)
- [ ] UnknownComponent fallback (graceful degradation)
- [ ] CSV Import with column mapping
- [ ] Config-driven auth UI (login + register)
- [ ] Event-based toast notifications
- [ ] Loading states on every page
- [ ] Empty states on every page
- [ ] Error states on every page
- [ ] 3 sample configs seeded
- [ ] Deployed: frontend (Vercel) + backend (Render) + DB (Supabase)
- [ ] GitHub repo with README
- [ ] Loom video (5-10 min)

### Nice To Have (Only If Time)
- [ ] Dark mode toggle
- [ ] Config validation warnings in Monaco
- [ ] Undo/redo in config editor
- [ ] Data export to JSON
- [ ] Field-level search in tables
- [ ] Mobile hamburger menu for sidebar

### Absolute No-Go (Don't Waste Time)
- Drag-and-drop visual builder
- Real-time collaboration
- Multi-tenant isolation
- Code generation / GitHub export
- Complex role-based permissions
- File upload fields in entities

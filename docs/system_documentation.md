# RDC Drug Data Query Platform — System Documentation

> Version: v2 (normalized database edition)
> Live URL: https://rdcdb.com/
> Documentation last updated: 2026-09-22

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Database Design](#5-database-design)
6. [API Documentation](#6-api-documentation)
7. [Frontend Pages](#7-frontend-pages)
8. [Core Module Implementation](#8-core-module-implementation)
9. [Data Pipeline (CSV → MySQL)](#9-data-pipeline-csv--mysql)
10. [Deployment & Operations](#10-deployment--operations)
11. [Environment Variables](#11-environment-variables)
12. [Local Development Guide](#12-local-development-guide)
13. [Error Handling & Conventions](#13-error-handling--conventions)
14. [Known Limitations & Future Improvements](#14-known-limitations--future-improvements)

---

## 1. Project Overview

The RDC (Radionuclide Drug Conjugate) data query platform is a B/S-architecture data service system for pharmaceutical R&D and research personnel.

### 1.1 Core Capabilities

- **RDC drug queries**: drug list (pagination/filtering/sorting), fuzzy search, filtering by status, detail queries
- **Chemical entity queries**: details, search and related RDC lists for five classes of chemical entities (Cold Compound, Ligand, Linker, Chelator, Radionuclide)
- **Related data queries**: drug ↔ target, indication, chemical entity and reference relationships; in vivo/in vitro experimental data (human activity, animal in vivo studies, in vitro studies)
- **Visit statistics**: site-wide visit tracking, IP geolocation resolution, admin statistics dashboard (including map distribution)
- **Data maintenance**: an ingestion workflow of CSV data validation → MySQL diff comparison, with manual triggering via GitHub Actions

### 1.2 System Characteristics

- Isomorphic front end and back end: pages and APIs live in the same Next.js application, deployed as a single process
- Data-driven: all business data is stored in MySQL; static image assets are served from a CDN
- Repeatable data updates: CSV is the data source; the validation script + upsert script guarantee idempotent writes

---

## 2. System Architecture

```text
                          ┌─────────────────────────────┐
                          │        User Browser         │
                          └──────────────┬──────────────┘
                                         │ HTTPS
                          ┌──────────────▼──────────────┐
                          │     Nginx Reverse Proxy     │
                          └──────────────┬──────────────┘
                                         │ http://127.0.0.1:3101
                    ┌────────────────────▼───────────────────────┐
                    │        Next.js 14 App (PM2 daemon)         │
                    │  ┌──────────────────────┐  ┌────────────┐  │
                    │  │ Page Rendering (SSR) │  │ API Routes │  │
                    │  │ app/*/page.tsx       │  │ app/api/*  │  │
                    │  └──────────────────────┘  └────────────┘  │
                    │            ┌────────────────────────────┘  │
                    │            ▼                               │
                    │   lib/rdc-data.ts (data access layer)      │
                    │   lib/db.ts (MySQL connection pool)        │
                    └────────────┬───────────────────────────────┘
                                 │ mysql2
                    ┌────────────▼────────────┐
                    │      MySQL (rdcdb)      │
                    │   17 business tables    │
                    └─────────────────────────┘

    External dependencies:
    - IP geolocation service (used by app/api/visit, 3s timeout)
    - CDN (NEXT_PUBLIC_ASSET_BASE): static assets such as molecule structure images
```

### 2.1 Request Processing Flow

1. Nginx forwards port 443 traffic to local port 3101 (`next start` managed by PM2)
2. Page requests are server-rendered by the App Router; data requests are made by client components calling `/api/*`
3. The API layer validates parameters (`lib/query.ts`) → calls the data access layer (`lib/rdc-data.ts`) → returns JSON
4. On error, a unified error structure is returned (`lib/http.ts`)

---

## 3. Technology Stack

| Layer | Technology | Version | Notes |
| --- | --- | --- | --- |
| Frontend framework | Next.js (App Router) | ^14.2.5 | Pages + API Routes, isomorphic |
| UI library | React / React DOM | ^18.2.0 | Client-side interactive components |
| Language | TypeScript | ^5.4.5 | Fully TypeScript |
| Map visualization | react-simple-maps + d3-scale | ^3.0.0 / ^4.0.2 | Visit statistics world map |
| Database | MySQL | 5.7+ / 8.0 | utf8mb4, InnoDB |
| DB driver | mysql2 | ^3.15.3 | Connection pool + named placeholders |
| Data validation | Python 3 (standard library only) | 3.12 (CI) | Full CSV validation against main.sql |
| Process manager | PM2 | - | fork mode, port 3101 |
| Reverse proxy | Nginx | - | HTTPS termination → 3101 |
| CI/CD | GitHub Actions | - | Two workflows: code deployment + data patch |

---

## 4. Directory Structure

```text
drug/
├── app/                                # Next.js application root
│   ├── layout.tsx                      # Global layout (mounts VisitTracker)
│   ├── page.tsx                        # Home page: tile menu + multi-category search + visitor statistics
│   ├── rdc/
│   │   ├── [drug_id]/page.tsx          # Drug detail page
│   │   └── search/page.tsx             # Search results page
│   ├── chemical/
│   │   └── [entity_category]/[entity_id]/page.tsx  # Chemical entity detail page
│   ├── target/
│   │   └── [target_id]/page.tsx        # Target detail page
│   ├── admin/
│   │   └── visits/page.tsx             # Admin console: visit statistics dashboard
│   ├── about/page.tsx                  # About page
│   ├── manual/page.tsx                 # User manual page
│   ├── components/
│   │   ├── VisitTracker.tsx            # Reports visit records on route changes
│   │   └── activity-sections.tsx       # Activity data display sections (human/in vivo/in vitro)
│   └── api/                            # Backend APIs (see Section 6)
│       ├── rdc/                        # init, list, search, by-status, detail, [drug_id]
│       ├── chemical/                   # detail, search, rdc-list
│       ├── target/[target_id]/         # Target detail (direct SQL)
│       ├── reference/[drug_id]/        # Drug-related references
│       ├── visit/                      # POST visit tracking (IP geolocation)
│       ├── visit-stats/                # Admin statistics data
│       └── visit-public/               # Public statistics data
├── lib/                                # Shared libraries
│   ├── db.ts                           # MySQL connection pool (singleton)
│   ├── rdc-data.ts                     # Data access layer (used by the APIs, queries MySQL)
│   ├── query.ts                        # Query parameter parsing utilities (int/bool/expand)
│   ├── http.ts                         # Unified error response builder
│   ├── types.ts                        # Full business type definitions
│   ├── assets.ts                       # CDN asset URL builder
│   ├── entity-category-colors.ts       # Entity category colors
│   ├── data-access.ts                  # ⚠️ Early mock data access layer (superseded by rdc-data.ts)
│   └── mock-data.ts                    # ⚠️ Mock data (early versions only)
├── scripts/
│   └── upsert_table_from_csv.js        # CSV → MySQL diff/import script
├── csv_templates_normalized/           # Normalized CSV data sources (one file per table)
├── csv_validation_reports/             # Validation report output directory
├── docs/                               # Project documentation
├── Manual/                             # User manuals per module (docx)
├── public/                             # Static assets (logo, entity category SVGs, manual files)
├── main.sql                            # Database schema script (v2 normalized edition)
├── validate_csv_data.py                # Full CSV validation script (Python)
├── run_upserts.sh                      # Local full-table data import script
├── ecosystem.config.js                 # PM2 configuration
├── .github/workflows/                  # CI/CD workflows
│   ├── deploy-code.yml                 # Code deployment (SSH → server build & restart)
│   └── database-csv-patch.yml          # Database CSV patch (dry-run / apply)
├── .env.local                          # Local environment variables (not committed)
└── package.json
```

> **Note**: `lib/data-access.ts` and `lib/mock-data.ts` are early implementations based on mock data; all API routes have since switched to `lib/rdc-data.ts` (queries MySQL). Both files are kept only for documentation demos/fallback scenarios.

---

## 5. Database Design

Database name `rdcdb`, charset `utf8mb4_unicode_ci`, engine InnoDB. The schema script is `main.sql`, containing 17 business tables + 1 runtime table (`site_visits`).

### 5.1 ER Relationship Overview

```text
rdc_drug (drug master table)
 ├── drug_target ──── target (target)
 ├── drug_indication ─ indication (indication)
 ├── drug_chemical_rel ─── chemical_entity (chemical entity, five classes merged)
 │                            └── chemical_affinity (affinity)
 ├── in_vitro ──── in_vitro_measurement (in vitro measurement details)
 ├── human_activity (human activity/clinical data)
 ├── animal_in_vivo_study (animal in vivo study header table)
 │     ├── animal_in_vivo_biodist (biodistribution details)
 │     └── animal_in_vivo_efficacy (efficacy details)
 └── rdc_drug_reference ─── reference (literature)
site_visits (site visit records, runtime table, not in main.sql)
```

### 5.2 Table Inventory

| Table | Business key field(s) | Description |
| --- | --- | --- |
| `rdc_drug` | `drug_id` (unique) | Drug master table: name, aliases, status, type (Treatment/Diagnosis), SMILES, structure image, ChEBI/PubChem IDs, radiochemical metrics |
| `target` | `target_id` (unique) | Target master table, unique on `(name, external_id)` |
| `drug_target` | Composite key `(drug_id, target_id)` | Drug–target many-to-many, includes an evidence field |
| `indication` | `indication_id` (unique) | Indication master table, includes ICD-11 code |
| `drug_indication` | Composite key `(drug_id, indication_id)` | Drug–indication many-to-many |
| `chemical_entity` | `entity_category` + `entity_id` (composite unique; `entity_id` globally unique) | Five classes of chemical entities merged into one table: `ENUM('cold_compound','ligand','linker','chelator','radionuclide')`; includes molecular descriptors (MW/LogP/TPSA/HBD/HBA/rotatable bonds, etc.) and radionuclide-specific fields (symbol/half-life/radiation type/energy) |
| `drug_chemical_rel` | Composite key `(drug_id, relation_role, chemical_entity_id)` | Drug–chemical entity many-to-many; `relation_role` holds the entity category |
| `chemical_affinity` | `affinity_id` (unique) | Entity affinity: type (Kd/Ki/IC50), symbol, value, unit, source |
| `in_vitro` | `in_vitro_id` (unique) | In vitro study header table (overview, PMID/DOI) |
| `in_vitro_measurement` | No business key (`in_vitro_ref_id` foreign key) | In vitro measurement details: category (partition_coefficient/affinity/other…), type (logP/IC50…), symbol/value/unit |
| `human_activity` | `activity_id` (unique) | Human activity/clinical data: trial registration number, indication, subjects, dose, endpoints, efficacy, adverse events |
| `animal_in_vivo_study` | `study_id` (unique) | Animal in vivo study header table |
| `animal_in_vivo_biodist` | `study_ref_id` foreign key | Biodistribution details: dose, measurement time, metabolism/excretion, 7 tumor/organ TBR ratios |
| `animal_in_vivo_efficacy` | `study_ref_id` foreign key | Efficacy details: model, dose, efficacy description, adverse reactions |
| `reference` | `reference_id` (unique) | Reference master table: title, authors, journal, DOI/PMID, abstract |
| `rdc_drug_reference` | Composite key `(drug_id, reference_id)` | Drug–reference many-to-many |
| `site_visits` | Auto-increment id | Visit records: ip, country/country_code/region/city, latitude/longitude, user_agent, path, visited_at (**maintained by code, not included in main.sql**) |

### 5.3 Design Notes

- **Primary key strategy**: every table uses an auto-increment `id` as the physical primary key; business identifiers (`drug_id`, etc.) carry unique indexes as logical primary keys; foreign keys in association tables all point to business identifier fields
- **Cascade deletes**: all association tables use `ON DELETE CASCADE ON UPDATE CASCADE`; deleting a drug automatically cleans up related data
- **Soft deletes**: none; data corrections go through the CSV patch workflow, and a backup table is created automatically before apply
- **Commented-out table**: `animal_in_vivo_pk` (pharmacokinetic details) is commented out in main.sql and not yet enabled, but the API response structure still reserves the `pk` field
- **Foreign key gap**: the composite foreign key from `drug_chemical_rel` to `chemical_entity` is commented out (see main.sql L175); consistency is enforced at the application layer

---

## 6. API Documentation

### 6.1 General Conventions

- **Base URL**: `https://rdcdb.com/api` (local: `http://localhost:3101/api`)
- **HTTP methods**: all `GET`, except `/api/visit` which is `POST`
- **Success response**: returns the data JSON directly (no unified wrapper)
- **Error response** (unified structure, see `lib/http.ts`):

```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | SERVER_ERROR",
    "message": "Error description",
    "details": ["Name of the invalid parameter"]
  }
}
```

| HTTP status | code | Scenario |
| --- | --- | --- |
| 404 | NOT_FOUND | Resource not found |
| 422 | VALIDATION_ERROR | Missing/invalid parameters |
| 500 | SERVER_ERROR | Server-side exception |

- **Pagination parameters**: `page` (default 1, minimum 1), `page_size` (default 20, range 1–100)
- **expand parameter**: comma-separated; supports `chemicals`, `human_activity`, `animal_in_vivo`, `in_vitro`; `all_entities=true` is equivalent to full expansion
- **Boolean parameters**: `true/1/yes/y` are truthy, `false/0/no/n` are falsy (`lib/query.ts`)

### 6.2 RDC Drug Endpoints

#### `GET /api/rdc/init`

Initializes the status enum dictionary.

```json
{ "dicts": { "status": [ { "value": "Approved", "label": "Approved" }, ... ] } }
```

Implementation: `SELECT DISTINCT status FROM rdc_drug` (`listStatusDict`).

#### `GET /api/rdc`

Drug list with pagination, filtering and sorting.

| Parameter | Type | Description |
| --- | --- | --- |
| `page` / `page_size` | int | Pagination |
| `q` | string | Fuzzy match on drug name |
| `status` | string | Exact filter by status |
| `sort` | string | Enum: `created_at:desc` (default) / `created_at:asc` / `drug_name:asc` / `drug_name:desc`; whitelist-validated |

Response: `{ items, page, page_size, total }`; each item includes the primary-selected name of each of the five chemical entity classes (`cold_compound_name` / `ligand_name` / `linker_name` / `chelator_name` / `radionuclide_name`).

#### `GET /api/rdc/search?q={keyword}&limit={n}`

Fuzzy search by drug name; `q` is required, `limit` defaults to 20 (1–100). Returns `{ items: [{drug_id, drug_name, status}] }`.

#### `GET /api/rdc/by-status?status={status}&limit={n}`

Filters drugs by status; `limit` defaults to 50 (1–200).

#### `GET /api/rdc/detail?drug_name={name}`

Looks up basic info (without related data) by exact drug name (case-insensitive).

#### `GET /api/rdc/{drug_id}?expand=&all_entities=`

Drug detail. The base response contains a `general` block (all master table fields) + a `chemicals` block (primary names of the five entity classes); `expand` controls additional blocks; when `all_entities=true`, `chemicals.entities` returns all related entities grouped by category.

Structure of each expand block:

- `human_activity`: array of clinical trials (registration number, indication, patients, dose, endpoints, efficacy, adverse events, etc.)
- `animal_in_vivo`: `{ studies: [{ study_id, pmid, doi, pk: [...], biodistribution: [...], efficacy: [...] }] }`
- `in_vitro`: `{ studies: [overview], <measurement_category>: [measurement details...] }` (dynamically expanded into keys by measurement category)

> Implementation note: even if some expand sections are not requested, the response still includes empty placeholders (`human_activity=[]`, `animal_in_vivo={studies:[]}`, `in_vitro={}`) to keep the frontend structure stable (see route L39-47).

### 6.3 Chemical Entity Endpoints

Valid `entity_category` values: `cold_compound` / `ligand` / `linker` / `chelator` / `radionuclide`.

#### `GET /api/chemical/{entity_category}/{entity_id}?include_activity=`

Entity detail. `include_activity` defaults to `true`:
- `basic`: all entity fields (name, aliases, SMILES, molecular formula, InChI, PubChem CID, molecular descriptors, category-specific fields, etc.)
- `rdc_activity`: aggregation of related RDC drugs and their activity data (including `human_activity`, `animal_in_vivo`, `in_vitro`)

`include_activity=false` returns only `basic`.

#### `GET /api/chemical/{entity_category}/{entity_id}/rdc-list`

Lists the RDC drugs related to this entity (lightweight version, no activity data).

#### `GET /api/chemical/search?entity_category={category}&q={keyword}&limit={n}`

Searches entities by name within the given category; `q` is required.

### 6.4 Target Endpoints

#### `GET /api/target/{target_id}`

Target detail + related drug list (including a subquery for each drug's ligand name). This route **writes SQL directly in the route handler** (bypassing the rdc-data layer).

### 6.5 Reference Endpoints

#### `GET /api/reference/{drug_id}`

Returns the references related to a drug, sorted by publication date descending:

```sql
SELECT r.*, dr.note AS relation_note
FROM rdc_drug_reference dr
JOIN reference r ON r.reference_id = dr.reference_id
WHERE dr.drug_id = ?
ORDER BY r.publication_date IS NULL, r.publication_date DESC, r.title ASC
```

Response: `{ drug_id, references: ReferenceItem[] }`.

### 6.6 Visit Statistics Endpoints

#### `POST /api/visit`

Visit tracking endpoint. Called automatically by the global `VisitTracker` component on route changes; body: `{ path }`.

Processing logic (`app/api/visit/route.ts`):
1. Extracts the client IP from `x-forwarded-for` / `x-real-ip` / `req.ip`
2. Private IPs (127.x, 192.168.x, 10.x, 172.16-31.x) are marked as `Local`
3. For public IPs, calls a third-party geolocation service (3-second AbortController timeout) to obtain country/city/latitude-longitude
4. Reuses existing geolocation records for the same IP when available; only calls the external service on a miss
5. Writes to the `site_visits` table

#### `GET /api/visit-stats`

Admin statistics (used by the `/admin/visits` dashboard): total visits, unique IP count, first visit time, per-country aggregation (Top 100), the 20 most recent records, and map plotting data. `export const dynamic = "force-dynamic"` disables caching.

#### `GET /api/visit-public`

Public statistics (displayed on the home page): returns only `{ total, firstVisit }`; the response forces `no-store` to prevent caching.

---

## 7. Frontend Pages

| Route | File | Function |
| --- | --- | --- |
| `/` | `app/page.tsx` | Home page: tile menu (TileMenu) to switch search category (RDC / the five chemical entity classes), search box, visitor statistics display (calls visit-public) |
| `/rdc/[drug_id]` | `app/rdc/[drug_id]/page.tsx` | Drug detail: basic info + chemical entity composition + activity data sections (human/in vivo/in vitro, reusing `activity-sections.tsx`) + related references |
| `/rdc/search` | `app/rdc/search/page.tsx` | Search result list |
| `/chemical/[entity_category]/[entity_id]` | corresponding page.tsx | Chemical entity detail: molecule info, structure image (CDN), affinity data, related RDC list |
| `/target/[target_id]` | corresponding page.tsx | Target detail + related drugs |
| `/admin/visits` | `app/admin/visits/page.tsx` | Visit statistics dashboard: totals/unique IPs, country distribution table, react-simple-maps world map pins, recent visit list |
| `/about` | `app/about/page.tsx` | About page |
| `/manual` | `app/manual/page.tsx` | Online user manual (with document assets under `public/manual`) |

### 7.1 Global Visit Tracking

`app/layout.tsx` mounts `<VisitTracker />` (a client component), which listens for route changes via `usePathname()` and POSTs the current path (including query string) to `/api/visit`; failures are silently ignored.

### 7.2 Static Asset Strategy

Molecule structure images, result images and other image files are stored on an external CDN (`NEXT_PUBLIC_ASSET_BASE`); `buildAssetUrl(path, folder, ext)` in `lib/assets.ts` builds URLs uniformly: absolute paths are returned as-is, while relative paths automatically get the CDN prefix and file extension appended (default `.png`).

---

## 8. Core Module Implementation

### 8.1 Data Access Layer `lib/rdc-data.ts`

The single data entry point for the API layer (MySQL implementation). Main responsibilities:

- **List/search**: dynamically assembles WHERE/ORDER BY; `normalizeSort` allows only 4 sort combinations (prevents injection); limits are clamped to safe ranges
- **Detail aggregation**: `getDrugDetail` assembles the five blocks general/chemicals/human_activity/animal_in_vivo/in_vitro in parallel according to the expand parameter; in vivo studies nest study → pk/biodist/efficacy three levels deep
- **Entity detail**: `getChemicalDetail` supports the attached `rdc_activity` (recursively calls `getDrugDetail` with full expansion)
- **Fault tolerance**: `isMissingTableError` catches `ER_NO_SUCH_TABLE` and returns empty data instead of 500 when a table is missing (keeps pages usable on first deployment before data is imported)
- **Field mapping**: partial snake_case (database) → camelCase (API) conversion; dates are normalized via `toISOString()`

### 8.2 Database Connection `lib/db.ts`

mysql2 connection pool singleton:

```ts
{ host, port, user, password, database, waitForConnections: true,
  connectionLimit: 10, namedPlaceholders: true }
```

Lazily initialized via `getPool()`; execution is wrapped by `withConnection(fn)`. All configuration comes from environment variables with defaults (127.0.0.1:3306 / rdcdb).

### 8.3 Parameter Parsing `lib/query.ts`

- `parseIntParam(value, default, {min, max})`: falls back to the default on invalid/out-of-range values
- `parseBooleanParam`: boolean parsing with multiple notations
- `parseExpandParam`: comma-separated → `Set<string>`

### 8.4 Unified Error Responses `lib/http.ts`

Four constructors — `errorResponse` / `validationError`(422) / `notFound`(404) / `serverError`(500) — keep the error format consistent across all APIs. API routes are uniformly wrapped in try/catch; unknown exceptions degrade to 500.

---

## 9. Data Pipeline (CSV → MySQL)

### 9.1 Pipeline Overview

```text
Normalized CSV (csv_templates_normalized/*.csv, one file per table)
        │
        ▼
① validate_csv_data.py (Python, read-only validation)
   Validates table structures, fields, types, enums and foreign key references against main.sql
   Writes reports → csv_validation_reports/
        │
        ▼
② upsert_table_from_csv.js (Node, diff/write)
   dry-run: prints a diff summary (default)
   --apply: writes to the database (creates a backup table first by default)
        │
        ▼
③ Manual trigger via GitHub Actions, or local execution
```

### 9.2 Validation Script `validate_csv_data.py`

- Uses only the Python standard library; reads `main.sql` to parse table structures and validates each CSV under `csv_templates_normalized/` table by table
- Supports header alias mapping (e.g. `Type → biodist_type`) and ignores system columns (`id/created_at/updated_at`)
- Validates: required columns, types (numeric/date/enum), foreign key reference integrity (in `TABLE_ORDER` dependency order)
- Outputs Markdown/JSON validation reports, uploaded as CI Artifacts

### 9.3 Ingestion Script `scripts/upsert_table_from_csv.js`

```bash
npm run upsert:csv -- --table <table_name> --csv <path> [options]
  --key <col1,col2>        # business key (composite key)
  --apply                  # actually write (dry-run by default)
  --replace-table          # replace the whole table (use with --apply)
  --compare-all-columns    # full-column comparison for tables without a stable key (read-only)
  --no-backup              # skip the automatic backup table
  --schema / --env         # custom schema and env file paths
```

- Automatically parses `main.sql` for column definitions and unique keys; when `--key` is omitted, the first single-column unique key is used
- Before `--apply`, a backup table `<table>_backup_<date>` is created automatically (skippable with `--no-backup`)
- Write strategy: upsert by business key (compare and update if it exists, insert if not)

### 9.4 Table & Key Mapping (Built into CI)

| Table | Business key | Special strategy |
| --- | --- | --- |
| rdc_drug | drug_id | - |
| target / indication / reference / chemical_affinity / human_activity / animal_in_vivo_study | respective *_id | - |
| drug_target / drug_indication / rdc_drug_reference | two-column composite key | - |
| chemical_entity | entity_category,entity_id | - |
| drug_chemical_rel | drug_id,relation_role,chemical_entity_id | - |
| in_vitro_measurement / animal_in_vivo_biodist / animal_in_vivo_efficacy | none | `--replace-table` full table replacement |

### 9.5 Local Full Import

`./run_upserts.sh`: runs `--replace-table --apply` on all 16 tables in dependency order, used to initialize the database.

---

## 10. Deployment & Operations

### 10.1 Deployment Topology

- **Server**: Alibaba Cloud ECS
- **Process**: PM2 fork mode, app name `rdc-api`, `next start -p 3101`, auto-restart at 500M max memory, logs written to `logs/`
- **Entry**: Nginx 443 → 127.0.0.1:3101
- **Domain**: rdcdb.com

### 10.2 CI/CD (GitHub Actions)

Both workflows are **manually triggered (workflow_dispatch) + protected by the production environment**:

#### `deploy-code.yml` (code deployment)

1. Input the branch name + confirmation string `DEPLOY_TO_PRODUCTION` (prevents accidental triggers)
2. Establishes an SSH connection via Secrets such as `DEPLOY_SSH_KEY`
3. Runs remotely: `git pull --ff-only` → `npm ci` → `npm run build` → `pm2 restart` → `pm2 save`
4. Concurrency group `production-code-deploy` serializes deployments

#### `database-csv-patch.yml` (data patch)

1. Select the target table / CSV path / mode (dry-run by default; apply requires the confirmation string `APPLY_TO_PRODUCTION`)
2. `npm ci` → Python 3.12 environment setup
3. Full CSV validation (validate_csv_data.py) with the validation report uploaded as an Artifact
4. `node --check` syntax check → dry-run diff for all tables
5. Only in apply mode does it write the target table (DB connection injected via Secrets, directly to the production database)

### 10.3 Routine Operations

| Operation | Method |
| --- | --- |
| Ship code | GitHub → Actions → Deploy Code → enter branch + `DEPLOY_TO_PRODUCTION` |
| Update data | GitHub → Actions → Database CSV Patch → dry-run and review the report first, then apply |
| View logs | On the server: `pm2 logs rdc-api`, or the `logs/` directory |
| Restart | `pm2 restart rdc-api` |
| Create schema | `mysql < main.sql` (idempotent, `CREATE TABLE IF NOT EXISTS`) |
| Import data | `./run_upserts.sh` (local full import) |

---

## 11. Environment Variables

Configuration lives in `.env.local` (local) / GitHub Secrets (CI):

| Variable | Required | Description | Default |
| --- | --- | --- | --- |
| `DB_HOST` | Yes | MySQL host | 127.0.0.1 |
| `DB_PORT` | Yes | MySQL port | 3306 |
| `DB_USER` | Yes | Username | root |
| `DB_PASS` | Yes | Password | empty |
| `DB_NAME` | Yes | Database name | rdcdb |
| `NEXT_PUBLIC_ASSET_BASE` | No | Base URL of the static asset CDN (trailing `/` is stripped automatically) | empty (same-origin) |

> ⚠️ `.env.local` contains database credentials; it is excluded via `.gitignore` and must never be committed to the repository.

---

## 12. Local Development Guide

### 12.1 Environment Requirements

- Node.js ≥ 20, MySQL 5.7+/8.0, Python 3 (only needed for data validation)

### 12.2 Startup Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.local.example .env.local   # or create it manually, filling in the database connection info

# 3. Initialize the database (idempotent)
mysql -u root -p < main.sql

# 4. (Optional) Import initial data
./run_upserts.sh

# 5. Start
npm run dev          # development mode, http://localhost:3101
npm run build && npm start   # verify in production mode
```

### 12.3 Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (port 3101) |
| `npm run build` | Production build (doubles as type checking) |
| `npm run lint` | ESLint check |
| `npm run upsert:csv -- --table <t> --csv <f>` | Data diff/import |
| `python validate_csv_data.py` | Full CSV validation |

### 12.4 Verification Checklist

- `npm run lint` and `npm run build` pass
- `GET /api/rdc/init` returns the status dictionary
- `GET /api/rdc?page=1` returns a list with `total > 0`
- Home page search navigates to detail pages, and all detail page sections render correctly

---

## 13. Error Handling & Conventions

1. **API errors**: unified `{error: {code, message, details}}` structure (see Section 6.1)
2. **Sort whitelist**: the sort parameter of `/api/rdc` allows only 4 enum values, eliminating ORDER BY injection; SQL is always parameterized (`?` placeholders)
3. **Pagination clamping**: `page_size` is limited to 1–100 to prevent large result sets from exhausting memory
4. **External call timeout**: IP geolocation queries time out after 3 seconds (AbortController); failures do not block the main tracking flow
5. **Missing-table tolerance**: when a data table does not exist, APIs return empty data instead of 500
6. **Production change protection**: deployments/data writes require manually entering confirmation strings (`DEPLOY_TO_PRODUCTION` / `APPLY_TO_PRODUCTION`); a backup is created automatically before data writes

---

## 14. Known Limitations & Future Improvements

| # | Current state | Recommendation |
| --- | --- | --- |
| 1 | No unit/integration tests | Introduce Vitest/Jest covering the rdc-data layer and key APIs |
| 2 | `lib/data-access.ts` + `lib/mock-data.ts` are legacy mock implementations, superseded but not removed | Remove after confirming no references remain |
| 3 | Leftover debug `console.log` in `data-access.ts` (L380) | Clean up |
| 4 | `site_visits` table not included in main.sql | Add the CREATE TABLE statement so new environments initialize in one step |
| 5 | `animal_in_vivo_pk` table commented out/disabled, but the API structure keeps the pk field | Either enable it or remove it |
| 6 | Composite foreign key from `drug_chemical_rel` to `chemical_entity` commented out | Evaluate enabling it or validating at the application layer |
| 7 | Visit tracking depends on a third-party IP geolocation service | Consider a local IP database (e.g. MaxMind GeoLite2) to reduce external dependency |
| 8 | No authentication on the admin dashboard `/admin/visits` | Add access authentication (Basic Auth / login) |
| 9 | IPs stored in plaintext | Consider masking or hashed storage for compliance |

---

## Appendix A: Related Documents

- `README.md` — quick start guide
- `docs/project_handover.md` — project handover document
- `docs/drug_chemical_rel_workflow_manual.md` — drug–chemical entity data workflow manual
- `RDC_API_DOC.md` — API design document (early version)
- `Manual/Manual-1~6.docx` — user manuals for each module
- `csv_validation_reports/csv_validation_report.md` — most recent CSV validation report

## Appendix B: Entity Categories & Colors

| Category | Enum value | Icon | Description |
| --- | --- | --- | --- |
| Cold Compound | `cold_compound` | `public/cold_compound.svg` | Non-radioactive precursor compound |
| Ligand | `ligand` | `public/Ligand.svg` | Target-binding moiety |
| Linker | `linker` | `public/linker.svg` | Connects the ligand and the chelator |
| Chelator | `chelator` | `public/chelator.svg` | Chelates the radionuclide |
| Radionuclide | `radionuclide` | `public/radionuclide.svg` | Diagnostic/therapeutic radionuclide |

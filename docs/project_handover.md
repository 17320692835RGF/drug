# RDC Project Handover Document

This document is intended for developers taking over the project. It covers project responsibilities, the tech stack, local setup, the database, data updates, deployment, and common maintenance procedures.

## Project Overview

This is an RDC data query project. Both the frontend pages and the backend API are provided by a single Next.js application.

Production URL:

```text
https://rdcdb.com/
```

Core capabilities:

```text
RDC drug list, search, and detail pages
Chemical entity details
Queries for drugs, targets, indications, chemical entities, references, and experimental data
CSV data validation and MySQL data updates
GitHub Actions for manual code deployment and database data updates
```

## Tech Stack

```text
Next.js 14
React 18
TypeScript
MySQL
mysql2
Node.js 20
Python 3, used by the CSV validation script
PM2, daemon for the production Node service
Nginx, production reverse proxy
```

## Important Directories

```text
app/                         Next.js pages and API routes
app/api/                     Backend API
app/components/              Frontend components
lib/                         Data access, types, utility functions
scripts/upsert_table_from_csv.js
                             CSV vs. MySQL compare/write script
csv_templates_normalized/    Normalized CSV data source
csv_validation_reports/      Local CSV validation report output directory
main.sql                     MySQL table schema
validate_csv_data.py         Full CSV validation script
.github/workflows/           GitHub Actions workflows
docs/                        Project documentation
```

## Environment Variables

Local environment file:

```text
.env.local
```

Required configuration:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=rdcdb
NEXT_PUBLIC_ASSET_BASE=http://tfonpalg3.hn-bkt.clouddn.com
```

Notes:

```text
DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME are used to connect to MySQL
NEXT_PUBLIC_ASSET_BASE is the frontend asset base URL
```

Never commit the production database password to the repository.

## Local Development

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

Local URL:

```text
http://localhost:3101
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Database

Default database name:

```text
rdcdb
```

Schema script:

```text
main.sql
```

Example of importing the database:

```bash
mysql -u root -p rdcdb < main.sql
```

If using a local dump export:

```bash
mysql -u root -p rdcdb < dump-rdcdb-xxxx.sql
```

At runtime the project creates a MySQL connection pool via `lib/db.ts`.

## API Routes

Main APIs:

```text
GET /api/rdc
GET /api/rdc/search
GET /api/rdc/by-status
GET /api/rdc/detail
GET /api/rdc/init
GET /api/rdc/[drug_id]
GET /api/chemical/search
GET /api/chemical/[entity_category]/[entity_id]
GET /api/chemical/[entity_category]/[entity_id]/rdc-list
GET /api/reference/[drug_id]
```

Main pages:

```text
/                         Home page
/rdc/search               RDC search page
/rdc/[drug_id]            RDC detail page
/chemical/[entity_category]/[entity_id]
                          Chemical entity detail page
```

Main data reading logic:

```text
lib/rdc-data.ts
lib/data-access.ts
```

## CSV Data Source

The CSV data lives in:

```text
csv_templates_normalized/
```

Current main CSV files:

```text
rdc_drug.csv
target.csv
drug_target.csv
indication.csv
drug_indication.csv
chemical_entity.csv
drug_chemical_rel.csv
chemical_affinity.csv
in_vitro.csv
in_vitro_measurement.csv
human_activity.csv
animal_in_vivo_study.csv
animal_in_vivo_biodist.csv
animal_in_vivo_efficacy.csv
reference.csv
rdc_drug_reference.csv
```

## CSV Validation

Validation script:

```text
validate_csv_data.py
```

Run locally:

```bash
python validate_csv_data.py --schema main.sql --csv-dir csv_templates_normalized --out csv_validation_reports
```

Output:

```text
csv_validation_reports/csv_validation_report.md
csv_validation_reports/csv_validation_summary.csv
csv_validation_reports/csv_validation_details.csv
```

Note: empty `rdc_drug.external_id` values appear in the report but are not treated as blocking errors.

## Writing CSV into MySQL

Script:

```text
scripts/upsert_table_from_csv.js
```

Dry-run example:

```bash
npm run upsert:csv -- --table drug_chemical_rel --csv csv_templates_normalized/drug_chemical_rel.csv --key drug_id,relation_role,chemical_entity_id
```

Apply example:

```bash
npm run upsert:csv -- --table drug_chemical_rel --csv csv_templates_normalized/drug_chemical_rel.csv --key drug_id,relation_role,chemical_entity_id --apply
```

Tables without a stable business unique key are replaced entirely:

```bash
npm run upsert:csv -- --table in_vitro_measurement --csv csv_templates_normalized/in_vitro_measurement.csv --replace-table --apply
```

A full table replacement first creates a backup table, then deletes the current data of the target table and inserts the complete CSV data.

## GitHub Actions

### Code Deployment

Workflow:

```text
.github/workflows/deploy-code.yml
```

GitHub entry point:

```text
Actions -> Deploy Code -> Run workflow
```

Parameters:

```text
branch: main
confirm_deploy: DEPLOY_TO_PRODUCTION
```

What it does:

```text
SSH into the Alibaba Cloud server
Enter the project directory
git pull
npm ci
npm run build
pm2 restart
```

### Data Updates

Workflow:

```text
.github/workflows/database-csv-patch.yml
```

GitHub entry point:

```text
Actions -> Database CSV Patch -> Run workflow
```

Parameters:

```text
table: target table to apply
csv: CSV path; when left empty, csv_templates_normalized/<table>.csv is used
mode: dry-run or apply
confirm_apply: for apply you must enter APPLY_TO_PRODUCTION
```

The dry-run compares all CSV files against the current MySQL data.

The apply writes to the `table` selected by the user.

For more details see:

```text
docs/drug_chemical_rel_workflow_manual.md
```

## GitHub Secrets

Code deployment requires:

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_PORT
DEPLOY_PATH
DEPLOY_SSH_KEY
PM2_APP_NAME
```

Database updates require:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASS
DB_NAME
```

If the secrets are stored in a GitHub Environment, the workflow's `environment` name must match the GitHub environment name.

## Production Deployment Structure

Current production structure:

```text
Nginx -> 127.0.0.1:3101 -> Next.js
Next.js -> 127.0.0.1:3306 -> MySQL
PM2 manages the Next.js process
```

Common server commands:

```bash
pm2 status
pm2 logs rdc-api
pm2 restart rdc-api
systemctl status nginx
systemctl status mysql
```

Manual deployment commands:

```bash
cd /var/www/drug
git fetch origin main
git checkout main
git pull --ff-only origin main
npm ci
npm run build
pm2 restart rdc-api
pm2 save
```

The actual directory is determined by the GitHub Secret `DEPLOY_PATH`.

## Common Maintenance Scenarios

### Modifying Frontend Pages

Look mainly at:

```text
app/page.tsx
app/rdc/[drug_id]/page.tsx
app/rdc/search/page.tsx
app/chemical/[entity_category]/[entity_id]/page.tsx
app/components/
```

After changes:

```bash
npm run build
```

Then publish via `Deploy Code`.

### Modifying API Query Logic

Look mainly at:

```text
app/api/
lib/rdc-data.ts
lib/data-access.ts
lib/db.ts
```

After changes, run at least:

```bash
npm run build
```

### Updating CSV Data

Recommended workflow:

```text
1. Modify the CSV files under csv_templates_normalized
2. Run validate_csv_data.py locally
3. Commit the code
4. Run the Database CSV Patch dry-run in GitHub Actions
5. Confirm the target table diff
6. Then run apply
```

### Modifying the Database Schema

The following must be updated in sync:

```text
main.sql
csv_templates_normalized/*.csv
Validation logic in validate_csv_data.py, if necessary
Write/compare logic in scripts/upsert_table_from_csv.js, if necessary
lib/rdc-data.ts or the API query logic
```

Database schema changes require carefully planned migration steps. It is not advisable to modify the production database manually without keeping `main.sql` in sync.

## Cautions

1. Production data updates must always run dry-run first, then apply.
2. `--apply` writes to the database for real; before running it locally, confirm which database `.env.local` connects to.
3. For full table replacements, make sure the CSV is the complete data set.
4. Never commit production passwords, SSH private keys, or `.env.local`.
5. Do not commit `__pycache__`, `.next`, or `node_modules`.
6. After modifying a workflow, verify on the GitHub Actions page that the display names and parameters match expectations.

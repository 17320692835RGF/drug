# RDC Project Guide

## Next.js API Implementation
- Code directory: `rdc-api`
- How to run:
  1. `cd rdc-api`
  2. (first time) `npm install`
  3. Local development: `npm run dev`
  4. Build/lint: `npm run build` or `npm run lint`

### Implemented Endpoints (based on documented mock data)
- `GET /api/rdc/init`: status enum initialization
- `GET /api/rdc`: RDC list (pagination, filtering, sorting)
- `GET /api/rdc/search`: fuzzy search by drug name
- `GET /api/rdc/by-status`: filter drugs by status
- `GET /api/rdc/detail`: exact query of basic info by drug name
- `GET /api/rdc/{drug_id}`: drug details, supports `expand` and `all_entities`
- `GET /api/chemical/{entity_category}/{entity_id}`: chemical entity details, supports `include_activity`

The data source is in `rdc-api/lib/mock-data.ts`, with the structure based on the table constraints in `main.sql`. Query aggregation and field mapping are in `rdc-api/lib/data-access.ts`.

## Verification
- `npm run lint`
- `npm run build`

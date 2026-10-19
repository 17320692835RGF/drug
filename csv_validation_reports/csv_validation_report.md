# CSV Data Fix Recommendations

This report is intended for data curators. It only describes which CSV files and rows to check, and the recommended fixes.

## Summary

- Files checked: 16
- Data rows checked: 36734
- Issues to review: 3541

## Priority Fixes

Handle duplicate records first, then format errors, empty required fields, missing referenced IDs, and so on. For issues such as "external ID is empty", leave the value empty when no real ID exists; do not invent values.

## Issue Groups

### 1. External ID is empty (2053 issues)

**Files to review**: `rdc_drug.csv` (2053 issues)

**Problem**: The external_id column of the drug is empty. This field does not have to be filled for every row; only fill it in when a real source ID exists.

**Recommended fix**: If there is no real external ID, leave it empty; do not invent IDs just to clear the report. If this column is unused for now, backfill real IDs later.

**Samples**:
- `rdc_drug.csv` line 3, `external_id` = empty
- `rdc_drug.csv` line 4, `external_id` = empty
- `rdc_drug.csv` line 5, `external_id` = empty
- `rdc_drug.csv` line 6, `external_id` = empty
- `rdc_drug.csv` line 7, `external_id` = empty
- `rdc_drug.csv` line 8, `external_id` = empty
- `rdc_drug.csv` line 9, `external_id` = empty
- `rdc_drug.csv` line 10, `external_id` = empty

### 2. Invalid date format (1488 issues)

**Files to review**: `reference.csv` (1488 issues)

**Problem**: The date format in the publication_date column is inconsistent.

**Recommended fix**: Normalize to YYYY-MM-DD, e.g. 2025-06-20.

**Samples**:
- `reference.csv` line 2, `publication_date` = `2025/6/20`
- `reference.csv` line 3, `publication_date` = `2021/9/24`
- `reference.csv` line 4, `publication_date` = `2011/1/19`
- `reference.csv` line 5, `publication_date` = `2025/5/13`
- `reference.csv` line 6, `publication_date` = `2022/10/7`
- `reference.csv` line 7, `publication_date` = `2011/4/13`
- `reference.csv` line 8, `publication_date` = `2007/6/15`
- `reference.csv` line 9, `publication_date` = `2019/12/26`

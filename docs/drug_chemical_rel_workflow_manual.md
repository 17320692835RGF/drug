# Database CSV Patch Manual

This document explains how to use the `Database CSV Patch` workflow in `.github/workflows/database-csv-patch.yml` to validate CSV files, compare them against the production MySQL database, and write data into the target tables after confirmation.

## Scope

This workflow is no longer limited to `drug_chemical_rel`. In apply mode it can write to any table that has a corresponding file in the project's `csv_templates_normalized` directory.

Supported tables:

```text
rdc_drug
target
drug_target
indication
drug_indication
chemical_entity
drug_chemical_rel
chemical_affinity
in_vitro
in_vitro_measurement
human_activity
animal_in_vivo_study
animal_in_vivo_biodist
animal_in_vivo_efficacy
reference
rdc_drug_reference
```

## Entry Point

In the GitHub repository, go to:

```text
Actions -> Database CSV Patch -> Run workflow
```

Parameter reference:

```text
table: target table to write in apply mode
csv: CSV path; when left empty, csv_templates_normalized/<table>.csv is used automatically
mode: dry-run or apply
confirm_apply: for apply mode you must enter APPLY_TO_PRODUCTION
```

## Recommended Workflow

### 1. Commit the CSV first

Commit the CSV files you want to apply, for example:

```text
csv_templates_normalized/drug_chemical_rel.csv
csv_templates_normalized/chemical_entity.csv
csv_templates_normalized/reference.csv
```

### 2. Run a dry-run first

Select:

```text
mode: dry-run
confirm_apply: leave empty
```

The dry-run will:

```text
1. Validate the input parameters
2. Run validate_csv_data.py for a full CSV validation
3. Upload the csv-validation-reports artifact
4. Check the syntax of upsert_table_from_csv.js
5. Compare all CSV files against the current MySQL data
```

Note: the dry-run compares all tables, not just the `table` you selected.

### 3. Inspect the target table results

In the `Dry-run all database diffs` log, find the target table, e.g.:

```text
Dry-run diff: drug_chemical_rel
```

Focus on confirming:

```text
CSV rows
Existing DB rows
Will insert
Will update
Unchanged
Insert samples
Update samples
```

Detail tables without a stable unique key will show:

```text
CSV-only rows
DB-only rows
Unchanged
```

### 4. Then run apply

After confirming the dry-run results look correct, run with:

```text
mode: apply
confirm_apply: APPLY_TO_PRODUCTION
```

If `csv` is left empty, the workflow automatically uses:

```text
csv_templates_normalized/<table>.csv
```

## Write Strategy

Tables with a stable business unique key use upsert:

```text
rdc_drug: drug_id
target: target_id
drug_target: drug_id,target_id
indication: indication_id
drug_indication: drug_id,indication_id
chemical_entity: entity_category,entity_id
drug_chemical_rel: drug_id,relation_role,chemical_entity_id
chemical_affinity: affinity_id
in_vitro: in_vitro_id
human_activity: activity_id
animal_in_vivo_study: study_id
reference: reference_id
rdc_drug_reference: drug_id,reference_id
```

Detail tables without a stable business unique key are replaced entirely during apply:

```text
in_vitro_measurement
animal_in_vivo_biodist
animal_in_vivo_efficacy
```

A full table replacement first creates a backup table, then deletes the current data of the target table and inserts the complete CSV data.

## CSV Validation

Validation script:

```text
validate_csv_data.py
```

Report artifact:

```text
csv-validation-reports
```

Empty `rdc_drug.external_id` values appear in the report but do not block the workflow.

Typical blocking issues:

```text
Referenced ID not found
Duplicate records
Empty required fields
Invalid enum values
Invalid number or date formats
Values too long
Missing CSV files
```

## Local Commands

CSV validation:

```bash
python validate_csv_data.py --schema main.sql --csv-dir csv_templates_normalized --out csv_validation_reports
```

Dry-run for a specific table:

```bash
npm run upsert:csv -- --table drug_chemical_rel --csv csv_templates_normalized/drug_chemical_rel.csv --key drug_id,relation_role,chemical_entity_id
```

Apply for a specific table:

```bash
npm run upsert:csv -- --table drug_chemical_rel --csv csv_templates_normalized/drug_chemical_rel.csv --key drug_id,relation_role,chemical_entity_id --apply
```

Full table replacement apply examples:

```bash

npm run upsert:csv -- --table rdc_drug --csv csv_templates_normalized/rdc_drug.csv --replace-table --apply


# chemical_entity
npm run upsert:csv -- --table chemical_entity --csv csv_templates_normalized/chemical_entity.csv --replace-table --apply

# indication
npm run upsert:csv -- --table indication --csv csv_templates_normalized/indication.csv --replace-table --apply

# reference
npm run upsert:csv -- --table reference --csv csv_templates_normalized/reference.csv --replace-table --apply

# target
npm run upsert:csv -- --table target --csv csv_templates_normalized/target.csv --replace-table --apply


npm run upsert:csv -- --table chemical_affinity --csv csv_templates_normalized/chemical_affinity.csv --replace-table --apply


# drug_indication
npm run upsert:csv -- --table drug_indication --csv csv_templates_normalized/drug_indication.csv --replace-table --apply



npm run upsert:csv -- --table drug_target --csv csv_templates_normalized/drug_target.csv --replace-table --apply

npm run upsert:csv -- --table animal_in_vivo_study --csv csv_templates_normalized/animal_in_vivo_study.csv --replace-table --apply

npm run upsert:csv -- --table animal_in_vivo_biodist --csv csv_templates_normalized/animal_in_vivo_biodist.csv --replace-table --apply

npm run upsert:csv -- --table animal_in_vivo_efficacy --csv csv_templates_normalized/animal_in_vivo_efficacy.csv --replace-table --apply



npm run upsert:csv -- --table drug_chemical_rel --csv csv_templates_normalized/drug_chemical_rel.csv --replace-table --apply


npm run upsert:csv -- --table human_activity --csv csv_templates_normalized/human_activity.csv --replace-table --apply

npm run upsert:csv -- --table in_vitro --csv csv_templates_normalized/in_vitro.csv --replace-table --apply

npm run upsert:csv -- --table in_vitro_measurement --csv csv_templates_normalized/in_vitro_measurement.csv --replace-table --apply


npm run upsert:csv -- --table rdc_drug_reference --csv csv_templates_normalized/rdc_drug_reference.csv --replace-table --apply


```

## Cautions

1. Always run a dry-run before updating the production database.
2. `APPLY_TO_PRODUCTION` must be entered when running apply.
3. Be especially careful with full table replacements; make sure the CSV is the complete data set.
4. Before running `--apply` locally, confirm that `.env.local` points to the correct database.
5. If apply fails, check the logs and the automatically created backup tables first.

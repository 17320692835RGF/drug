# RDC API Documentation (Draft v1)

This document is the external (frontend ↔ backend) API contract for the current Radioligand Drug Conjugates (RDC) project.
The fields, structures, and query behaviors of the interfaces are derived from your page prototypes & requirement descriptions, and are bound to the current database table schemas.
The source tables for each field are cited throughout the document. These tables include `rdc_drug`, `drug_chemical_rel`, `chemical_entity`, `human_activity`, `animal_in_vivo_*`, `in_vitro*`, etc.

---

## 0. Overview of Pages and Interaction Flows

### 0.1 Home Page (Search Page)

* The user can:

  * Type a keyword into the input box to fuzzy-match drug names (RDC Name) → `/api/rdc/search`
  * Select a drug's development/approval status via a dropdown (e.g. Approved, Phase 1, Investigational New Drug, etc.), then pick a drug from the list under that status → `/api/rdc/by-status`
    These status values come from `rdc_drug.status`.
  * Click the "search" button to fetch the drug's basic information by exact drug name → `/api/rdc/detail`
  * Or go directly to the RDC list page (paginated browsing of all drugs) → `/api/rdc`

### 0.2 RDC List Page

* Displays the drug list, where each entry contains:

  * `drug_id` / `drug_name` / `status` / `type`
  * `cold_compound_name`, `ligand_name`, `linker_name`, `chelator_name`, `radionuclide_name`
* Supports pagination parameters `page` / `page_size`
* Source endpoint: `GET /api/rdc`
* These chemical component names come from `chemical_entity`, joined to the drug via the intermediate table `drug_chemical_rel` based on `drug_id`.

### 0.3 RDC Detail Page

* Entered by clicking "RDC Info"
* The page contains:

  * Drug basic information (ID, synonyms, SMILES, structure image, PubChem/ChEBI, etc.)
  * Activity data for the drug:

    * Human activity (clinical/trial/administration information)
    * Animal in vivo activity (PK, biodistribution, efficacy, adverse reactions)
    * In vitro experiment information (partition coefficient, affinity, stability)
* Endpoint: `GET /api/rdc/{drug_id}`
* The activity data comes from the `human_activity`, `animal_in_vivo_*`, and `in_vitro*` table families, all linked to the same drug via `drug_id`.

### 0.4 Chemical Entity Detail Page (Cold Compound / Linker / Ligand / Chelator / Radionuclide)

* Entered from the buttons on the right side of the RDC detail page, e.g. "cold compound Info"
* Displays two blocks of content:

  1. The chemical entity's own physicochemical properties, structure, and identifiers
  2. Activity data of all RDCs that use this chemical entity (same structure as the activity data on the RDC detail page)
* Endpoint: `GET /api/chemical/{entity_category}/{entity_id}`
* Chemical entity data source table: `chemical_entity`.
* "Which drugs use it" is looked up in reverse via `drug_chemical_rel` to find the related `drug_id`s.

---

## 1. General Conventions

### Base URL

`/api`

### Authentication

The interfaces are currently described for a public search scenario. If permissions are needed later, add the following request header:

```http
Authorization: Bearer <token>
```

### Time Format

All times (e.g. `created_at`, `updated_at`) are returned as ISO 8601 strings, in UTC or with a time zone.
The `rdc_drug` table contains `created_at` / `updated_at` fields for auditing and sorting.

### Pagination Conventions

* Query parameters:

  * `page`: page number (starting from 1)
  * `page_size`: number of items per page (default 20, maximum 100)
* Response body:

  * `page`, `page_size`, `total`

### Unified Error Response Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": []
  }
}
```

Common error codes:

* `400 Bad Request` (invalid parameters)
* `404 Not Found`
* `422 VALIDATION_ERROR` (missing fields / malformed format)
* `500 SERVER_ERROR`

---

## 2. Initialization Endpoint: Status Dropdown Dictionary

### GET `/api/rdc/init`

#### Description

* Fetches the status enum when the page initializes, used by the "search by status" dropdown on the home page.
* Status values correspond to the `rdc_drug.status` field (e.g. Approved / Phase 1 / Investigational New Drug / Terminated, etc.).

#### Request Parameters

None

#### Response Example

```json
{
  "dicts": {
    "status": [
      { "value": "Approved", "label": "Approved" },
      { "value": "New Drug Application", "label": "New Drug Application" },
      { "value": "Phase 3", "label": "Phase 3" },
      { "value": "Phase 2", "label": "Phase 2" },
      { "value": "Phase 1", "label": "Phase 1" },
      { "value": "Investigational New Drug", "label": "Investigational New Drug" },
      { "value": "Clinical candidate", "label": "Clinical candidate" },
      { "value": "Investigative", "label": "Investigative" },
      { "value": "Terminated in phase 3", "label": "Terminated in phase 3" },
      { "value": "Terminated in phase 2", "label": "Terminated in phase 2" },
      { "value": "Terminated in phase 1", "label": "Terminated in phase 1" },
      { "value": "Terminated", "label": "Terminated" }
    ]
  }
}
```

---

## 3. RDC List (Pagination + Five Key Components)

### GET `/api/rdc`

#### Description

* Used by the RDC list page, which is also the main results list.
* Each record needs to display the drug itself plus the names of the five key components (compound, ligand, linker, chelator, radionuclide).
* Supports pagination and filtering.

`rdc_drug` stores the drug's main information (`drug_id`, `drug_name`, `status`, `type`, `created_at`, etc.) and serves as the primary/foreign key anchor for other tables (joined via the business key `drug_id`).
The `drug_chemical_rel` table associates `drug_id` with chemical entities (`entity_category`, `entity_id`), used to determine which cold compound / linker / chelator / radionuclide, etc., a drug uses.
The `chemical_entity` table stores the chemical entity's name (`name`), category (`entity_category`), etc.

#### Query Parameters

* `page` (int, optional, default `1`)
* `page_size` (int, optional, default `20`, maximum `100`)
* `q` (string, optional): fuzzy search by drug name; matches `rdc_drug.drug_name LIKE %q%`.
* `status` (string, optional): exact filter by drug status; matches `rdc_drug.status = :status`.
* `sort` (string, optional): sort field, e.g.

  * `created_at:desc` (default)
  * `drug_name:asc`
  * `drug_name:desc`

#### Response Fields (items[*])

* `drug_id`: business-unique identifier of the drug → `rdc_drug.drug_id`
* `drug_name`: drug name → `rdc_drug.drug_name`
* `status`: development/clinical/approval status → `rdc_drug.status`
* `type`: treatment/diagnostic type (displayed in the prototype as "Type: diagnostic or treatment") → `rdc_drug.type`.
* `cold_compound_name`
* `ligand_name`
* `linker_name`
* `chelator_name`
* `radionuclide_name`

The five names above come from `chemical_entity.name`, queried through `drug_chemical_rel` by the `entity_category` values (compound / ligand / linker / chelator / radionuclide) matching the `drug_id`; prefer the record with `relation_role='active'`, otherwise pick the most suitable single record.
The backend can fetch these names in SQL using subqueries or LEFT JOIN + GROUP_CONCAT.

#### Response Example

```json
{
  "items": [
    {
      "drug_id": "RDC-0001",
      "drug_name": "Trastuzumab",
      "status": "Approved",
      "type": "Treatment",
      "cold_compound_name": "ColdCompound-X",
      "ligand_name": "Ligand-A",
      "linker_name": "MC-Val-Cit-PABC",
      "chelator_name": "DOTA",
      "radionuclide_name": "Lu-177",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1234
}
```

#### SQL Query Approach (offset Pagination)

1. Fetch one page from `rdc_drug` using the filters/sort;
2. For each `drug_id` on that page, use subqueries or a batched JOIN through `drug_chemical_rel` → `chemical_entity`, selecting the names for each `entity_category` (compound/ligand/linker/chelator/radionuclide);
3. Return the merged result set.

#### Performance Index Recommendations

* `idx_drug_name` already exists on `rdc_drug(drug_name)`, helping `LIKE` searches.
* Recommendations:

  * `CREATE INDEX idx_rdc_status ON rdc_drug(status);`
  * `CREATE INDEX idx_rel_drug_cat ON drug_chemical_rel(drug_id, entity_category);` (commonly used to fetch the five component names for the list page)

---

## 4. Fuzzy Search of Drug Names (Home Page Input Autocomplete)

### GET `/api/rdc/search`

#### Description

* Fuzzy-matches drug names by keyword and returns a list of candidate drugs, for the dropdown autocomplete.
* Based on `rdc_drug.drug_name LIKE %q%`.

#### Query Parameters

* `q` (string, required): keyword
* `limit` (int, optional, default 20)

#### Response Example

```json
{
  "items": [
    {
      "drug_id": "RDC02571",
      "drug_name": "[177Lu]Lu-SibuDAB",
      "status": "Investigative",
      "type": "Treatment",
      "cold_compound_name": "DOTA-SibuDAB-PSMA-617",
      "ligand_name": "PSMA-617",
      "linker_name": "ibuprofen",
      "chelator_name": "DOTA",
      "radionuclide_name": "177Lu"
    },
    {
      "drug_id": "RDC02572",
      "drug_name": "[225Ac]Ac-Example-Drug",
      "status": "Phase 2",
      "type": "Diagnostic",
      "cold_compound_name": "Example cold compound",
      "ligand_name": "Example ligand",
      "linker_name": "Example linker",
      "chelator_name": "Example chelator",
      "radionuclide_name": "225Ac"
    }
  ]
}
```

---

## 5. Filter Drugs by Status (Home Page Dropdown, Step 2)

### GET `/api/rdc/by-status`

#### Description

* The user first selects a status (e.g. Phase 3), then the list of all drugs with that status is displayed.
* Used for two-level selection like "Step1: pick a status → Step2: pick a drug name".
* Matches `rdc_drug.status = :status`.

#### Query Parameters

* `status` (string, required)
* `limit` (int, optional, default 50)

#### Response Example

```json
{
  "items": [
    { "drug_id": "RDC-0010", "drug_name": "ExampleDrugA", "status": "Phase 3" },
    { "drug_id": "RDC-0011", "drug_name": "ExampleDrugB", "status": "Phase 3" }
  ]
}
```

---

## 6. Exact Match of Drug Name (Home Page "search" Button)

### GET `/api/rdc/detail`

#### Description

* Exact-matches a given `drug_name` and returns the drug's basic information.
* Suitable for showing "the drug's basic card" after the user has confirmed the drug name.

The `rdc_drug` table contains the drug's business identifier, external identifier, synonyms, status, type, structure information, public database references (ChEBI / PubChem), etc.

#### Query Parameters

* `drug_name` (string, required): equality match `rdc_drug.drug_name = :drug_name`.

#### Response Example

```json
{
  "drug_id": "RDC-0002",
  "external_id": "EXT-123",
  "drug_name": "Pertuzumab",
  "drug_synonyms": "Synonym A; Synonym B",
  "status": "Phase 3",
  "type": "Treatment",
  "smiles": "C1=CC=...N2",
  "structure_image": "/static/structures/RDC-0002.png",
  "chebi_id": "CHEBI:12345",
  "pubchem_cid": "123456",
  "pubchem_sid": "654321",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

## 7. Full RDC Details ("RDC Info" Jump Page)

### GET `/api/rdc/{drug_id}`

#### Description

* Displays the complete drug information:

  * General information (basic fields)
  * chemicals (the cold compound / ligand / linker / chelator / radionuclide used by the drug)
  * human_activity (human clinical/application information)
  * animal_in_vivo (animal studies: PK, biodistribution, efficacy, adverse reactions)
  * in_vitro (in vitro experiments: partition coefficient, affinity, stability)

**Drug main information comes from `rdc_drug`:**

* `drug_id`, `external_id`, `drug_name`, `drug_synonyms`, `status`, `type` (treatment or diagnostic), `smiles`, `structure_image`, `chebi_id`, `pubchem_cid`, `pubchem_sid`, `radiochemical_method_description`, `radiochemical_yield`, `radiochemical_purity`, `specific_activity`, `created_at`, `updated_at`.

**Chemical components come from `drug_chemical_rel` + `chemical_entity`:**

* Use `drug_chemical_rel(drug_id, entity_category, entity_id)` to find the chemical entities used by the drug;
* Then fetch `name`, `entity_id`, `entity_category`, etc. from `chemical_entity`;
* The five entity categories are compound / ligand / linker / chelator / radionuclide.

**Human activity comes from `human_activity`:**

* Each drug may have multiple `human_activity` records, with fields including:

  * `clinical_trial_number`, `indication`, `patients`, `dosage`, `frequency`,
  * `results_description`, `purpose`,
  * `clinical_endpoint`, `endpoint_period`,
  * `efficacy_description`, `adverse_events_summary`, `security_indicators`.

**Animal in vivo activity comes from the following tables:**

* `animal_in_vivo_study` (one animal study: `study_id`, `drug_id`, `pmid`, `doi`)
* `animal_in_vivo_pk` (PK: `pk_animal_model`, dosage symbol/value/unit, `half_life`, `pk_image`, `pk_description`)
* `animal_in_vivo_biodist` (biodistribution: `biodist_type`, `animal_model`, dosage, `metabolism`, `excretion`, `detection_time`, `tumor_retention_time`, T/B metrics such as `tbr_tumor_blood` ... `tbr_tumor_heart`, `biodist_result_image`, `biodist_description`)
* `animal_in_vivo_efficacy` (efficacy & adverse reactions: `efficacy_animal_model`, dosage symbol/value/unit, `efficacy_description`, `adverse_reactions`)
  These tables attach the data to the drug via `study_ref_id` referencing `animal_in_vivo_study.study_id`, together with `animal_in_vivo_study.drug_id`.

**In vitro experiments (in_vitro) come from:**

* `in_vitro` (`drug_id` → `study_overview` and other overall descriptions)
* `in_vitro_measurement` (joined to `in_vitro.in_vitro_id` via `in_vitro_ref_id`; fields include

  * `measurement_category` (e.g. `partition_coefficient`, `affinity`)
  * `measurement_type`
  * `measurement_symbols` (e.g. `<`, `≈`, `=`)
  * `measurement_value`
  * `measurement_unit`
  * `method_description`)

#### Path Parameters

* `drug_id` (string, required): business key (not an auto-increment id, but a business ID like `"RDC-0002"`).

#### Query Parameters

* `expand` (string, optional): comma-separated, supports the following fragments:

  * `human_activity`
  * `animal_in_vivo`
  * `in_vitro`
  * `chemicals`

  If not provided, the backend may return only the basic `general` / `chemicals` information for a fast first-page load.
* `all_entities` (boolean, optional, default `false`):

  * `false`: `chemicals` contains only the representative names (single values such as `linker_name`, `radionuclide_name`)
  * `true`: each category (compound/linker/...) in `chemicals.entities` returns an array listing all related entities (including `entity_id`, `name`, `relation_role`, etc.)

#### Response Example

```json
{
  "general": {
    "drug_id": "RDC-0002",
    "external_id": "EXT-123",
    "drug_name": "Pertuzumab",
    "drug_synonyms": "Synonym A; Synonym B",
    "status": "Phase 3",
    "type": "Treatment",
    "smiles": "C1=CC=...N2",
    "structure_image": "/img/RDC-0002.png",
    "chebi_id": "CHEBI:12345",
    "pubchem_cid": "123456",
    "pubchem_sid": "654321",
    "radiochemical_method_description": "Labeled with Lu-177 via DOTA chelation under mild conditions.",
    "radiochemical_yield": "85%",
    "radiochemical_purity": "≥98%",
    "specific_activity": "37 GBq/µmol"
  },
  "chemicals": {
    "compound_name": "ColdCompound-X",
    "ligand_name": "Ligand-A",
    "linker_name": "MC-Val-Cit-PABC",
    "chelator_name": "DOTA",
    "radionuclide_name": "Lu-177",
    "entities": {
      "compound": [
        { "entity_id": "CMP-001", "name": "ColdCompound-X", "relation_role": "active" }
      ],
      "ligand": [
        { "entity_id": "LIG-001", "name": "Ligand-A" }
      ],
      "linker": [
        { "entity_id": "LNK-001", "name": "MC-Val-Cit-PABC" }
      ],
      "chelator": [
        { "entity_id": "CHT-001", "name": "DOTA" }
      ],
      "radionuclide": [
        { "entity_id": "RAD-001", "name": "Lu-177" }
      ]
    }
  },
  "human_activity": [
    {
      "clinical_trial_number": "NCT00000000",
      "indication": "Indication",
      "patients": "Patient population information",
      "dosage": "10 mg/kg",
      "frequency": "weekly",
      "results_description": "Clinical results description",
      "purpose": "Study purpose",
      "clinical_endpoint": "ORR",
      "endpoint_period": "8 weeks",
      "efficacy_description": "Efficacy summary",
      "adverse_events_summary": "AE overview",
      "security_indicators": "Safety indicators"
    }
  ],
  "animal_in_vivo": {
    "studies": [
      {
        "study_id": "STUDY-01",
        "pmid": "12345678",
        "doi": "10.xxxx/yyyy",
        "pk": [
          {
            "pk_animal_model": "Mouse xenograft",
            "pk_dosage_symbols": "≈",
            "pk_dosage_value": 5,
            "pk_dosage_unit": "mg/kg",
            "pk_image": "/img/pk.png",
            "pk_description": "PK results description",
            "half_life": "2.5h"
          }
        ],
        "biodistribution": [
          {
            "biodist_type": "Type A",
            "animal_model": "Mouse",
            "dosage_symbols": "=",
            "dosage_value": 10,
            "dosage_unit": "MBq",
            "metabolism": "Metabolism details",
            "excretion": "Excretion details",
            "detection_time": "2h",
            "tumor_retention_time": "24h",
            "tbr": {
              "tumor_blood": 12.3,
              "tumor_muscle": 5.4,
              "tumor_kidney": 2.1,
              "tumor_salivary_glands": 1.1,
              "tumor_liver": 0.8,
              "tumor_lung": 3.2,
              "tumor_heart": 4.5
            },
            "biodist_result_image": "/img/biodist.png",
            "biodist_description": "Biodistribution description"
          }
        ],
        "efficacy": [
          {
            "efficacy_animal_model": "Mouse",
            "efficacy_dosage_symbols": "<",
            "efficacy_dosage_value": 10,
            "efficacy_dosage_unit": "MBq",
            "efficacy_description": "Tumor growth inhibition xx%",
            "adverse_reactions": "Mild body weight loss"
          }
        ]
      }
    ]
  },
  "in_vitro": {
    "partition_coefficient": [
      {
        "measurement_type": "logP",
        "measurement_symbols": "=",
        "measurement_value": 3.14,
        "measurement_unit": "",
        "method_description": "octanol/water ..."
      }
    ],
    "affinity": [
      {
        "measurement_type": "IC50",
        "measurement_symbols": "<",
        "measurement_value": 0.6,
        "measurement_unit": "nM",
        "method_description": "binding assay ..."
      }
    ],
    "stability": {
      "study_overview": "serum stable 24h"
    }
  }
}
```

---

## 8. Chemical Entity Detail Page (Cold Compound / Linker / Ligand / Chelator / Radionuclide Info)

### GET `/api/chemical/{entity_category}/{entity_id}`

#### Description

* Called when the "cold compound Info / linker Info / ligand Info / chelator Info / radionuclide Info" buttons on the right side of the RDC detail page are clicked.
* Returns two parts:

  1. `basic`: the chemical entity's own basic structural information / physicochemical properties / public database identifiers
  2. `rdc_activity`: all RDC drugs that use this chemical entity, together with their complete activity data blocks (`human_activity`, `animal_in_vivo`, `in_vitro`), equivalent to calling `/api/rdc/{drug_id}` for each drug.

The chemical entity's static information comes from `chemical_entity`:
including `entity_category` (compound / linker / ...), `entity_id`, `name`, `synonyms`, `smiles`, `formula`, `structure_image`, `mol2d_path`, `mol3d_path`, `pubchem_cid`, `inchi`, `inchikey`, `iupac_name`, physicochemical properties (`molecular_weight`, `complexity`, `heavy_atom_count`, `hbond_acceptors`, `hbond_donors`, `rotatable_bonds`, `logp`, `tpsa`), and category-specific fields such as `linker_type`, `radionuclide_symbol`, `radionuclide_half_life`, `radionuclide_emission`, `radionuclide_energy`.

The association between chemical entities and drugs goes through `drug_chemical_rel`, which records `drug_id`, `entity_category`, `entity_id`, `relation_role`, etc., expressing "this drug uses this linker / compound / radionuclide, etc.".

Once the associated `drug_id`s are obtained, the activity data of `/api/rdc/{drug_id}` can be reused for each drug to assemble `rdc_activity[]`. This activity data depends on `rdc_drug`, `human_activity`, `animal_in_vivo_*`, `in_vitro*`.

#### Path Parameters

* `entity_category` (string): allowed values: `compound`, `ligand`, `linker`, `chelator`, `radionuclide`
* `entity_id` (string): business key of the chemical entity → `chemical_entity.entity_id`.

#### Query Parameters

* `include_activity` (boolean, optional, default `true`)

  * `true`: return `rdc_activity`, containing all related drugs and their complete activity data blocks
  * `false`: return only `basic`

#### Response Example

```json
{
  "basic": {
    "entity_category": "compound",
    "entity_id": "CMP-001",
    "name": "Cold Compound Name",
    "synonyms": "CCN; X-123",
    "smiles": "C1=CC=...N2",
    "formula": "C10H12N2O",
    "structure_image": "/img/compound_struct.png",
    "mol2d_path": "/mol/CMP-001_2d.mol",
    "mol3d_path": "/mol/CMP-001_3d.mol",
    "pubchem_cid": "123456",
    "inchi": "InChI=1S/…",
    "inchikey": "ABCDEFG-HIJKL",
    "iupac_name": "IUPAC long name",
    "molecular_weight": 1234.56,
    "complexity": 88.1,
    "heavy_atom_count": 42,
    "hbond_acceptors": 5,
    "hbond_donors": 2,
    "rotatable_bonds": 7,
    "logp": 3.14,
    "tpsa": 44.2,
    "linker_type": null,
    "radionuclide_symbol": null,
    "radionuclide_half_life": null,
    "radionuclide_emission": null,
    "radionuclide_energy": null
  },
  "rdc_activity": [
    {
      "drug_id": "RDC-0001",
      "drug_name": "ExampleDrug",
      "status": "Approved",
      "type": "Treatment",
      "human_activity": [ ... ],
      "animal_in_vivo": { ... },
      "in_vitro": { ... }
    }
  ]
}
```

### GET `/api/chemical/{entity_category}/{entity_id}/rdc-list`

#### Description

* Used by the summary information area at the top of the chemical entity detail page.
* Given a chemical entity category and chemical entity ID, returns:

  1. `basic`: identical to the endpoint above, returning the chemical entity's basic information.
  2. `rdcs`: an array listing summary information for all RDC drugs that use this chemical entity.

* Each `rdcs[]` record contains:

  * `drug_id`: RDC business key (e.g. `"RDC-0002"`)
  * `drug_name`: RDC Name (for frontend display)
  * `status`: the drug's clinical/development status
  * `compound_name`: name of the cold compound associated with this RDC
  * `ligand_name`: name of the ligand associated with this RDC
  * `linker_name`: name of the linker associated with this RDC
  * `chelator_name`: name of the chelator associated with this RDC
  * `radionuclide_name`: name of the radionuclide associated with this RDC

#### Path Parameters

* `entity_category` (string): same as above; allowed values: `cold_compound`, `ligand`, `linker`, `chelator`, `radionuclide`
* `entity_id` (string): business key of the chemical entity → `chemical_entity.entity_id`.

#### Query Parameters

* No additional query parameters (filtering or pagination can be added later if needed).

#### Response Example

```json
{
  "basic": {
    "entity_category": "compound",
    "entity_id": "CMP-001",
    "name": "Cold Compound Name",
    "synonyms": "CCN; X-123",
    "smiles": "C1=CC=...N2",
    "formula": "C10H12N2O",
    "structure_image": "/img/compound_struct.png"
  },
  "rdcs": [
    {
      "drug_id": "RDC-0001",
      "drug_name": "ExampleDrug",
      "status": "Approved",
      "compound_name": "ColdCompound-X",
      "ligand_name": "Ligand-A",
      "linker_name": "MC-Val-Cit-PABC",
      "chelator_name": "DOTA",
      "radionuclide_name": "Lu-177"
    }
  ]
}
```

### GET `/api/chemical/search`

#### Description

* Fuzzy search endpoint for chemical entity names, used for dropdown autocomplete / suggestion search.
* Given a chemical entity category and a keyword, matches names fuzzily only within the specified category.
* Based on `chemical_entity.entity_category = :entity_category AND chemical_entity.name LIKE %q%`.

#### Query Parameters

* `entity_category` (string, required): chemical entity category; allowed values: `cold_compound`, `ligand`, `linker`, `chelator`, `radionuclide`.
* `q` (string, required): keyword.
* `limit` (int, optional, default `20`, maximum `100`): maximum number of candidates to return.

#### Response Fields

* `items[]`: list of candidate chemical entities, each record containing:
  * `entity_id`: business key of the chemical entity → `chemical_entity.entity_id`
  * `name`: chemical entity name → `chemical_entity.name`

#### Response Example

```json
{
  "items": [
    {
      "entity_id": "CMP-001",
      "name": "DOTA-SibuDAB-PSMA-617"
    },
    {
      "entity_id": "CMP-002",
      "name": "PSMA-617"
    }
  ]
}
```

---

## 9. Fetch References by drug_id

### GET `/api/reference/{drug_id}`

#### Description

* Queries the list of literature associated with a drug by the drug's business ID.
* Data comes from the `rdc_drug_reference` join table and the `reference` main table.

#### Response Example

```json
{
  "drug_id": "RDC-0001",
  "references": [
    {
      "reference_id": "REF-001",
      "title": "Imaging study ...",
      "authors": "Foo A.; Bar B.",
      "journal": "J Nucl Med",
      "publication_date": "2024-01-01T00:00:00.000Z",
      "volume": "45",
      "issue": "2",
      "pages": "123-130",
      "doi": "10.1000/xyz",
      "pmid": "12345678",
      "url": "https://example.com/paper",
      "abstract": "...",
      "notes": null,
      "relation_note": "Primary reference"
    }
  ]
}
```

#### Field Notes

* `references[]`: comes from the `reference` table; `relation_note` comes from `rdc_drug_reference.note`.
* Sorting: by `publication_date` descending (nulls last), then by title.

---

## 10. Error Codes / Status Codes

| code             | http | Description                                          |
| ---------------- | ---- | ---------------------------------------------------- |
| VALIDATION_ERROR | 422  | Missing parameters or invalid format (e.g. a required query parameter is absent) |
| NOT_FOUND        | 404  | The specified drug / chemical or other resource cannot be found |
| SERVER_ERROR     | 500  | Internal server error                                |

---

## 11. Performance / Implementation Notes

1. **Indexes**

   * Use the index on `rdc_drug.drug_name` (`idx_drug_name`) for fuzzy drug name searches, plus optional full-text index / search engine optimizations.
   * Create a single-column index on `rdc_drug.status` to speed up status filtering for `/api/rdc/by-status` and `/api/rdc`.
   * Create a composite index on `drug_chemical_rel(drug_id, entity_category)` to improve query efficiency for the five component names on the list page, as well as the chemicals block on the RDC detail page.
   * Create indexes on `human_activity(drug_id)`, `animal_in_vivo_study.drug_id`, and `in_vitro(drug_id)`; the backend can then fetch all activity data in one shot and group it by `drug_id`, avoiding N+1 queries.

2. **Batch Data Assembly**

   * `/api/rdc/{drug_id}`:

     * Query one row from `rdc_drug`
     * Batch-fetch the drug's human_activity, in_vitro, animal_in_vivo_*
     * Assemble into a unified JSON response
   * `/api/chemical/{entity_category}/{entity_id}`:

     * First find all associated `drug_id`s (from `drug_chemical_rel`)
     * Batch-process the activity data (human/animal/in vitro) for those `drug_id`s in one go
     * Then assemble into `rdc_activity[]` and return

3. **Pagination for Large Datasets**

   * `/api/rdc` can use offset pagination (page / page_size) together with the `total` count.
   * If the data volume grows very large later, upgrade to keyset pagination, paging via a `(created_at, id)` or similar composite index, with the backend returning `next_cursor` instead of `page`.
     A `(created_at DESC, id DESC)` composite index must be created on `rdc_drug` to guarantee stable paging.

---

## 12. Frontend Interaction → API Mapping Summary Table

| Interaction Location / Button Description                        | Behavior                                                        | API Call                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Home page input box (real-time suggestions)                      | Fuzzy-match drug names by keyword                               | `GET /api/rdc/search?q=...`                            |
| Home page "select drug by status", step 1                        | Fetch the status enum                                           | `GET /api/rdc/init`                                    |
| Home page "select drug by status", step 2                        | Get the candidate drug list for the selected status             | `GET /api/rdc/by-status?status=...`                    |
| Home page "search" button                                        | User has picked a drug name; fetch that drug's basic information | `GET /api/rdc/detail?drug_name=...`                    |
| RDC list page                                                    | Display all drugs (with the 5 chemical component names), with pagination, filtering, and sorting | `GET /api/rdc?page=...&page_size=...&q=...&status=...` |
| Click "RDC Info"/detail link in the RDC list                     | View the drug's complete information (basic info + activity data + chemicals) | `GET /api/rdc/{drug_id}`                               |
| "Reference" section of the RDC detail page                       | View the reference list associated with the drug                | `GET /api/reference/{drug_id}`                         |
| "cold compound Info / linker Info ..." buttons on the right of the RDC detail page | View the component's detailed structure & all RDCs using it, with their activity data | `GET /api/chemical/{entity_category}/{entity_id}`      |

---

**Up to this point, every page, button, expandable block, and detail panel involved in your prototype has a corresponding API, request parameters, response structure, field sources, and performance recommendations.**

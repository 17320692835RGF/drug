-- ---------------------------------------------------------------------
-- RDC Database Normalized Version (v2)
-- Merged chemical entities and unified in vitro detail structure.
-- ---------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `rdcdb`
  CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
USE `rdcdb`;

-- ---------------------------------------------------------------------
-- Core: drug master table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rdc_drug` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Business unique identifier of the drug',
  `external_id` VARCHAR(128) DEFAULT NULL COMMENT 'External RDC-Drug identifier',
  `type` VARCHAR(64) DEFAULT NULL COMMENT 'Treatment or Diagnosis',
  `drug_name` VARCHAR(255) NOT NULL COMMENT 'Drug name',
  `drug_synonyms` TEXT DEFAULT NULL COMMENT 'Drug synonyms/aliases (comma-separated or JSON)',
  `status` VARCHAR(64) DEFAULT NULL COMMENT 'Development status (preclinical/clinical/approved, etc.)',
  `main_pubmed` VARCHAR(64) DEFAULT NULL COMMENT 'Primary PubMed ID',
  `main_doi` VARCHAR(255) DEFAULT NULL COMMENT 'Primary DOI identifier',
  `smiles` TEXT DEFAULT NULL COMMENT 'SMILES molecular formula',
  `structure_image` VARCHAR(512) DEFAULT NULL COMMENT 'Structure image file path',
  `chebi_id` VARCHAR(64) DEFAULT NULL COMMENT 'ChEBI database ID',
  `pubchem_cid` VARCHAR(64) DEFAULT NULL COMMENT 'PubChem compound CID',
  `pubchem_sid` VARCHAR(64) DEFAULT NULL COMMENT 'PubChem substance SID',
  `moa` TEXT DEFAULT NULL COMMENT 'Mechanism of action (MOA)',
  `notes` TEXT DEFAULT NULL COMMENT 'Drug remarks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time (defaults to now)',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time (maintained automatically)',
  `radiochemical_method_description` TEXT DEFAULT NULL COMMENT 'Radiochemical method description',
  `radiochemical_yield` VARCHAR(32) DEFAULT NULL COMMENT 'Radiochemical yield',
  `radiochemical_purity` VARCHAR(32) DEFAULT NULL COMMENT 'Radiochemical purity',
  `specific_activity` VARCHAR(32) DEFAULT NULL COMMENT 'Specific activity',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drug_id` (`drug_id`),
  UNIQUE KEY `uk_external_id` (`external_id`),
  INDEX `idx_drug_name` (`drug_name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_pubchem_cid` (`pubchem_cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Drug master data';

-- ---------------------------------------------------------------------
-- Core: target master table and relations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `target` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `target_id` VARCHAR(128) NOT NULL COMMENT 'Business unique identifier of the target',
  `name` VARCHAR(255) NOT NULL COMMENT 'Target name',
  `external_id` VARCHAR(128) DEFAULT NULL COMMENT 'External target identifier (e.g. UniProt)',
  `description` TEXT DEFAULT NULL COMMENT 'Target description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_id` (`target_id`),
  UNIQUE KEY `uk_name_external` (`name`, `external_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Target master data';

CREATE TABLE IF NOT EXISTS `drug_target` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (relation row identifier)',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Related drug business ID (rdc_drug.drug_id)',
  `target_id` VARCHAR(128) NOT NULL COMMENT 'Related target business ID (target.target_id)',
  `evidence` TEXT DEFAULT NULL COMMENT 'Relation evidence/reference information',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drug_target` (`drug_id`, `target_id`),
  INDEX `idx_dt_drug` (`drug_id`),
  INDEX `idx_dt_target` (`target_id`),
  CONSTRAINT `fk_dt_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dt_target` FOREIGN KEY (`target_id`) REFERENCES `target`(`target_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Drug-target many-to-many relationship';

-- ---------------------------------------------------------------------
-- Core: indication master table and relations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `indication` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `indication_id` VARCHAR(128) NOT NULL COMMENT 'Business unique identifier of the indication',
  `name` VARCHAR(255) NOT NULL COMMENT 'Indication name',
  `icd11_code` VARCHAR(64) DEFAULT NULL COMMENT 'ICD-11 disease code',
  `type` VARCHAR(50) DEFAULT NULL COMMENT 'Indication type (treatment/diagnosis, etc.)',
  `description` TEXT DEFAULT NULL COMMENT 'Indication description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_indication_id` (`indication_id`),
  UNIQUE KEY `uk_name_code` (`name`, `icd11_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Indication master data';

CREATE TABLE IF NOT EXISTS `drug_indication` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (relation row identifier)',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Related drug business ID (rdc_drug.drug_id)',
  `indication_id` VARCHAR(128) NOT NULL COMMENT 'Related indication business ID (indication.indication_id)',
  `evidence` TEXT DEFAULT NULL COMMENT 'Indication relation evidence/remarks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drug_indication` (`drug_id`, `indication_id`),
  INDEX `idx_di_drug` (`drug_id`),
  INDEX `idx_di_indication` (`indication_id`),
  CONSTRAINT `fk_di_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_di_indication` FOREIGN KEY (`indication_id`) REFERENCES `indication`(`indication_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Drug-indication many-to-many relationship';

-- ---------------------------------------------------------------------
-- Merged chemical entities (compound/ligand/linker/chelator/radionuclide)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chemical_entity` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `entity_id` VARCHAR(128) NOT NULL COMMENT 'Business identifier of the chemical entity within its category',
   `entity_category` ENUM('cold_compound', 'ligand', 'linker', 'chelator', 'radionuclide')
    NOT NULL COMMENT 'Chemical entity category',
  `name` VARCHAR(255) NOT NULL COMMENT 'Chemical entity name',
  `synonyms` TEXT DEFAULT NULL COMMENT 'Chemical entity synonyms/aliases',
  `external_id` VARCHAR(128) DEFAULT NULL COMMENT 'External database identifier',
  `smiles` TEXT DEFAULT NULL COMMENT 'SMILES molecular formula',
  `structure_image` VARCHAR(512) DEFAULT NULL COMMENT 'Structure image file path',
  `formula` VARCHAR(128) DEFAULT NULL COMMENT 'Chemical/molecular formula',
  `iupac_name` TEXT DEFAULT NULL COMMENT 'IUPAC name',
  `inchi` TEXT DEFAULT NULL COMMENT 'InChI string',
  `inchikey` VARCHAR(64) DEFAULT NULL COMMENT 'InChIKey',
  `pubchem_cid` VARCHAR(64) DEFAULT NULL COMMENT 'PubChem CID',
  `mol2d_path` VARCHAR(512) DEFAULT NULL COMMENT '2D MOL file path',
  `mol3d_path` VARCHAR(512) DEFAULT NULL COMMENT '3D MOL file path',
  `molecular_weight` DECIMAL(12,4) DEFAULT NULL COMMENT 'Molecular weight',
  `complexity` DECIMAL(12,4) DEFAULT NULL COMMENT 'Molecular complexity',
  `heavy_atom_count` INT DEFAULT NULL COMMENT 'Heavy atom count',
  `hbond_acceptors` INT DEFAULT NULL COMMENT 'Number of hydrogen bond acceptors',
  `hbond_donors` INT DEFAULT NULL COMMENT 'Number of hydrogen bond donors',
  `rotatable_bonds` INT DEFAULT NULL COMMENT 'Number of rotatable bonds',
  `logp` DECIMAL(8,3) DEFAULT NULL COMMENT 'LogP partition coefficient',
  `tpsa` DECIMAL(10,3) DEFAULT NULL COMMENT 'TPSA topological polar surface area',
  `ligand_type` VARCHAR(100) DEFAULT NULL COMMENT 'Ligand type (ligands only)',
  `linker_type` VARCHAR(100) DEFAULT NULL COMMENT 'Linker type (linkers only)',
  `radionuclide_symbol` VARCHAR(32) DEFAULT NULL COMMENT 'Radionuclide symbol (radionuclides only)',
  `radionuclide_half_life` VARCHAR(128) DEFAULT NULL COMMENT 'Radionuclide half-life description',
  `radionuclide_emission` VARCHAR(128) DEFAULT NULL COMMENT 'Radionuclide emission type',
  `radionuclide_energy` VARCHAR(128) DEFAULT NULL COMMENT 'Radionuclide emission energy',
  `radiochemical_method_description` TEXT DEFAULT NULL COMMENT 'Radiochemical method description',
  `radiochemical_yield` TEXT DEFAULT NULL COMMENT 'Radiochemical yield',
  `radiochemical_purity` TEXT DEFAULT NULL COMMENT 'Radiochemical purity',
  `specific_activity` TEXT DEFAULT NULL COMMENT 'Specific activity',
  `notes` TEXT DEFAULT NULL COMMENT 'Chemical entity remarks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_entity_category_id` (`entity_category`, `entity_id`),
  UNIQUE KEY `uk_entity_id` (`entity_id`),
  INDEX `idx_ce_name` (`name`),
  INDEX `idx_ce_category` (`entity_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Merged chemical entity master data';

CREATE TABLE IF NOT EXISTS `drug_chemical_rel` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (relation row identifier)',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Related drug business ID (rdc_drug.drug_id)',
  `relation_role` ENUM('cold_compound', 'ligand', 'linker', 'chelator', 'radionuclide')
    NOT NULL COMMENT 'Category of the related chemical entity',
  `chemical_entity_id` VARCHAR(128) NOT NULL COMMENT 'Related chemical entity business ID (chemical_entity.entity_id)',
  `notes` TEXT DEFAULT NULL COMMENT 'Relation remarks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drug_chemical` (`drug_id`, `relation_role`, `chemical_entity_id`),
  INDEX `idx_dcr_drug` (`drug_id`),
  INDEX `idx_dcr_entity` (`relation_role`, `chemical_entity_id`),
  CONSTRAINT `fk_dcr_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
  -- CONSTRAINT `fk_dcr_entity` FOREIGN KEY (`relation_role`, `chemical_entity_id`) REFERENCES `chemical_entity`(`entity_category`, `entity_id`)
  --   ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Drug-chemical entity many-to-many relationship';

CREATE TABLE IF NOT EXISTS `chemical_affinity` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (record identifier)',
  `affinity_id` VARCHAR(128) NOT NULL COMMENT 'Business identifier of the affinity record',
  `chemical_entity_id` VARCHAR(128) NOT NULL COMMENT 'Related chemical entity business ID (chemical_entity.entity_id)',
  `affinity_type` VARCHAR(128) DEFAULT NULL COMMENT 'Affinity type (Kd/Ki/IC50, etc.)',
  `affinity_symbols` VARCHAR(32) DEFAULT NULL COMMENT 'Comparison symbol (=, <, >, ≈, etc.)',
  `affinity_value` VARCHAR(255) DEFAULT NULL COMMENT 'Affinity value',
  `affinity_unit` VARCHAR(64) DEFAULT NULL COMMENT 'Affinity unit',
  `description` TEXT DEFAULT NULL COMMENT 'Affinity description',
  `source` VARCHAR(255) DEFAULT NULL COMMENT 'Data source (PMID/DOI/literature, etc.)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_affinity_id` (`affinity_id`),
  INDEX `idx_ca_entity` (`chemical_entity_id`),
  CONSTRAINT `fk_ca_entity` FOREIGN KEY (`chemical_entity_id`) REFERENCES `chemical_entity`(`entity_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chemical entity affinity information';

-- ---------------------------------------------------------------------
-- In vitro data and unified measurement table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `in_vitro` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `in_vitro_id` VARCHAR(128) NOT NULL COMMENT 'Business unique identifier of the in vitro study',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (rdc_drug.drug_id)',
  `pmid` VARCHAR(32) DEFAULT NULL COMMENT 'Related literature PMID',
  `doi` VARCHAR(128) DEFAULT NULL COMMENT 'Related literature DOI',
  `study_overview` TEXT DEFAULT NULL COMMENT 'In vitro study overview/stability description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_in_vitro_id` (`in_vitro_id`),
  INDEX `idx_iv_drug` (`drug_id`),
  CONSTRAINT `fk_iv_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='In vitro study header information';

CREATE TABLE IF NOT EXISTS `in_vitro_measurement` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (detail record)',
  `in_vitro_ref_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (in_vitro.in_vitro_id)',
  `measurement_category` VARCHAR(64) NOT NULL COMMENT 'Measurement category (partition_coefficient/affinity/other, etc.)',
  `measurement_type` VARCHAR(64) NOT NULL COMMENT 'Measurement type (logP/IC50, etc.)',
  `measurement_symbols` VARCHAR(16) DEFAULT NULL COMMENT 'Comparison symbol (=, <, ≤, ≈, etc.)',
  `measurement_value` VARCHAR(255) DEFAULT NULL COMMENT 'Measurement value',
  `measurement_unit` VARCHAR(32) DEFAULT NULL COMMENT 'Measurement unit (nM, μM, etc.)',
  `method_description` TEXT DEFAULT NULL COMMENT 'Measurement method/cell line/condition description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  INDEX `idx_ivm_ref` (`in_vitro_ref_id`),
  INDEX `idx_ivm_category` (`measurement_category`),
  CONSTRAINT `fk_ivm_ref` FOREIGN KEY (`in_vitro_ref_id`) REFERENCES `in_vitro`(`in_vitro_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='In vitro study measurement details';

-- ---------------------------------------------------------------------
-- Human activity data
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `human_activity` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `activity_id` VARCHAR(128) NOT NULL COMMENT 'Business identifier of the human activity study',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (rdc_drug.drug_id)',
  `pmid` VARCHAR(32) DEFAULT NULL COMMENT 'Related literature PMID',
  `doi` VARCHAR(128) DEFAULT NULL COMMENT 'Related literature DOI',
  `clinical_trial_number` VARCHAR(64) DEFAULT NULL COMMENT 'Clinical trial registration number (e.g. NCT number)',
  `indication` VARCHAR(255) DEFAULT NULL COMMENT 'Study indication description',
  `patients` TEXT DEFAULT NULL COMMENT 'Subject description/grouping information',
  `frequency` TEXT DEFAULT NULL COMMENT 'Dosing frequency (qd/bid/weekly, etc.)',
  `dosage` TEXT DEFAULT NULL COMMENT 'Dosage and unit',
  `clinical_endpoint` TEXT DEFAULT NULL COMMENT 'Key clinical endpoint',
  `endpoint_period` TEXT DEFAULT NULL COMMENT 'Endpoint evaluation period',
  `purpose` TEXT DEFAULT NULL COMMENT 'Study purpose',
  `results_description` TEXT DEFAULT NULL COMMENT 'Results description',
  `efficacy_description` TEXT DEFAULT NULL COMMENT 'Efficacy description',
  `security_indicators` TEXT DEFAULT NULL COMMENT 'Safety indicators description',
  `adverse_events_summary` TEXT DEFAULT NULL COMMENT 'Adverse events summary',
  -- `maximum_tolerated_dose` VARCHAR(128) DEFAULT NULL COMMENT 'Maximum tolerated dose (MTD)',
  -- `long_term_safety_toxicity` TEXT DEFAULT NULL COMMENT 'Long-term safety/toxicity description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_id` (`activity_id`),
  INDEX `idx_ha_drug` (`drug_id`),
  INDEX `idx_ha_pmid` (`pmid`),
  INDEX `idx_ha_doi` (`doi`),
  INDEX `idx_ha_trial` (`clinical_trial_number`),
  CONSTRAINT `fk_ha_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Human activity and clinical study data';

-- ---------------------------------------------------------------------
-- Animal in vivo studies (header + details)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `animal_in_vivo_study` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `study_id` VARCHAR(128) NOT NULL COMMENT 'Business identifier of the in vivo study',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (rdc_drug.drug_id)',
  `pmid` VARCHAR(32) DEFAULT NULL COMMENT 'Related literature PMID',
  `doi` VARCHAR(128) DEFAULT NULL COMMENT 'Related literature DOI',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study` (`study_id`),
  INDEX `idx_study_drug` (`drug_id`),
  CONSTRAINT `fk_study_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Animal in vivo study header information';

CREATE TABLE IF NOT EXISTS `animal_in_vivo_biodist` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (detail record)',
  `study_ref_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (animal_in_vivo_study.study_id)',
  `dosage_symbols` VARCHAR(16) DEFAULT NULL COMMENT 'Dosage comparison symbol (=, ≈, <, etc.)',
  `dosage_value` VARCHAR(255) DEFAULT NULL COMMENT 'Dosage value',
  `dosage_unit` TEXT DEFAULT NULL COMMENT 'Dosage unit (MBq, mg/kg, etc.)',
  `detection_time` VARCHAR(64) DEFAULT NULL COMMENT 'Detection time point',
  `metabolism` TEXT DEFAULT NULL COMMENT 'Metabolism description',
  `excretion` TEXT DEFAULT NULL COMMENT 'Excretion description',
  `tumor_retention_time` TEXT DEFAULT NULL COMMENT 'Tumor retention time',
  `tbr_tumor_blood` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/blood T/B ratio',
  `tbr_tumor_muscle` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/muscle T/B ratio',
  `tbr_tumor_kidney` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/kidney T/B ratio',
  `tbr_tumor_salivary_glands` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/salivary glands T/B ratio',
  `tbr_tumor_liver` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/liver T/B ratio',
  `tbr_tumor_lung` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/lung T/B ratio',
  `tbr_tumor_heart` VARCHAR(255) DEFAULT NULL COMMENT 'Tumor/heart T/B ratio',
  `biodist_type` VARCHAR(128) DEFAULT NULL COMMENT 'Biodistribution study type',
  `animal_model` TEXT DEFAULT NULL COMMENT 'Animal model description',
  `cell_lines` VARCHAR(255) DEFAULT NULL COMMENT 'Cell lines',
  `biodist_result_image` VARCHAR(512) DEFAULT NULL COMMENT 'Biodistribution result image path',
  `biodist_description` TEXT DEFAULT NULL COMMENT 'Overall biodistribution description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  INDEX `idx_bd_study` (`study_ref_id`),
  INDEX `idx_bd_time` (`detection_time`),
  CONSTRAINT `fk_bd_study` FOREIGN KEY (`study_ref_id`) REFERENCES `animal_in_vivo_study`(`study_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Animal in vivo study biodistribution details';

-- The PK study table is not needed for now; keep it commented out
-- CREATE TABLE IF NOT EXISTS `animal_in_vivo_pk` (
--   `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (detail record)',
--   `study_ref_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (animal_in_vivo_study.study_id)',
--   `pk_animal_model` VARCHAR(255) DEFAULT NULL COMMENT 'Animal model used in the PK study',
--   `pk_dosage_symbols` VARCHAR(16) DEFAULT NULL COMMENT 'PK dosage comparison symbol',
--   `pk_dosage_value` DECIMAL(12,4) DEFAULT NULL COMMENT 'PK dosage value',
--   `pk_dosage_unit` VARCHAR(32) DEFAULT NULL COMMENT 'PK dosage unit',
--   `pk_description` TEXT DEFAULT NULL COMMENT 'PK results description',
--   `half_life` VARCHAR(255) DEFAULT NULL COMMENT 'Half-life value',
--   `pk_image` VARCHAR(512) DEFAULT NULL COMMENT 'PK result image path',
--   `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
--   `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
--   PRIMARY KEY (`id`),
--   INDEX `idx_pk_study` (`study_ref_id`),
--   CONSTRAINT `fk_pk_study` FOREIGN KEY (`study_ref_id`) REFERENCES `animal_in_vivo_study`(`study_id`)
--     ON DELETE CASCADE ON UPDATE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Animal in vivo study PK details';

CREATE TABLE IF NOT EXISTS `animal_in_vivo_efficacy` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (detail record)',
  `study_ref_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (animal_in_vivo_study.study_id)',
  `efficacy_animal_model` TEXT DEFAULT NULL COMMENT 'Animal model used in the efficacy study',
  `efficacy_dosage_symbols` VARCHAR(16) DEFAULT NULL COMMENT 'Efficacy dosage comparison symbol',
  `efficacy_dosage_value` TEXT DEFAULT NULL COMMENT 'Efficacy dosage value',
  `efficacy_dosage_unit` TEXT DEFAULT NULL COMMENT 'Efficacy dosage unit',
  `efficacy_description` TEXT DEFAULT NULL COMMENT 'Efficacy description',
  `efficacy_image` VARCHAR(512) DEFAULT NULL COMMENT 'Efficacy result image path',
  `adverse_reactions` TEXT DEFAULT NULL COMMENT 'Adverse reactions description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  INDEX `idx_eff_study` (`study_ref_id`),
  CONSTRAINT `fk_eff_study` FOREIGN KEY (`study_ref_id`) REFERENCES `animal_in_vivo_study`(`study_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Animal in vivo study efficacy details';

-- ---------------------------------------------------------------------
-- Reference master table and drug-reference relations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reference` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (internal reference)',
  `reference_id` VARCHAR(128) NOT NULL COMMENT 'Business unique identifier of the reference',
  `title` TEXT NOT NULL COMMENT 'Literature title',
  `authors` TEXT DEFAULT NULL COMMENT 'Author information',
  `journal` VARCHAR(512) DEFAULT NULL COMMENT 'Journal name',
  `publication_date` DATE DEFAULT NULL COMMENT 'Publication date',
  `volume` VARCHAR(50) DEFAULT NULL COMMENT 'Volume number',
  `issue` VARCHAR(50) DEFAULT NULL COMMENT 'Issue number',
  `pages` VARCHAR(100) DEFAULT NULL COMMENT 'Page range',
  `doi` VARCHAR(255) DEFAULT NULL COMMENT 'DOI identifier',
  `pmid` VARCHAR(64) DEFAULT NULL COMMENT 'PubMed ID',
  `url` VARCHAR(512) DEFAULT NULL COMMENT 'Link to the original text',
  `abstract` TEXT DEFAULT NULL COMMENT 'Literature abstract',
  `notes` TEXT DEFAULT NULL COMMENT 'Literature remarks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reference_id` (`reference_id`),
  INDEX `idx_ref_doi` (`doi`),
  INDEX `idx_ref_pmid` (`pmid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reference master data';

CREATE TABLE IF NOT EXISTS `rdc_drug_reference` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment primary key (relation row identifier)',
  `drug_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (rdc_drug.drug_id)',
  `reference_id` VARCHAR(128) NOT NULL COMMENT 'Business ID (reference.reference_id)',
  `note` TEXT DEFAULT NULL COMMENT 'Drug-reference relation remarks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drug_ref` (`drug_id`, `reference_id`),
  INDEX `idx_drug` (`drug_id`),
  INDEX `idx_reference` (`reference_id`),
  CONSTRAINT `fk_drug_ref_drug` FOREIGN KEY (`drug_id`) REFERENCES `rdc_drug`(`drug_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_drug_ref_reference` FOREIGN KEY (`reference_id`) REFERENCES `reference`(`reference_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Drug-reference many-to-many relationship';

-- Query references by drug_id (used by the /api/reference/{drug_id} endpoint):
-- SELECT
--   r.reference_id, r.title, r.authors, r.journal, r.publication_date, r.volume, r.issue, r.pages,
--   r.doi, r.pmid, r.url, r.abstract, r.notes, dr.note AS relation_note
-- FROM rdc_drug_reference dr
-- JOIN reference r ON r.reference_id = dr.reference_id
-- WHERE dr.drug_id = ?
-- ORDER BY r.publication_date IS NULL, r.publication_date DESC, r.title ASC;
-- ---------------------------------------------------------------------
-- RDC Database Normalized Version (v2)
-- Merged chemical entities and unified in vitro detail structure.
-- ---------------------------------------------------------------------

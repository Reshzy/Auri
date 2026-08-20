# Auri Template Audit

Audit date: 2026-08-11  
Auditor: Cursor Phase 0  
Source of truth: `AURI_CURSOR_MASTER_SPEC.md` §3  
Local visual render: **not performed** — LibreOffice/`soffice` is not installed on this machine. Structural OOXML inspection was completed instead.

## 1. Source files and hashes

| File                          | Location after Phase 0                         | Size (bytes) | SHA-256                                                            |
| ----------------------------- | ---------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| `ACCOMPLISHMENT - RODGE.docx` | `templates/source/ACCOMPLISHMENT - RODGE.docx` | 28561        | `d1381a91daf69d13a8a3d836be722dc4fa05544def667b194dce959361e091c5` |
| `DTR RODGE.xlsx`              | `templates/source/DTR RODGE.xlsx`              | 18292        | `26a88e371c9df57ab3a2535493d81af70cf5f788cead3695dcc67de0b12da80c` |

Byte-identical copies also remain at the repository root from bootstrap. Phase 0 placed canonical copies under `templates/source/` without modifying file contents (hashes verified equal before and after copy). Prefer `templates/source/` as the immutable source of truth.

**Rule:** never overwrite these source files. Derived runtime templates live only under `templates/runtime/`.

## 2. Accomplishment DOCX audit

### 2.1 Package parts

Present:

- `[Content_Types].xml`
- `_rels/.rels`
- `word/document.xml` (large; ~166 KB)
- `word/_rels/document.xml.rels`
- `word/styles.xml`, `word/settings.xml`, `word/theme/theme1.xml`
- `word/fontTable.xml`, `word/webSettings.xml`
- `docProps/core.xml`, `docProps/app.xml`

No drawings/media parts in the DOCX package.

### 2.2 Page size and margins

Single `sectPr` in `word/document.xml`:

| Setting         | Observed value | Interpretation        |
| --------------- | -------------- | --------------------- |
| `pgSz/@w`       | `18720` twips  | 13.0 in               |
| `pgSz/@h`       | `12240` twips  | 8.5 in                |
| `pgSz/@orient`  | `landscape`    | Landscape             |
| `pgSz/@code`    | `5`            | Word legal paper code |
| `pgMar/@top`    | `432` twips    | 0.30 in               |
| `pgMar/@right`  | `720` twips    | 0.50 in               |
| `pgMar/@bottom` | `720` twips    | 0.50 in               |
| `pgMar/@left`   | `720` twips    | 0.50 in               |

**Spec comparison:** Spec §3.1 says “landscape legal-size … with narrow margins.” Observed page size/orientation match. Margins are moderately tight (0.3–0.5 in), not Excel-style 0.25 in; wording “narrow” is directionally correct.

### 2.3 Document structure

Observed content (in order):

1. Heading: `MUNICIPALITY OF SANCHEZ MIRA`
2. Office: `VICE MAYOR’S OFFICE` (Unicode apostrophe in source)
3. Department placeholder: `(Name of Department)`
4. Title: `ACCOMPLISHMENT REPORT`
5. Employee: `Name:  RODGE ANDRU P. VILORIA`
6. Period: `Period Covered:  August 1-15, 2026`
7. Daily table (15 sample dates)
8. Certification paragraph
9. Total hours line
10. Four-column signatory table
11. **Exact second copy of items 1–10**

### 2.4 Tables

| Table index | Role                 | Rows | Notes                                  |
| ----------- | -------------------- | ---- | -------------------------------------- |
| 0           | Daily grid (copy 1)  | 17   | 2 header rows + 15 day rows (Aug 1–15) |
| 1           | Signatories (copy 1) | 1    | 4 columns                              |
| 2           | Daily grid (copy 2)  | 17   | Duplicate of table 0                   |
| 3           | Signatories (copy 2) | 1    | Duplicate of table 1                   |

Daily table logical columns:

1. `DATE`
2. `AM` (`TIME STARTED`)
3. `PM` (`TIME STARTED`)
4. `TIME SPENT` / `FOR THE DAY`
5. `DAILY ACCOMPLISHMENT`
6. `REMARKS`

`tblGrid` has **6** `gridCol` entries even though the top header row exposes 5 visual labels (AM/PM share the time-started header).

Sample day-row shape:

```text
[date] [am] [pm] [time_spent] [accomplishment_or_off_label] [remarks]
```

Non-workdays use `-` in AM/PM/time-spent and put `SATURDAY` / `SUNDAY` / `FRIDAY` in the accomplishment column.

### 2.5 Duplicated section and totals inconsistency

Confirmed:

- `ACCOMPLISHMENT REPORT` appears **twice**
- First total: `TOTAL NO. OF HOURS:  80HRS`
- Second total: `TOTAL NO. OF HOURS:  70`
- Same employee, period, days, and signatories appear in both copies

**Spec comparison:** Matches §3.1 exactly, including the `80HRS` vs `70` inconsistency and the note that the second copy spills awkwardly. Visual page-spill could not be re-confirmed here without LibreOffice PDF render.

### 2.6 Spec discrepancies / gaps for DOCX

| Topic                   | Spec claim                | Observed                   | Status                                      |
| ----------------------- | ------------------------- | -------------------------- | ------------------------------------------- |
| Duplicate report copies | Yes                       | Yes (2 full copies)        | Match                                       |
| Totals inconsistency    | `80HRS` vs `70`           | Confirmed                  | Match                                       |
| Legal landscape         | Yes                       | Yes (`code=5`, landscape)  | Match                                       |
| Narrow margins          | Yes                       | 0.30–0.50 in               | Match (wording only)                        |
| Daily rows available    | Runtime needs **16** rows | Source has **15** day rows | **Gap** — runtime template must add one row |
| Sample period           | Aug 1–15, 2026            | Confirmed                  | Match                                       |
| Tokens in source        | N/A (runtime only)        | No Docxtemplater tags yet  | Expected                                    |

## 3. DTR XLSX audit

### 3.1 Workbook sheets

| Sheet name | Path                       | Content                            |
| ---------- | -------------------------- | ---------------------------------- |
| `Sheet1`   | `xl/worksheets/sheet1.xml` | Full CSC Form No. 48 dual-copy DTR |
| `Sheet2`   | `xl/worksheets/sheet2.xml` | Blank (`dimension=A1`, 0 cells)    |
| `Sheet3`   | `xl/worksheets/sheet3.xml` | Blank (`dimension=A1`, 0 cells)    |

**Spec comparison:** Matches §3.2 sheet names and blank secondary sheets.

### 3.2 Package parts of special interest

Present and must be preserved by the patcher:

- `xl/drawings/drawing1.xml`
- `xl/drawings/vmlDrawing1.vml`
- Sheet1 relationships for drawing (`rId2`) and legacy VML (`rId3`)
- `pageSetup` relationship `rId1` (print settings / printer settings part)

### 3.3 Print / page setup

Observed on `Sheet1`:

| Setting                            | Value               | Spec                        |
| ---------------------------------- | ------------------- | --------------------------- |
| `paperSize`                        | `14`                | Match (legal)               |
| `orientation`                      | `landscape`         | Match                       |
| `scale`                            | `73`                | Match (~73%)                |
| margins                            | `0.25` in all sides | Match                       |
| `printOptions/@horizontalCentered` | `1`                 | Match                       |
| header/footer margins              | `0`                 | Spec silent; keep unchanged |

Used range: cells exist through row **60**, columns through **O/P** area as described (`A1:P60` approximate). Cell count observed: **789**.

### 3.4 Dual-copy layout

| Region         | Columns |
| -------------- | ------- |
| Left CSC copy  | `A:G`   |
| Spacer         | `H`     |
| Right CSC copy | `I:O`   |

### 3.5 Merged ranges (exact list)

`mergeCells/@count="26"` — all 26 observed:

```text
A1:C1
I1:K1
B3:F3
J3:N3
A6:G6
I6:O6
A7:G7
I7:O7
D8:G8
L8:O8
A12:A13
I12:I13
B12:C12
D12:E12
F12:G12
J12:K12
L12:M12
N12:O12
A45:E45
I45:M45
A53:G53
I53:O53
B59:F59
J59:N59
F60:G60
N60:O60
```

### 3.6 Formulas

| Cell  | Formula        | Cached value             | Spec                                                            |
| ----- | -------------- | ------------------------ | --------------------------------------------------------------- |
| `I6`  | `A6`           | `RODGE ANDRU P. VILORIA` | Match (right name mirrors left)                                 |
| `L8`  | `D8`           | `AUGUST 1-15`            | Match (right period mirrors left)                               |
| `F45` | `SUM(F14:F44)` | `0`                      | Match                                                           |
| `N45` | `SUM(N14:N44)` | `0`                      | Match                                                           |
| `A53` | `A6`           | employee name            | Spec lists `A53` as signature name; source uses formula to `A6` |
| `I53` | `A6`           | employee name            | Spec allows mirror; both signature names point to `A6`          |

No formula found for undertime minutes totals (`G45` / `O45` are empty styled cells).

### 3.7 Verified mapping contract

| Meaning                 | Left          | Right         | Notes                                            |
| ----------------------- | ------------- | ------------- | ------------------------------------------------ |
| Employee name           | `A6`          | `I6` (`=A6`)  | Populate left only if preserving mirror formulas |
| Period label            | `D8`          | `L8` (`=D8`)  | Populate left only if preserving mirror formulas |
| Day number              | `A14:A44`     | `I14:I44`     | Prefilled `1`–`31`                               |
| AM arrival              | `B14:B44`     | `J14:J44`     | Currently empty sample                           |
| AM departure            | `C14:C44`     | `K14:K44`     | Currently empty sample                           |
| PM arrival              | `D14:D44`     | `L14:L44`     | Currently empty sample                           |
| PM departure            | `E14:E44`     | `M14:M44`     | Currently empty sample                           |
| Undertime hours         | `F14:F44`     | `N14:N44`     | Currently empty; totals sum these                |
| Undertime minutes       | `G14:G44`     | `O14:O44`     | Currently empty                                  |
| Total undertime hours   | `F45` formula | `N45` formula | Preserve formulas                                |
| Employee signature name | `A53` (`=A6`) | `I53` (`=A6`) | Preserve formulas; writing `A6` updates both     |

### 3.8 Spec discrepancies / nuances for XLSX

| Topic                   | Spec claim                                     | Observed                                                                                                                      | Status                           |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Sheet names             | Sheet1/2/3                                     | Exact                                                                                                                         | Match                            |
| Dual copy A:G / H / I:O | Yes                                            | Yes                                                                                                                           | Match                            |
| Day rows 14–44          | Yes                                            | Days 1–31 present                                                                                                             | Match                            |
| `F45`/`N45` formulas    | Yes                                            | `SUM(...)` present                                                                                                            | Match                            |
| Drawing + VML parts     | Must remain                                    | Both present                                                                                                                  | Match                            |
| Print settings          | legal/landscape/73%/0.25/centered              | Exact                                                                                                                         | Match                            |
| Right copy always equal | Populate both day cells unless mirror formulas | Name/period/signature already mirrored by formula; **time/undertime cells are independent and must be written on both sides** | Clarified                        |
| Sample times in source  | Spec discusses sample behavior                 | This workbook’s day time/undertime cells are blank; only identity/period/static labels filled                                 | Minor nuance vs narrative sample |

## 4. Runtime template plan

### 4.1 DOCX → `accomplishment-report-v1.docx`

Keep source untouched. Derive runtime template in Phase 6 via `scripts/prepare-accomplishment-template.ts`:

1. Start from source DOCX ZIP.
2. Remove the second full report copy (second heading through second signatory table).
3. Replace sample values with flat Docxtemplater tags from §3.1.
4. Expand the daily table from 15 data rows to **16** token rows (`r01`…`r16`).
5. Keep legal landscape, borders, certification, and 4 signatory columns.
6. Ensure one-page fit for 15- and 16-row fixtures (LibreOffice visual gate on a machine that has it).
7. Record `runtimeSha256` in `templates/manifests/accomplishment-report-v1.json`.

### 4.2 XLSX → `dtr-csc-form-48-v1.xlsx`

Phase 7 derived `templates/runtime/dtr-csc-form-48-v1.xlsx` from the audited source without modifying the source bytes:

1. Byte-copy source XLSX to runtime file.
2. Clear sample employee/period values in owned input cells (`A6`, `D8`) while preserving styles and mirror formulas.
3. Clear stale cached formula values on `I6` / `L8` / `A53` / `I53`.
4. Blank shared-string sample identity/period entries without reordering indices.
5. Leave day numbers, merges, formulas, drawings, VML, print setup untouched.
6. Record `runtimeSha256` and full cell-map contract in `templates/manifests/dtr-csc-form-48-v1.json`.

See `docs/PHASE7_XLSX_EXPORT.md`. Local visual/LibreOffice page-count gate remains **blocked/pending** when `soffice` is unavailable; structural ZIP/XML validation is green.

## 4.3 Phase 6 DOCX status

Phase 6 derived `templates/runtime/accomplishment-report-v1.docx` from the audited source without modifying the source bytes. Manifest now records `runtimeSha256`, `maxRows: 16`, and the full required token list. See `docs/PHASE6_DOCX_EXPORT.md`.

Local visual/LibreOffice page-count gate remains **blocked/pending** when `soffice` is unavailable; structural ZIP/XML validation is green.

## 5. Manifest schema

Canonical schema fields (both manifests):

```json
{
  "id": "string",
  "type": "docx | xlsx",
  "version": 1,
  "sourceFile": "string",
  "runtimeFile": "string",
  "sourceSha256": "hex",
  "runtimeSha256": "hex-or-empty-until-prepared",
  "pageSize": "legal",
  "orientation": "landscape",
  "active": false,
  "notes": "string"
}
```

Draft manifests live in `templates/manifests/`.

## 6. Audit conclusions

1. Spec §3 is largely accurate against the real files.
2. Critical DOCX issues (duplicate copy + inconsistent totals) are confirmed and must be fixed only in the runtime derivative.
3. Critical XLSX preservation requirements (dual copy, formulas, merges, drawings/VML, print setup) are confirmed.
4. Main constructive gap: source DOCX has 15 day rows; runtime needs 16.
5. Local PDF/page-spill render gate is blocked until LibreOffice is available; structural audit is complete and sufficient to proceed with Phase 1.

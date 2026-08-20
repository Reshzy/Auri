# Auri templates

```text
templates/
├── source/          # Immutable supplied Office files
├── runtime/         # Derived fillable templates (`pnpm docx:prepare` / `pnpm xlsx:prepare`)
└── manifests/       # Version metadata + SHA-256 hashes
```

## Rules

1. Never overwrite files in `source/`.
2. Never regenerate official layouts from scratch in application code.
3. Runtime DOCX/XLSX must preserve official visual language while replacing sample values with tags or cleared inputs.
4. Record `sourceSha256` and `runtimeSha256` before activating a template version.
5. Export records must store the template version and hash used (Phase 8 persistence).

## Commands

```bash
pnpm docx:prepare && pnpm docx:audit
pnpm xlsx:prepare && pnpm xlsx:audit
pnpm templates:upload:docx
pnpm templates:upload:xlsx
```

## Current source hashes

| File                                 | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `source/ACCOMPLISHMENT - RODGE.docx` | `d1381a91daf69d13a8a3d836be722dc4fa05544def667b194dce959361e091c5` |
| `source/DTR RODGE.xlsx`              | `26a88e371c9df57ab3a2535493d81af70cf5f788cead3695dcc67de0b12da80c` |

Runtime hashes live in the corresponding manifests. See `docs/TEMPLATE_AUDIT.md`, `docs/PHASE6_DOCX_EXPORT.md`, and `docs/PHASE7_XLSX_EXPORT.md`.

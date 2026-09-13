# E2E Test Infra: BEFORE ALPHA Bedrock Add-on

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA (Boundary Value Analysis) + Pairwise Combinatorial + Workload Testing.
- Verification covers:
  1. JSON Schemas & Bedrock 1.21.60+ structural compliance.
  2. Asset Integrity: 16x16 PNG textures, SHA256 integrity, dimension validation, color properties.
  3. RP Registrations: `terrain_texture.json`, `blocks.json`, `item_texture.json`, `texts/en_US.lang`.
  4. Script API & Dimension Logic: `@minecraft/server` (2.8.0) and `@minecraft/server-ui` (2.1.0) compilation, startup dimension registration hooks, ticking area lifecycle, spawn platform geometry.
  5. Molang Worldgen Pipelines: 6-layer architecture validation, feature syntax, leaf single-block feature bindings, bedrock floor guarantees at y=0, water table at y<64.
  6. Packaging & Deployment: File synchronization to `com.mojang/development_behavior_packs/BeforeAlpha_BP` and `development_resource_packs/BeforeAlpha_RP`.
  7. Git & Documentation: Working tree cleanliness, branch verification, remote URL `https://github.com/Senthemodder/before_alpha_addon.git`, cross-project README consistency.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Behavior Pack Manifest | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Resource Pack Manifest | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Java Alpha 9 Cloned Blocks | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Bedrock Beta 9 Cloned Blocks | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 5 | Authentic 16x16 Textures | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | RP terrain_texture.json | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 7 | RP blocks.json Sound Mapping | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 8 | Localization texts/en_US.lang | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 9 | Startup Dimension Registration | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 10 | THE GLITCH Item Definition | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 11 | THE GLITCH Texture & Icon | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 12 | THE GLITCH Modal UI | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 13 | Sneak Quick-Cycle Warp | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 14 | Dynamic Destination Ticking Area | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 15 | Safe Landing Platform Builder | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 16 | 6-Layer Pipeline Architecture | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 17 | Java Alpha Worldgen Pipeline | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 18 | Bedrock Beta Worldgen Pipeline | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 19 | Unconditional Bedrock Floor (y=0) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 20 | Water Table Filling (y<64) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 21 | Automated Test Suite Execution | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 22 | Local Dev Deployment Automation | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 23 | Git Repository & Remote Push | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 24 | Master README & Ecosystem Doc | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: `tests/run_tests.js` executed with `node tests/run_tests.js`.
- Test suites:
  - `tests/test_manifests.js`: Validates UUIDs, format versions, dependencies.
  - `tests/test_blocks.js`: Validates 18 block JSONs, components, omission of sound in description.
  - `tests/test_textures.js`: Validates 16x16 PNG sizes, SHA256 matches, color properties, terrain_texture.json.
  - `tests/test_scripts.js`: Validates JS syntax (`node --check`), module exports, dimension registration, ticking area timeout logic.
  - `tests/test_worldgen.js`: Validates feature rules, feature JSONs, block identifier resolution, bedrock floor at y=0, water table.
  - `tests/test_deployment.js`: Validates synchronization into `development_behavior_packs` and `development_resource_packs`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Player Spawns in Overworld & Uses THE GLITCH to warp to Java Alpha | F1-F15, F21 | High |
| 2 | Player Explores Java Alpha Terrain with Authentic Blocks & Bedrock Floor | F3, F5-F8, F16, F17, F19, F20 | High |
| 3 | Player Sneak-Warps from Java Alpha to Bedrock Beta with Safe Platform | F4-F8, F12-F15, F18, F19 | High |
| 4 | Clean Engine Reload & Add-on Packaging to Local Dev Folders | F1, F2, F21, F22 | Medium |
| 5 | Full Ecosystem Cross-Reference & Repository Sync | F23, F24 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature (24 features × 5 = 120 tests)
- Tier 2: ≥5 per feature (boundary and invalid cases)
- Tier 3: Pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
- Total Target: Comprehensive test suite with automated runner returning exit code 0.

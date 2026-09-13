# Project: BEFORE ALPHA Bedrock Add-on

## Architecture
BEFORE ALPHA is a modular Minecraft Bedrock Add-on (supporting Bedrock 1.21.60+) built on a twin-dimension nostalgia architecture:
- **Resource Pack (`BeforeAlpha_RP`)**: Contains authentic 16x16 PNG textures from Java Alpha (`a1.1.2_01`) and Bedrock Beta (`mcpe_0.1.0`), sound definitions via `blocks.json`, texture definitions in `terrain_texture.json`, item textures in `item_texture.json`, and localization in `texts/en_US.lang`.
- **Behavior Pack (`BeforeAlpha_BP`)**:
  - **Custom Blocks (`BP/blocks/`)**: 18 cloned version blocks (9 Alpha variants, 9 Beta variants) declared with format version 1.21.60, strictly omitting sound in description.
  - **Custom Items (`BP/items/`)**: Interactive dimensional warp item `before_alpha:the_glitch` (format version 1.20.50).
  - **Script API Engine (`BP/scripts/`)**: TypeScript / ES2022 module registering twin dimensions (`before_alpha:java_alpha` and `before_alpha:bedrock_beta`) in `system.beforeEvents.startup`, managing modal UI forms via `@minecraft/server-ui`, creating destination ticking areas via `world.tickingAreaManager.createTickingArea`, and generating safe landing platforms at y=65.
  - **Pure Molang Worldgen Pipelines (`BP/features/` & `BP/feature_rules/`)**: 6-layer voxel column-stacking pipelines with Notchian 16-octave Perlin contours for Java Alpha and MCPE multi-octave domain-warped contours for Bedrock Beta, with bedrock floor at y=0 and water table at y < 64.
- **Testing & Deployment Suite (`tests/`, `tools/`)**: Standalone Node.js validation test suite (154 tests across Tiers 1-4) and deployment automation (`tools/deploy.js`) synchronizing to host `com.mojang` development directories.
- **Ecosystem Documentation & Git Remote**: Master README.md linking `minecraft_nostalgia_archive`, `molang_nostalgia_worldgen`, and `BEFORE ALPHA`, pushed to `https://github.com/Senthemodder/before_alpha_addon.git`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | BP Pack Manifest | Behavior pack manifest with dependencies on @minecraft/server (2.8.0) and @minecraft/server-ui (2.1.0) | M1 | ORIGINAL_REQUEST §R1, Survey 3 | DONE |
| 2 | RP Pack Manifest | Resource pack manifest matching BP UUID pairing | M1 | ORIGINAL_REQUEST §R1, Survey 3 | DONE |
| 3 | Java Alpha 9 Blocks | BP definitions for before_alpha:alpha_stone, alpha_grass_block, alpha_dirt, alpha_cobblestone, alpha_gravel, alpha_sand, alpha_bedrock, alpha_oak_log, alpha_oak_leaves | M1 | ORIGINAL_REQUEST §R1, Survey 1 | DONE |
| 4 | Bedrock Beta 9 Blocks | BP definitions for before_alpha:beta_stone, beta_grass_block, beta_dirt, beta_cobblestone, beta_gravel, beta_sand, beta_bedrock, beta_oak_log, beta_oak_leaves | M1 | ORIGINAL_REQUEST §R1, Survey 1 | DONE |
| 5 | Authentic Textures Copy | Copy 16x16 PNG textures from a1.1.2_01 and mcpe_0.1.0 into RP/textures/blocks/ | M1 | ORIGINAL_REQUEST §R1, Survey 1 | DONE |
| 6 | RP Texture Atlas (terrain_texture.json) | Map 22 texture definitions with authentic color handling (#339933 tint for beta grass top, untinted for alpha grass top) | M1 | ORIGINAL_REQUEST §R1, Survey 1 | DONE |
| 7 | RP Sound Atlas (blocks.json) | Map sound properties (stone, grass, wood, gravel, sand) to all 18 blocks (omitting sound from BP description) | M1 | ORIGINAL_REQUEST §R1, Survey 1 | DONE |
| 8 | Localization (en_US.lang) | English display names for all 18 custom blocks and THE GLITCH item | M1 | ORIGINAL_REQUEST §R1, Survey 1 | DONE |
| 9 | Startup Dimension Registration | Hook system.beforeEvents.startup to register before_alpha:java_alpha and before_alpha:bedrock_beta | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 10 | THE GLITCH Item Definition | BP item before_alpha:the_glitch (format 1.20.50, glint, display name object) | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 11 | THE GLITCH Texture Mapping | RP item_texture.json and icon for THE GLITCH | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 12 | THE GLITCH Interaction & Modal UI | world.afterEvents.itemUse listener with ActionFormData modal dialog (Overworld, Java Alpha, Bedrock Beta) | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 13 | Sneak Quick-Cycle Warp | Sneak-use quick cycle warp cycling Overworld -> Java Alpha -> Bedrock Beta -> Overworld | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 14 | Dynamic Destination Ticking Area | world.tickingAreaManager.createTickingArea with automatic 60-tick cleanup to respect 10-area limit | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 15 | Safe Landing Platform Builder | 5x5 cobblestone platform at y=64 and air clearance y=65..67 at spawn coordinates (0, 65, 0) | M2 | ORIGINAL_REQUEST §R2, Survey 3 | DONE |
| 16 | 6-Layer Architecture Setup | Feature rules, chunk scatter, column scatter, layer picker, block picker, single block features | M3 | ORIGINAL_REQUEST §R3, Survey 2 | DONE |
| 17 | Java Alpha Worldgen Pipeline | Notchian 16-octave Perlin height contours with alpha_* blocks and placement_pass: "first_pass" | M3 | ORIGINAL_REQUEST §R3, Survey 2 | DONE |
| 18 | Bedrock Beta Worldgen Pipeline | MCPE multi-octave domain-warped contours with beta_* blocks and placement_pass: "first_pass" | M3 | ORIGINAL_REQUEST §R3, Survey 2 | DONE |
| 19 | Unconditional Bedrock Floor | Decoupled bedrock_floor feature enforcing 100% bedrock at y=0 | M3 | ORIGINAL_REQUEST §R3, Survey 2 | DONE |
| 20 | Water Table Filling | Sea level filling at y < 64 via t.water_depth and cond_water | M3 | ORIGINAL_REQUEST §R3, Survey 2 | DONE |
| 21 | Automated Test Suite | Node.js test runner verifying JSON schemas, block mappings, script syntax, and feature rules (154 tests) | M4 | ORIGINAL_REQUEST §R4, Survey 3 | DONE |
| 22 | Local Dev Deployment Automation | Automated copy/sync of BP and RP to host development_behavior_packs and development_resource_packs | M4 | ORIGINAL_REQUEST §R4, Survey 3 | DONE |
| 23 | Git Repository Setup & Remote Push | Git init, .gitignore, clean commit tree, push to https://github.com/Senthemodder/before_alpha_addon.git | M5 | ORIGINAL_REQUEST §R5, Survey 3 | DONE |
| 24 | Unified Ecosystem Documentation | Comprehensive master README.md cross-referencing archive, worldgen, and BEFORE ALPHA | M5 | ORIGINAL_REQUEST §R5, Survey 3 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Blocks & Textures | 18 cloned version blocks, 16x16 PNG textures, terrain_texture.json, blocks.json, en_US.lang, manifests | None | DONE |
| 2 | Script API, Dimensions & THE GLITCH | system.beforeEvents.startup dimension registration, before_alpha:the_glitch item, UI modal, quick cycle warp, ticking area manager, safe landing platform | M1 | DONE |
| 3 | Pure Molang Worldgen Pipelines | 6-layer voxel column-stacking pipelines for Java Alpha and Bedrock Beta, bedrock floor at y=0, water table at y<64 | M1, M2 | DONE |
| 4 | Automated Testing & Local Deployment | Automated test suite (tests/run_tests.js) and deployment to local com.mojang folders | M1, M2, M3 | DONE |
| 5 | Git Publication & Master README | Git initialization, commit, remote push to Senthemodder/before_alpha_addon, master ecosystem README.md | M1, M2, M3, M4 | DONE |

## Interface Contracts
### Blocks & Textures (M1) ↔ Worldgen Pipelines (M3)
- Custom block identifiers exposed by M1:
  - Java Alpha: `before_alpha:alpha_stone`, `before_alpha:alpha_grass_block`, `before_alpha:alpha_dirt`, `before_alpha:alpha_cobblestone`, `before_alpha:alpha_gravel`, `before_alpha:alpha_sand`, `before_alpha:alpha_bedrock`, `before_alpha:alpha_oak_log`, `before_alpha:alpha_oak_leaves`.
  - Bedrock Beta: `before_alpha:beta_stone`, `before_alpha:beta_grass_block`, `before_alpha:beta_dirt`, `before_alpha:beta_cobblestone`, `before_alpha:beta_gravel`, `before_alpha:beta_sand`, `before_alpha:beta_bedrock`, `before_alpha:beta_oak_log`, `before_alpha:beta_oak_leaves`.
- M3 single-block features bind exclusively to these exact 18 identifiers plus vanilla `minecraft:water`.

### Blocks & Textures (M1) ↔ Script API (M2)
- Platform builder in M2 places `before_alpha:alpha_cobblestone` in Java Alpha and `before_alpha:beta_cobblestone` in Bedrock Beta, with fallback to `minecraft:cobblestone`.

### Script API (M2) ↔ Engine Dimensions
- Dimension identifiers registered in `system.beforeEvents.startup`: `before_alpha:java_alpha` and `before_alpha:bedrock_beta`.
- Item identifier: `before_alpha:the_glitch`.

## Code Layout
```
before_alpha_addon/
├── BeforeAlpha_BP/
│   ├── manifest.json
│   ├── pack_icon.png
│   ├── blocks/
│   │   ├── alpha_*.json (9 files)
│   │   └── beta_*.json (9 files)
│   ├── items/
│   │   └── the_glitch.json
│   ├── scripts/
│   │   ├── main.js
│   │   ├── dimensions.js
│   │   ├── glitch_item.js
│   │   └── platform.js
│   ├── features/
│   │   ├── alpha/ (27 files)
│   │   ├── beta/ (29 files)
│   │   └── common/ (1 file)
│   └── feature_rules/
│       ├── alpha/feature_rule_alpha.json
│       └── beta/feature_rule_beta.json
├── BeforeAlpha_RP/
│   ├── manifest.json
│   ├── pack_icon.png
│   ├── blocks.json
│   ├── textures/
│   │   ├── terrain_texture.json
│   │   ├── item_texture.json
│   │   ├── blocks/before_alpha/ (22 PNG textures)
│   │   └── items/the_glitch.png
│   └── texts/
│       └── en_US.lang
├── tests/
│   ├── run_tests.js
│   ├── test_framework.js
│   ├── test_manifests.js
│   ├── test_blocks.js
│   ├── test_textures.js
│   ├── test_scripts.js
│   ├── test_worldgen.js
│   ├── test_deployment.js
│   ├── test_scenarios.js
│   ├── adversarial_challenger_1.js
│   └── adversarial_challenger_2.js
├── tools/
│   └── deploy.js
├── .gitignore
├── README.md
├── PROJECT.md
├── TEST_INFRA.md
├── TEST_READY.md
└── ORIGINAL_REQUEST.md
```

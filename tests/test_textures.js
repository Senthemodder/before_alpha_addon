/**
 * BEFORE ALPHA - Test Textures & RP Registrations
 * Validates 16x16 PNG textures, dimensions, terrain_texture.json,
 * item_texture.json, blocks.json sound mapping, and en_US.lang localization.
 */

const path = require('path');
const fs = require('fs');
const { describe, test, expect, runCli, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const RP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_RP');
const BP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP');
const BLOCKS_TEX_DIR = path.join(RP_DIR, 'textures', 'blocks', 'before_alpha');
const ITEMS_TEX_DIR = path.join(RP_DIR, 'textures', 'items');
const TERRAIN_TEX_PATH = path.join(RP_DIR, 'textures', 'terrain_texture.json');
const ITEM_TEX_PATH = path.join(RP_DIR, 'textures', 'item_texture.json');
const BLOCKS_JSON_PATH = path.join(RP_DIR, 'blocks.json');
const LANG_PATH = path.join(RP_DIR, 'texts', 'en_US.lang');

const ALPHA_TEXTURE_FILES = [
  'alpha_stone.png',
  'alpha_grass_top.png',
  'alpha_grass_side.png',
  'alpha_dirt.png',
  'alpha_cobblestone.png',
  'alpha_gravel.png',
  'alpha_sand.png',
  'alpha_bedrock.png',
  'alpha_oak_log_side.png',
  'alpha_oak_log_top.png',
  'alpha_oak_leaves.png'
];

const BETA_TEXTURE_FILES = [
  'beta_stone.png',
  'beta_grass_top.png',
  'beta_grass_side.png',
  'beta_dirt.png',
  'beta_cobblestone.png',
  'beta_gravel.png',
  'beta_sand.png',
  'beta_bedrock.png',
  'beta_oak_log_side.png',
  'beta_oak_log_top.png',
  'beta_oak_leaves.png'
];

const ALL_TEXTURE_FILES = [...ALPHA_TEXTURE_FILES, ...BETA_TEXTURE_FILES];

const ALL_BLOCK_IDS = [
  'alpha_stone', 'alpha_grass_block', 'alpha_dirt', 'alpha_cobblestone',
  'alpha_gravel', 'alpha_sand', 'alpha_bedrock', 'alpha_oak_log', 'alpha_oak_leaves',
  'beta_stone', 'beta_grass_block', 'beta_dirt', 'beta_cobblestone',
  'beta_gravel', 'beta_sand', 'beta_bedrock', 'beta_oak_log', 'beta_oak_leaves'
];

function registerTests() {
  describe('Textures & Resource Pack Asset Integrity', () => {
    // --- Tier 1: PNG Texture Existence & Binary Dimensions ---
    test('All 22 cloned block textures exist in BeforeAlpha_RP/textures/blocks/before_alpha/', () => {
      expect(utils.fileExists(BLOCKS_TEX_DIR)).toBe(true);
      for (const texFile of ALL_TEXTURE_FILES) {
        const fullPath = path.join(BLOCKS_TEX_DIR, texFile);
        expect(utils.fileExists(fullPath)).toBe(true);
      }
    }, { tier: 1 });

    for (const texFile of ALL_TEXTURE_FILES) {
      test(`[${texFile}] Valid PNG header and strictly 16x16 pixels`, () => {
        const fullPath = path.join(BLOCKS_TEX_DIR, texFile);
        const info = utils.getPngInfo(fullPath);

        expect(info.valid).toBe(true);
        expect(info.size).toBeGreaterThan(0);
        expect(info.width).toBe(16);
        expect(info.height).toBe(16);
        expect(info.bitDepth).toBeDefined();
      }, { tier: 1 });
    }

    test('THE GLITCH item texture exists and is strictly 16x16 PNG', () => {
      const glitchPng = path.join(ITEMS_TEX_DIR, 'the_glitch.png');
      expect(utils.fileExists(glitchPng)).toBe(true);

      const info = utils.getPngInfo(glitchPng);
      expect(info.valid).toBe(true);
      expect(info.size).toBeGreaterThan(0);
      expect(info.width).toBe(16);
      expect(info.height).toBe(16);
    }, { tier: 1 });

    // --- Tier 1: Terrain Texture Atlas Registration ---
    test('terrain_texture.json exists, valid atlas.terrain, and all entries resolve to PNGs', () => {
      expect(utils.fileExists(TERRAIN_TEX_PATH)).toBe(true);
      const atlas = utils.readJson(TERRAIN_TEX_PATH);

      expect(atlas.texture_name).toBe('atlas.terrain');
      expect(atlas.texture_data).toBeDefined();
      expect(typeof atlas.texture_data).toBe('object');

      // Check all entries resolve to valid files
      for (const [key, val] of Object.entries(atlas.texture_data)) {
        expect(val.textures).toBeDefined();
        const relPath = typeof val.textures === 'string' ? val.textures : val.textures[0];
        // Path should not have .png extension in terrain_texture.json
        expect(relPath.endsWith('.png')).toBe(false);
        const fullPath = path.join(RP_DIR, `${relPath}.png`);
        expect(utils.fileExists(fullPath)).toBe(true);
      }
    }, { tier: 1 });

    test('terrain_texture.json applies #339933 tint to beta grass top and untinted alpha grass top', () => {
      const atlas = utils.readJson(TERRAIN_TEX_PATH);
      const betaGrassTop = atlas.texture_data['before_alpha_beta_grass_top'] || atlas.texture_data['beta_grass_top'];
      expect(betaGrassTop).toBeDefined();
      expect(typeof betaGrassTop.tint_color).toBe('string');
      expect(betaGrassTop.tint_color.toLowerCase()).toBe('#339933');

      const alphaGrassTop = atlas.texture_data['before_alpha_alpha_grass_top'] || atlas.texture_data['alpha_grass_top'];
      expect(alphaGrassTop).toBeDefined();
      expect(alphaGrassTop.tint_color).toBeUndefined();
    }, { tier: 1 });

    // --- Tier 1: Item Texture Atlas Registration ---
    test('item_texture.json exists and maps the_glitch to valid PNG', () => {
      expect(utils.fileExists(ITEM_TEX_PATH)).toBe(true);
      const itemAtlas = utils.readJson(ITEM_TEX_PATH);

      expect(itemAtlas.texture_name).toBe('atlas.items');
      expect(itemAtlas.texture_data).toBeDefined();
      const glitchEntry = itemAtlas.texture_data['the_glitch'] || itemAtlas.texture_data['before_alpha:the_glitch'];
      expect(glitchEntry).toBeDefined();

      const relPath = typeof glitchEntry.textures === 'string' ? glitchEntry.textures : glitchEntry.textures[0];
      const fullPath = path.join(RP_DIR, `${relPath}.png`);
      expect(utils.fileExists(fullPath)).toBe(true);
    }, { tier: 1 });

    // --- Tier 1: Sound Mapping in blocks.json ---
    test('blocks.json maps all 18 blocks with valid sound properties and NO textures', () => {
      expect(utils.fileExists(BLOCKS_JSON_PATH)).toBe(true);
      const blocksJson = utils.readJson(BLOCKS_JSON_PATH);

      for (const blockId of ALL_BLOCK_IDS) {
        const fullId = `before_alpha:${blockId}`;
        const entry = blocksJson[fullId];
        expect(entry).toBeDefined();
        expect(typeof entry.sound).toBe('string');
        expect(entry.sound.length).toBeGreaterThan(0);

        // CRITICAL INVARIANT: Must NOT define textures in blocks.json when using BP material_instances
        expect(entry.textures).toBeUndefined();
      }
    }, { tier: 1 });

    // --- Tier 1: Localization in texts/en_US.lang ---
    test('texts/en_US.lang defines names for all 18 blocks and THE GLITCH item', () => {
      expect(utils.fileExists(LANG_PATH)).toBe(true);
      const langContent = utils.readFile(LANG_PATH);
      const lines = langContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('##'));

      const langMap = {};
      for (const line of lines) {
        const eqIdx = line.indexOf('=');
        if (eqIdx !== -1) {
          const k = line.substring(0, eqIdx).trim();
          const v = line.substring(eqIdx + 1).trim();
          langMap[k] = v;
        }
      }

      for (const blockId of ALL_BLOCK_IDS) {
        const key = `tile.before_alpha:${blockId}.name`;
        const altKey = `tile.before_alpha:${blockId}`;
        const hasTranslation = Boolean(langMap[key] || langMap[altKey]);
        expect(hasTranslation).toBe(true);
      }

      const hasGlitch = Boolean(langMap['item.before_alpha:the_glitch.name'] || langMap['item.before_alpha:the_glitch']);
      expect(hasGlitch).toBe(true);
    }, { tier: 1 });

    // --- Tier 2: Boundary & Negative Cases ---
    test('No zero-byte texture files in texture directories', () => {
      const blockFiles = fs.readdirSync(BLOCKS_TEX_DIR);
      for (const f of blockFiles) {
        const stat = fs.statSync(path.join(BLOCKS_TEX_DIR, f));
        expect(stat.size).toBeGreaterThan(0);
      }
      const itemFiles = fs.readdirSync(ITEMS_TEX_DIR);
      for (const f of itemFiles) {
        const stat = fs.statSync(path.join(ITEMS_TEX_DIR, f));
        expect(stat.size).toBeGreaterThan(0);
      }
    }, { tier: 2 });

    test('Texture atlas paths use strictly lowercase and forward slashes', () => {
      const atlas = utils.readJson(TERRAIN_TEX_PATH);
      for (const val of Object.values(atlas.texture_data)) {
        const relPath = typeof val.textures === 'string' ? val.textures : val.textures[0];
        expect(relPath.includes('\\')).toBe(false);
        expect(relPath).toBe(relPath.toLowerCase());
      }
    }, { tier: 2 });

    // --- Tier 3: Cross-Pack Binding Validation ---
    test('Every material instance in BP blocks resolves to terrain_texture.json alias', () => {
      const atlas = utils.readJson(TERRAIN_TEX_PATH);
      const atlasKeys = Object.keys(atlas.texture_data);

      const bpBlocksDir = path.join(BP_DIR, 'blocks');
      for (const blockId of ALL_BLOCK_IDS) {
        const bpBlock = utils.readJson(path.join(bpBlocksDir, `${blockId}.json`));
        const matInstances = bpBlock['minecraft:block'].components['minecraft:material_instances'];
        for (const mat of Object.values(matInstances)) {
          if (mat.texture) {
            expect(atlasKeys.includes(mat.texture)).toBe(true);
          }
        }
      }
    }, { tier: 3 });
  });
}

if (require.main === module) {
  runCli('Textures & RP Suite', registerTests);
}

module.exports = { registerTests };

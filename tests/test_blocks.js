/**
 * BEFORE ALPHA - Test Blocks
 * Validates all 18 custom block JSON definitions.
 * Asserts format_version 1.21.60+, sound omission from description,
 * material instances, breaking times, and indestructible bedrock foundation.
 */

const path = require('path');
const fs = require('fs');
const { describe, test, expect, runCli, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const BLOCKS_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP', 'blocks');

const ALPHA_BLOCK_IDS = [
  'alpha_stone',
  'alpha_grass_block',
  'alpha_dirt',
  'alpha_cobblestone',
  'alpha_gravel',
  'alpha_sand',
  'alpha_bedrock',
  'alpha_oak_log',
  'alpha_oak_leaves'
];

const BETA_BLOCK_IDS = [
  'beta_stone',
  'beta_grass_block',
  'beta_dirt',
  'beta_cobblestone',
  'beta_gravel',
  'beta_sand',
  'beta_bedrock',
  'beta_oak_log',
  'beta_oak_leaves'
];

const ALL_BLOCK_IDS = [...ALPHA_BLOCK_IDS, ...BETA_BLOCK_IDS];
const BEDROCK_BLOCKS = ['alpha_bedrock', 'beta_bedrock'];
const BREAKABLE_BLOCKS = ALL_BLOCK_IDS.filter(id => !BEDROCK_BLOCKS.includes(id));
const LEAF_BLOCKS = ['alpha_oak_leaves', 'beta_oak_leaves'];
const LOG_BLOCKS = ['alpha_oak_log', 'beta_oak_log'];
const GRASS_BLOCKS = ['alpha_grass_block', 'beta_grass_block'];

function registerTests() {
  describe('Custom Block JSON Definitions (18 Cloned Blocks)', () => {
    // --- Tier 1: Existence, Syntax & Schema Compliance ---
    test('All 18 custom block files exist in BeforeAlpha_BP/blocks/', () => {
      expect(utils.fileExists(BLOCKS_DIR)).toBe(true);
      for (const blockId of ALL_BLOCK_IDS) {
        const filePath = path.join(BLOCKS_DIR, `${blockId}.json`);
        expect(utils.fileExists(filePath)).toBe(true);
      }
    }, { tier: 1 });

    for (const blockId of ALL_BLOCK_IDS) {
      test(`[${blockId}] JSON syntax, format_version 1.21.60+, and block header`, () => {
        const filePath = path.join(BLOCKS_DIR, `${blockId}.json`);
        const data = utils.readJson(filePath);

        expect(typeof data).toBe('object');
        expect(data['format_version']).toBeDefined();

        // format_version must be 1.21.60+
        const verStr = String(data['format_version']);
        const parts = verStr.split('.').map(p => parseInt(p, 10));
        const validVer = parts[0] > 1 || (parts[0] === 1 && parts[1] > 21) || (parts[0] === 1 && parts[1] === 21 && parts[2] >= 60);
        expect(validVer).toBe(true);

        const blockDef = data['minecraft:block'];
        expect(blockDef).toBeDefined();
        expect(blockDef.description).toBeDefined();
        expect(blockDef.description.identifier).toBe(`before_alpha:${blockId}`);

        // CRITICAL INVARIANT: NO "sound" inside description in 1.21.60+
        expect(blockDef.description.sound).toBeUndefined();

        expect(blockDef.components).toBeDefined();
      }, { tier: 1 });
    }

    // --- Tier 1: Material Instances & Texturing Structure ---
    for (const blockId of ALL_BLOCK_IDS) {
      test(`[${blockId}] Material instances definition and texture bindings`, () => {
        const filePath = path.join(BLOCKS_DIR, `${blockId}.json`);
        const data = utils.readJson(filePath);
        const components = data['minecraft:block'].components;
        const matInstances = components['minecraft:material_instances'];

        expect(matInstances).toBeDefined();
        expect(typeof matInstances).toBe('object');

        if (GRASS_BLOCKS.includes(blockId)) {
          // Grass blocks must define up, down, and sides (*)
          expect(matInstances['up']).toBeDefined();
          expect(matInstances['up'].texture).toBeDefined();
          expect(matInstances['down']).toBeDefined();
          expect(matInstances['down'].texture).toBeDefined();
          expect(matInstances['*']).toBeDefined();
          expect(matInstances['*'].texture).toBeDefined();
        } else if (LOG_BLOCKS.includes(blockId)) {
          // Log blocks must define up/down and sides (*)
          const hasTop = matInstances['up'] || matInstances['end'];
          const hasSide = matInstances['*'] || matInstances['side'];
          expect(Boolean(hasTop)).toBe(true);
          expect(Boolean(hasSide)).toBe(true);
        } else {
          // Standard isotropic blocks use wildcard *
          expect(matInstances['*']).toBeDefined();
          expect(matInstances['*'].texture).toBeDefined();
        }
      }, { tier: 1 });
    }

    // --- Tier 2: Boundary & Behavioral Invariants ---
    for (const bedrockId of BEDROCK_BLOCKS) {
      test(`[${bedrockId}] Indestructible bedrock foundation: strictly omits destructible_by_mining`, () => {
        const filePath = path.join(BLOCKS_DIR, `${bedrockId}.json`);
        const data = utils.readJson(filePath);
        const components = data['minecraft:block'].components;

        // Bedrock must NOT be breakable in survival
        const miningComp = components['minecraft:destructible_by_mining'];
        if (miningComp !== undefined) {
          // If present, seconds_to_destroy must be -1 or false
          if (typeof miningComp === 'object' && miningComp.seconds_to_destroy !== undefined) {
            expect(miningComp.seconds_to_destroy < 0).toBe(true);
          } else {
            expect(miningComp).toBe(false);
          }
        } else {
          expect(miningComp).toBeUndefined();
        }
      }, { tier: 2 });
    }

    for (const breakableId of BREAKABLE_BLOCKS) {
      test(`[${breakableId}] Breakable block: defines positive mining seconds_to_destroy`, () => {
        const filePath = path.join(BLOCKS_DIR, `${breakableId}.json`);
        const data = utils.readJson(filePath);
        const components = data['minecraft:block'].components;
        const miningComp = components['minecraft:destructible_by_mining'];

        expect(miningComp).toBeDefined();
        expect(typeof miningComp.seconds_to_destroy).toBe('number');
        expect(miningComp.seconds_to_destroy).toBeGreaterThan(0);
      }, { tier: 2 });
    }

    for (const leafId of LEAF_BLOCKS) {
      test(`[${leafId}] Foliage transparency: render_method is alpha_test and light_dampening <= 1`, () => {
        const filePath = path.join(BLOCKS_DIR, `${leafId}.json`);
        const data = utils.readJson(filePath);
        const components = data['minecraft:block'].components;
        const matInstances = components['minecraft:material_instances'];

        const defaultMat = matInstances['*'] || Object.values(matInstances)[0];
        expect(defaultMat.render_method).toBe('alpha_test');

        const lightDamp = components['minecraft:light_dampening'];
        expect(lightDamp).toBeDefined();
        expect(lightDamp <= 1).toBe(true);
      }, { tier: 2 });
    }

    test('Solid blocks do NOT mix opaque and alpha_test in material_instances', () => {
      const solidBlocks = ALL_BLOCK_IDS.filter(id => !LEAF_BLOCKS.includes(id));
      for (const blockId of solidBlocks) {
        const filePath = path.join(BLOCKS_DIR, `${blockId}.json`);
        const data = utils.readJson(filePath);
        const matInstances = data['minecraft:block'].components['minecraft:material_instances'];
        const renderMethods = Object.values(matInstances)
          .map(m => m.render_method)
          .filter(Boolean);

        // Should not have alpha_test on non-leaf solid blocks
        expect(renderMethods.includes('alpha_test')).toBe(false);
      }
    }, { tier: 2 });

    // --- Tier 3: Cross-Block Architectural Consistency ---
    test('Symmetric 9-to-9 block mapping between Java Alpha and Bedrock Beta sets', () => {
      expect(ALPHA_BLOCK_IDS.length).toBe(9);
      expect(BETA_BLOCK_IDS.length).toBe(9);
      for (const alphaId of ALPHA_BLOCK_IDS) {
        const expectedBeta = alphaId.replace('alpha_', 'beta_');
        expect(BETA_BLOCK_IDS.includes(expectedBeta)).toBe(true);
      }
    }, { tier: 3 });

    test('All block definitions use strictly before_alpha namespace prefix', () => {
      const files = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.json'));
      expect(files.length).toBe(18);
      for (const f of files) {
        const data = utils.readJson(path.join(BLOCKS_DIR, f));
        const id = data['minecraft:block'].description.identifier;
        expect(id.startsWith('before_alpha:')).toBe(true);
      }
    }, { tier: 3 });
  });
}

if (require.main === module) {
  runCli('Blocks Suite', registerTests);
}

module.exports = { registerTests, ALL_BLOCK_IDS, ALPHA_BLOCK_IDS, BETA_BLOCK_IDS };

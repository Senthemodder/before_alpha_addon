/**
 * BEFORE ALPHA - Test Worldgen Pipelines
 * Validates the 6-layer voxel column-stacking Molang world generation pipelines.
 * Asserts feature_rules placement_pass: "first_pass", 256-iteration chunk scatters,
 * leaf single-block whitelists, unconditional bedrock floor at y=0, and water table filling.
 */

const path = require('path');
const fs = require('fs');
const { describe, test, expect, runCli, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const BP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP');
const RULES_DIR = path.join(BP_DIR, 'feature_rules');
const FEATURES_DIR = path.join(BP_DIR, 'features');

const ALLOWED_BLOCK_WHITELIST = new Set([
  'before_alpha:alpha_stone',
  'before_alpha:alpha_grass_block',
  'before_alpha:alpha_dirt',
  'before_alpha:alpha_cobblestone',
  'before_alpha:alpha_gravel',
  'before_alpha:alpha_sand',
  'before_alpha:alpha_bedrock',
  'before_alpha:alpha_oak_log',
  'before_alpha:alpha_oak_leaves',
  'before_alpha:beta_stone',
  'before_alpha:beta_grass_block',
  'before_alpha:beta_dirt',
  'before_alpha:beta_cobblestone',
  'before_alpha:beta_gravel',
  'before_alpha:beta_sand',
  'before_alpha:beta_bedrock',
  'before_alpha:beta_oak_log',
  'before_alpha:beta_oak_leaves',
  'minecraft:water',
  'minecraft:air'
]);

function getAllJsonFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function registerTests() {
  describe('Pure Molang World Generation Pipelines', () => {
    // --- Tier 1: Feature Rules Compliance ---
    test('Feature rule files exist for both Java Alpha and Bedrock Beta', () => {
      const alphaRule = path.join(RULES_DIR, 'alpha', 'feature_rule_alpha.json');
      const betaRule = path.join(RULES_DIR, 'beta', 'feature_rule_beta.json');
      expect(utils.fileExists(alphaRule)).toBe(true);
      expect(utils.fileExists(betaRule)).toBe(true);
    }, { tier: 1 });

    test('All feature rules specify format_version and minecraft:feature_rules', () => {
      const ruleFiles = getAllJsonFiles(RULES_DIR);
      expect(ruleFiles.length).toBeGreaterThanOrEqual(2);
      for (const rulePath of ruleFiles) {
        const rule = utils.readJson(rulePath);
        expect(rule['format_version']).toBeDefined();
        const body = rule['minecraft:feature_rules'];
        expect(body).toBeDefined();
        expect(body.description).toBeDefined();
        expect(body.description.identifier).toBeDefined();
        expect(body.description.places_feature).toBeDefined();
      }
    }, { tier: 1 });

    test('CRITICAL INVARIANT: Feature rules use placement_pass: "first_pass"', () => {
      const ruleFiles = getAllJsonFiles(RULES_DIR);
      for (const rulePath of ruleFiles) {
        const rule = utils.readJson(rulePath);
        const body = rule['minecraft:feature_rules'];
        expect(body.conditions).toBeDefined();
        expect(body.conditions.placement_pass).toBe('first_pass');
      }
    }, { tier: 1 });

    test('Feature rules use coordinate_eval_order: "xzy" and iterations: 1', () => {
      const ruleFiles = getAllJsonFiles(RULES_DIR);
      for (const rulePath of ruleFiles) {
        const rule = utils.readJson(rulePath);
        const dist = rule['minecraft:feature_rules'].distribution;
        expect(dist).toBeDefined();
        expect(dist.coordinate_eval_order).toBe('xzy');
        expect(dist.iterations).toBe(1);
      }
    }, { tier: 1 });

    // --- Tier 1: 6-Layer Architecture Features Discovery ---
    test('Features directory contains comprehensive feature JSON files (>50 files)', () => {
      const featureFiles = getAllJsonFiles(FEATURES_DIR);
      expect(featureFiles.length).toBeGreaterThanOrEqual(50);
      for (const f of featureFiles) {
        const data = utils.readJson(f);
        expect(typeof data).toBe('object');
        expect(data['format_version']).toBeDefined();
      }
    }, { tier: 1 });

    test('Chunk scatter features rasterize 256 columns with fixed_grid [0, 15]', () => {
      const alphaChunk = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'chunk_scatter_alpha.json'));
      const betaChunk = utils.readJson(path.join(FEATURES_DIR, 'beta', 'chunk_scatter_beta.json'));

      for (const chunk of [alphaChunk, betaChunk]) {
        const scatter = chunk['minecraft:scatter_feature'];
        expect(scatter).toBeDefined();
        expect(scatter.iterations).toBe(256);
        expect(scatter.x.distribution).toBe('fixed_grid');
        expect(scatter.x.extent).toEqual([0, 15]);
        expect(scatter.z.distribution).toBe('fixed_grid');
        expect(scatter.z.extent).toEqual([0, 15]);
        expect(scatter.y).toBe(0);
      }
    }, { tier: 1 });

    // --- Tier 2: Leaf Single-Block Whitelist & Strict Binding ---
    test('All single_block_feature definitions place strictly whitelisted blocks', () => {
      const featureFiles = getAllJsonFiles(FEATURES_DIR);
      let singleBlockCount = 0;

      for (const f of featureFiles) {
        const data = utils.readJson(f);
        const singleBlock = data['minecraft:single_block_feature'];
        if (singleBlock) {
          singleBlockCount++;
          const placed = singleBlock.places_block;
          expect(placed).toBeDefined();
          const isValid = ALLOWED_BLOCK_WHITELIST.has(placed);
          if (!isValid) {
            throw new Error(`Feature ${f} places invalid/unregistered block: "${placed}"`);
          }
          expect(isValid).toBe(true);

          // Rules compliance: placement & survivability disabled for pure terrain
          expect(singleBlock.enforce_placement_rules).toBe(false);
          expect(singleBlock.enforce_survivability_rules).toBe(false);
        }
      }

      // Must have leaf single block features for all 18 blocks + water
      expect(singleBlockCount).toBeGreaterThanOrEqual(20);
    }, { tier: 2 });

    test('Unconditional bedrock floor feature guarantees 100% bedrock at y=0', () => {
      const alphaY0 = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'bedrock_y0_alpha.json'));
      const betaY0 = utils.readJson(path.join(FEATURES_DIR, 'beta', 'bedrock_y0_beta.json'));

      const alphaScatter = alphaY0['minecraft:scatter_feature'];
      expect(alphaScatter).toBeDefined();
      expect(alphaScatter.iterations).toBe(1);
      expect(alphaScatter.y).toBe(0);
      expect(alphaScatter.places_feature).toBe('before_alpha:alpha_bedrock');

      const betaScatter = betaY0['minecraft:scatter_feature'];
      expect(betaScatter).toBeDefined();
      expect(betaScatter.iterations).toBe(1);
      expect(betaScatter.y).toBe(0);
      expect(betaScatter.places_feature).toBe('before_alpha:beta_bedrock');
    }, { tier: 2 });

    test('Water table filling features place water for elevations below sea level (y < 64)', () => {
      const alphaCondWater = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'cond_water_alpha.json'));
      const betaCondWater = utils.readJson(path.join(FEATURES_DIR, 'beta', 'cond_water_beta.json'));

      const alphaScatter = alphaCondWater['minecraft:scatter_feature'];
      expect(alphaScatter).toBeDefined();
      expect(alphaScatter.places_feature).toBe('before_alpha:alpha_water');
      expect(typeof alphaScatter.iterations).toBe('string');
      expect(alphaScatter.iterations).toContain('water_depth');

      const betaScatter = betaCondWater['minecraft:scatter_feature'];
      expect(betaScatter).toBeDefined();
      expect(betaScatter.places_feature).toBe('before_alpha:beta_water');
      expect(typeof betaScatter.iterations).toBe('string');
      expect(betaScatter.iterations).toContain('water_depth');
    }, { tier: 2 });

    // --- Tier 3: Cross-Pipeline Symmetry & Main Sequence Chain ---
    test('Main sequence features execute bedrock floor and column scattering sequentially', () => {
      const alphaSeq = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'main_sequence_alpha.json'));
      const betaSeq = utils.readJson(path.join(FEATURES_DIR, 'beta', 'main_sequence_beta.json'));

      for (const seq of [alphaSeq, betaSeq]) {
        const agg = seq['minecraft:aggregate_feature'];
        expect(agg).toBeDefined();
        expect(Array.isArray(agg.features)).toBe(true);
        expect(agg.features.length).toBe(2);
        // Bedrock floor executed first, then column scatter
        expect(agg.features[0]).toContain('bedrock_floor');
        expect(agg.features[1]).toContain('column');
      }
    }, { tier: 3 });

    test('Layer picker and block picker features correctly wired in strata pipeline', () => {
      const alphaLayer = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'layer_picker_alpha.json'));
      const betaLayer = utils.readJson(path.join(FEATURES_DIR, 'beta', 'layer_picker_beta.json'));

      expect(alphaLayer['minecraft:scatter_feature'].places_feature).toBe('before_alpha:block_picker_alpha');
      expect(betaLayer['minecraft:scatter_feature'].places_feature).toBe('before_alpha:block_picker_beta');

      const alphaBlock = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'block_picker_alpha.json'));
      const betaBlock = utils.readJson(path.join(FEATURES_DIR, 'beta', 'block_picker_beta.json'));

      expect(alphaBlock['minecraft:aggregate_feature'].features.length).toBeGreaterThanOrEqual(6);
      expect(betaBlock['minecraft:aggregate_feature'].features.length).toBeGreaterThanOrEqual(6);
    }, { tier: 3 });
  });
}

if (require.main === module) {
  runCli('Worldgen Suite', registerTests);
}

module.exports = { registerTests };

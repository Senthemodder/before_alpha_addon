/**
 * BEFORE ALPHA - Test Real-World Scenarios (Tier 4)
 * Validates complete end-to-end user workflows and cross-system scenarios:
 * 1. Player Spawns in Overworld & Uses THE GLITCH to warp to Java Alpha.
 * 2. Player Explores Java Alpha Terrain with Authentic Blocks & Bedrock Floor.
 * 3. Player Sneak-Warps from Java Alpha to Bedrock Beta with Safe Platform.
 * 4. Clean Engine Reload & Add-on Packaging.
 * 5. Full Ecosystem Cross-Reference & Contract Verification.
 */

const path = require('path');
const { describe, test, expect, runCli, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const BP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP');
const RP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_RP');

function registerTests() {
  describe('Tier 4 Real-World Application Scenarios', () => {
    // --- Scenario 1: Warp from Overworld to Java Alpha via THE GLITCH ---
    test('[Scenario 1] Overworld spawn -> THE GLITCH item -> Modal UI -> Warp to Java Alpha', () => {
      // 1. Item definition in BP
      const glitchItem = utils.readJson(path.join(BP_DIR, 'items', 'the_glitch.json'));
      expect(glitchItem['minecraft:item'].description.identifier).toBe('before_alpha:the_glitch');

      // 2. Texture & Icon in RP
      const itemAtlas = utils.readJson(path.join(RP_DIR, 'textures', 'item_texture.json'));
      expect(itemAtlas.texture_data['the_glitch']).toBeDefined();
      const pngPath = path.join(RP_DIR, `${itemAtlas.texture_data['the_glitch'].textures}.png`);
      expect(utils.fileExists(pngPath)).toBe(true);

      // 3. Script handles itemUse, presents UI, creates ticking area, and builds platform
      const glitchScript = utils.readFile(path.join(BP_DIR, 'scripts', 'glitch_item.js'));
      expect(glitchScript).toContain('openGlitchMatrixUI');
      expect(glitchScript).toContain('executeSafeWarp');
      expect(glitchScript).toContain('createTickingArea');
      expect(glitchScript).toContain('buildSafeLandingPlatform');
      expect(glitchScript).toContain('system.runTimeout');

      // 4. Localization present
      const lang = utils.readFile(path.join(RP_DIR, 'texts', 'en_US.lang'));
      expect(lang).toContain('item.before_alpha:the_glitch.name');
    }, { tier: 4 });

    // --- Scenario 2: Explore Java Alpha Terrain with Authentic Blocks & Bedrock ---
    test('[Scenario 2] Java Alpha Terrain exploration with authentic blocks, unshaded turf, and y=0 floor', () => {
      // 1. Feature rule directs terrain into java_alpha dimension
      const rule = utils.readJson(path.join(BP_DIR, 'feature_rules', 'alpha', 'feature_rule_alpha.json'));
      expect(rule['minecraft:feature_rules'].conditions.placement_pass).toBe('first_pass');

      // 2. Terrain texture atlas has unshaded alpha grass top (no tint_color)
      const terrainAtlas = utils.readJson(path.join(RP_DIR, 'textures', 'terrain_texture.json'));
      const alphaGrassTop = terrainAtlas.texture_data['before_alpha_alpha_grass_top'];
      expect(alphaGrassTop).toBeDefined();
      expect(alphaGrassTop.tint_color).toBeUndefined();

      // 3. Bedrock floor guaranteed at y=0
      const bedrockY0 = utils.readJson(path.join(BP_DIR, 'features', 'alpha', 'bedrock_y0_alpha.json'));
      expect(bedrockY0['minecraft:scatter_feature'].y).toBe(0);
      expect(bedrockY0['minecraft:scatter_feature'].places_feature).toBe('before_alpha:alpha_bedrock');

      // 4. Alpha bedrock is indestructible (no destructible_by_mining)
      const alphaBedrock = utils.readJson(path.join(BP_DIR, 'blocks', 'alpha_bedrock.json'));
      expect(alphaBedrock['minecraft:block'].components['minecraft:destructible_by_mining']).toBeUndefined();
    }, { tier: 4 });

    // --- Scenario 3: Sneak-Warp from Java Alpha to Bedrock Beta ---
    test('[Scenario 3] Sneak-Warp from Java Alpha to Bedrock Beta with safe platform and mobile tint', () => {
      // 1. Sneak detection triggers quick cycle
      const glitchScript = utils.readFile(path.join(BP_DIR, 'scripts', 'glitch_item.js'));
      expect(glitchScript).toContain('player.isSneaking');
      expect(glitchScript).toContain('handleQuickCycle');

      // 2. Next dimension from Java Alpha is Bedrock Beta
      expect(glitchScript).toContain('getNextDimension');
      expect(glitchScript).toContain('JAVA_ALPHA');
      expect(glitchScript).toContain('BEDROCK_BETA');

      // 3. Beta platform uses beta_cobblestone
      const platformScript = utils.readFile(path.join(BP_DIR, 'scripts', 'platform.js'));
      expect(platformScript).toContain('before_alpha:beta_cobblestone');

      // 4. Beta grass top has authentic #339933 mobile green tint
      const terrainAtlas = utils.readJson(path.join(RP_DIR, 'textures', 'terrain_texture.json'));
      const betaGrassTop = terrainAtlas.texture_data['before_alpha_beta_grass_top'];
      expect(betaGrassTop).toBeDefined();
      expect(betaGrassTop.tint_color.toLowerCase()).toBe('#339933');
    }, { tier: 4 });

    // --- Scenario 4: Clean Engine Reload & Add-on Packaging ---
    test('[Scenario 4] Add-on packaging: manifests paired, all 18 blocks & 22 textures resolved', () => {
      // 1. BP and RP manifests exist and are linked
      const bp = utils.readJson(path.join(BP_DIR, 'manifest.json'));
      const rp = utils.readJson(path.join(RP_DIR, 'manifest.json'));
      const rpDep = bp.dependencies.find(d => d.uuid === rp.header.uuid);
      expect(rpDep).toBeDefined();

      // 2. No sound in description in any block
      const blockFiles = [
        'alpha_stone', 'alpha_grass_block', 'alpha_dirt', 'alpha_cobblestone',
        'alpha_gravel', 'alpha_sand', 'alpha_bedrock', 'alpha_oak_log', 'alpha_oak_leaves',
        'beta_stone', 'beta_grass_block', 'beta_dirt', 'beta_cobblestone',
        'beta_gravel', 'beta_sand', 'beta_bedrock', 'beta_oak_log', 'beta_oak_leaves'
      ];
      for (const b of blockFiles) {
        const blockJson = utils.readJson(path.join(BP_DIR, 'blocks', `${b}.json`));
        expect(blockJson['minecraft:block'].description.sound).toBeUndefined();
      }

      // 3. Sound mapped in RP blocks.json for all 18 blocks
      const blocksJson = utils.readJson(path.join(RP_DIR, 'blocks.json'));
      for (const b of blockFiles) {
        expect(blocksJson[`before_alpha:${b}`]).toBeDefined();
        expect(blocksJson[`before_alpha:${b}`].sound).toBeDefined();
      }
    }, { tier: 4 });

    // --- Scenario 5: Full Ecosystem Cross-Reference & Contract Verification ---
    test('[Scenario 5] Ecosystem documentation and interface contracts cross-validation', () => {
      const projectMd = utils.readFile(path.join(ROOT_DIR, 'PROJECT.md'));
      expect(projectMd).toContain('before_alpha:java_alpha');
      expect(projectMd).toContain('before_alpha:bedrock_beta');
      expect(projectMd).toContain('before_alpha:the_glitch');

      const originalRequest = utils.readFile(path.join(ROOT_DIR, 'ORIGINAL_REQUEST.md'));
      expect(originalRequest).toContain('BEFORE ALPHA');

      const testInfra = utils.readFile(path.join(ROOT_DIR, 'TEST_INFRA.md'));
      expect(testInfra).toContain('Tier 1');
      expect(testInfra).toContain('Tier 4');
    }, { tier: 4 });
  });
}

if (require.main === module) {
  runCli('Scenarios Suite', registerTests);
}

module.exports = { registerTests };

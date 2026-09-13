/**
 * BEFORE ALPHA - Test Deployment & Host Synchronization
 * Validates that BeforeAlpha_BP and BeforeAlpha_RP are accurately synchronized
 * into the local Minecraft Bedrock development folders in AppData Roaming (non-UWP),
 * maintaining strict byte-for-byte fidelity and parity across all 113 pack assets.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { describe, test, expect, runCli, utils } = require('./test_framework');
const {
  DEFAULT_BP_TARGET,
  DEFAULT_RP_TARGET,
  SOURCE_BP,
  SOURCE_RP,
  verifyPack,
  listFilesRecursive
} = require('../tools/deploy');

function registerTests() {
  describe('Local Development Deployment & Host Sync', () => {
    // --- Tier 1: Non-UWP Path Compliance & Pack Presence ---
    test('[T1] Non-UWP Roaming Path Compliance: Target paths use Roaming com.mojang directories', () => {
      expect(DEFAULT_BP_TARGET).toContain('AppData');
      expect(DEFAULT_BP_TARGET).toContain('Roaming');
      expect(DEFAULT_BP_TARGET).toContain('Minecraft Bedrock');
      expect(DEFAULT_BP_TARGET).toContain('development_behavior_packs');
      expect(DEFAULT_BP_TARGET.toLowerCase()).not.toContain('packages');
      expect(DEFAULT_BP_TARGET.toLowerCase()).not.toContain('minecraftuwp');

      expect(DEFAULT_RP_TARGET).toContain('AppData');
      expect(DEFAULT_RP_TARGET).toContain('Roaming');
      expect(DEFAULT_RP_TARGET).toContain('Minecraft Bedrock');
      expect(DEFAULT_RP_TARGET).toContain('development_resource_packs');
      expect(DEFAULT_RP_TARGET.toLowerCase()).not.toContain('packages');
      expect(DEFAULT_RP_TARGET.toLowerCase()).not.toContain('minecraftuwp');
    }, { tier: 1 });

    test('[T1] Target deployment directories exist in local host filesystem', () => {
      expect(fs.existsSync(DEFAULT_BP_TARGET)).toBe(true);
      expect(fs.existsSync(DEFAULT_RP_TARGET)).toBe(true);
    }, { tier: 1 });

    test('[T1] Deployed pack manifests exist and match valid Bedrock format', () => {
      const bpManifestPath = path.join(DEFAULT_BP_TARGET, 'manifest.json');
      const rpManifestPath = path.join(DEFAULT_RP_TARGET, 'manifest.json');

      expect(fs.existsSync(bpManifestPath)).toBe(true);
      expect(fs.existsSync(rpManifestPath)).toBe(true);

      const bpManifest = utils.readJson(bpManifestPath);
      const rpManifest = utils.readJson(rpManifestPath);

      expect(bpManifest.format_version).toBe(2);
      expect(rpManifest.format_version).toBe(2);
      expect(bpManifest.header.name).toContain('BEFORE ALPHA');
      expect(rpManifest.header.name).toContain('BEFORE ALPHA');
    }, { tier: 1 });

    test('[T1] All 18 custom block JSON definitions present in deployed BP', () => {
      const blocksDir = path.join(DEFAULT_BP_TARGET, 'blocks');
      expect(fs.existsSync(blocksDir)).toBe(true);

      const blockFiles = [
        'alpha_stone.json', 'alpha_grass_block.json', 'alpha_dirt.json',
        'alpha_cobblestone.json', 'alpha_gravel.json', 'alpha_sand.json',
        'alpha_bedrock.json', 'alpha_oak_log.json', 'alpha_oak_leaves.json',
        'beta_stone.json', 'beta_grass_block.json', 'beta_dirt.json',
        'beta_cobblestone.json', 'beta_gravel.json', 'beta_sand.json',
        'beta_bedrock.json', 'beta_oak_log.json', 'beta_oak_leaves.json'
      ];

      for (const b of blockFiles) {
        const full = path.join(blocksDir, b);
        expect(fs.existsSync(full)).toBe(true);
      }
    }, { tier: 1 });

    test('[T1] All 4 script modules present in deployed BP scripts/', () => {
      const scriptsDir = path.join(DEFAULT_BP_TARGET, 'scripts');
      expect(fs.existsSync(scriptsDir)).toBe(true);

      const scriptFiles = ['main.js', 'dimensions.js', 'glitch_item.js', 'platform.js'];
      for (const s of scriptFiles) {
        expect(fs.existsSync(path.join(scriptsDir, s))).toBe(true);
      }
    }, { tier: 1 });

    test('[T1] Core RP registry files present in deployed RP', () => {
      expect(fs.existsSync(path.join(DEFAULT_RP_TARGET, 'blocks.json'))).toBe(true);
      expect(fs.existsSync(path.join(DEFAULT_RP_TARGET, 'pack_icon.png'))).toBe(true);
      expect(fs.existsSync(path.join(DEFAULT_RP_TARGET, 'texts', 'en_US.lang'))).toBe(true);
      expect(fs.existsSync(path.join(DEFAULT_RP_TARGET, 'textures', 'terrain_texture.json'))).toBe(true);
      expect(fs.existsSync(path.join(DEFAULT_RP_TARGET, 'textures', 'item_texture.json'))).toBe(true);
      expect(fs.existsSync(path.join(DEFAULT_RP_TARGET, 'textures', 'items', 'the_glitch.png'))).toBe(true);
    }, { tier: 1 });

    // --- Tier 2: Byte-For-Byte Integrity & Parity ---
    test('[T2] Behavior Pack deployment passes full byte-for-byte verification (84 files)', () => {
      const report = verifyPack(SOURCE_BP, DEFAULT_BP_TARGET);
      expect(report.success).toBe(true);
      expect(report.missing.length).toBe(0);
      expect(report.mismatches.length).toBe(0);
      expect(report.extra.length).toBe(0);
      expect(report.verified).toBe(report.totalSourceFiles);
    }, { tier: 2 });

    test('[T2] Resource Pack deployment passes full byte-for-byte verification (29 files)', () => {
      const report = verifyPack(SOURCE_RP, DEFAULT_RP_TARGET);
      expect(report.success).toBe(true);
      expect(report.missing.length).toBe(0);
      expect(report.mismatches.length).toBe(0);
      expect(report.extra.length).toBe(0);
      expect(report.verified).toBe(report.totalSourceFiles);
    }, { tier: 2 });

    test('[T2] Every deployed block PNG texture matches source SHA-256 hash', () => {
      const srcTexDir = path.join(SOURCE_RP, 'textures', 'blocks', 'before_alpha');
      const tgtTexDir = path.join(DEFAULT_RP_TARGET, 'textures', 'blocks', 'before_alpha');

      const texFiles = fs.readdirSync(srcTexDir).filter(f => f.endsWith('.png'));
      expect(texFiles.length).toBe(22);

      for (const tex of texFiles) {
        const srcBuf = fs.readFileSync(path.join(srcTexDir, tex));
        const tgtBuf = fs.readFileSync(path.join(tgtTexDir, tex));

        expect(Buffer.compare(srcBuf, tgtBuf)).toBe(0);
        const srcHash = crypto.createHash('sha256').update(srcBuf).digest('hex');
        const tgtHash = crypto.createHash('sha256').update(tgtBuf).digest('hex');
        expect(srcHash).toBe(tgtHash);
      }
    }, { tier: 2 });

    test('[T2] Deployed BP block JSONs strictly omit sound in description object', () => {
      const blocksDir = path.join(DEFAULT_BP_TARGET, 'blocks');
      const files = fs.readdirSync(blocksDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const content = JSON.parse(fs.readFileSync(path.join(blocksDir, file), 'utf8'));
        const block = content['minecraft:block'];
        expect(block).toBeDefined();
        if (block.description) {
          expect(block.description.sound).toBeUndefined();
        }
      }
    }, { tier: 2 });

    // --- Tier 3: Sync Parity & File Count Invariants ---
    test('[T3] Global deployed file count exactly equals source repository', () => {
      const srcBPFiles = listFilesRecursive(SOURCE_BP);
      const tgtBPFiles = listFilesRecursive(DEFAULT_BP_TARGET);
      const srcRPFiles = listFilesRecursive(SOURCE_RP);
      const tgtRPFiles = listFilesRecursive(DEFAULT_RP_TARGET);

      expect(srcBPFiles.length).toBe(tgtBPFiles.length);
      expect(srcRPFiles.length).toBe(tgtRPFiles.length);
      expect(srcBPFiles.length).toBeGreaterThanOrEqual(84);
      expect(srcRPFiles.length).toBe(29);

      const totalSource = srcBPFiles.length + srcRPFiles.length;
      const totalTarget = tgtBPFiles.length + tgtRPFiles.length;
      expect(totalSource).toBe(totalTarget);
      expect(totalSource).toBeGreaterThanOrEqual(113);
    }, { tier: 3 });

    // --- Tier 4: Engine Readiness Scenario ---
    test('[Scenario 6] Local Bedrock development packs ready for engine instant reload', () => {
      // 1. Check pack headers and matching UUIDs
      const bpManifest = utils.readJson(path.join(DEFAULT_BP_TARGET, 'manifest.json'));
      const rpManifest = utils.readJson(path.join(DEFAULT_RP_TARGET, 'manifest.json'));

      // Check RP dependency in BP
      const rpDependency = bpManifest.dependencies.find(d => d.uuid === rpManifest.header.uuid);
      expect(rpDependency).toBeDefined();

      // 2. Check startup entry script exists
      const entryScript = path.join(DEFAULT_BP_TARGET, bpManifest.modules.find(m => m.type === 'script').entry);
      expect(fs.existsSync(entryScript)).toBe(true);

      // 3. Check pack icons exist and are non-empty
      const bpIconStat = fs.statSync(path.join(DEFAULT_BP_TARGET, 'pack_icon.png'));
      const rpIconStat = fs.statSync(path.join(DEFAULT_RP_TARGET, 'pack_icon.png'));
      expect(bpIconStat.size).toBeGreaterThan(0);
      expect(rpIconStat.size).toBeGreaterThan(0);
    }, { tier: 4 });
  });
}

if (require.main === module) {
  runCli('Deployment Suite', registerTests);
}

module.exports = { registerTests };

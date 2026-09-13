/**
 * BEFORE ALPHA - Test Manifests
 * Validates Behavior Pack and Resource Pack manifests.
 * Covers format_version, UUID syntax, min_engine_version, modules, and cross-pack dependencies.
 */

const path = require('path');
const { describe, test, expect, runCli, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const BP_MANIFEST_PATH = path.join(ROOT_DIR, 'BeforeAlpha_BP', 'manifest.json');
const RP_MANIFEST_PATH = path.join(ROOT_DIR, 'BeforeAlpha_RP', 'manifest.json');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function registerTests() {
  describe('Manifest Compliance & Dependencies (BP & RP)', () => {
    // --- Tier 1: Fundamental Manifest Contracts ---
    test('BP manifest.json exists on disk', () => {
      expect(utils.fileExists(BP_MANIFEST_PATH)).toBe(true);
    }, { tier: 1 });

    test('RP manifest.json exists on disk', () => {
      expect(utils.fileExists(RP_MANIFEST_PATH)).toBe(true);
    }, { tier: 1 });

    test('BP manifest.json is valid parseable JSON', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(bp).toBeDefined();
      expect(typeof bp).toBe('object');
    }, { tier: 1 });

    test('RP manifest.json is valid parseable JSON', () => {
      const rp = utils.readJson(RP_MANIFEST_PATH);
      expect(rp).toBeDefined();
      expect(typeof rp).toBe('object');
    }, { tier: 1 });

    test('BP format_version equals 2', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(bp.format_version).toBe(2);
    }, { tier: 1 });

    test('RP format_version equals 2', () => {
      const rp = utils.readJson(RP_MANIFEST_PATH);
      expect(rp.format_version).toBe(2);
    }, { tier: 1 });

    test('BP header contains valid name, description, and UUID', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(bp.header).toBeDefined();
      expect(typeof bp.header.name).toBe('string');
      expect(bp.header.name.length).toBeGreaterThan(0);
      expect(typeof bp.header.description).toBe('string');
      expect(bp.header.uuid).toMatch(UUID_REGEX);
      expect(Array.isArray(bp.header.version)).toBe(true);
      expect(bp.header.version.length).toBe(3);
    }, { tier: 1 });

    test('RP header contains valid name, description, and UUID', () => {
      const rp = utils.readJson(RP_MANIFEST_PATH);
      expect(rp.header).toBeDefined();
      expect(typeof rp.header.name).toBe('string');
      expect(rp.header.name.length).toBeGreaterThan(0);
      expect(typeof rp.header.description).toBe('string');
      expect(rp.header.uuid).toMatch(UUID_REGEX);
      expect(Array.isArray(rp.header.version)).toBe(true);
      expect(rp.header.version.length).toBe(3);
    }, { tier: 1 });

    test('BP header min_engine_version is at least [1, 21, 60]', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(Array.isArray(bp.header.min_engine_version)).toBe(true);
      expect(bp.header.min_engine_version.length).toBe(3);
      const [maj, min, patch] = bp.header.min_engine_version;
      const valid = (maj > 1) || (maj === 1 && min > 21) || (maj === 1 && min === 21 && patch >= 60);
      expect(valid).toBe(true);
    }, { tier: 1 });

    test('RP header min_engine_version is at least [1, 21, 60]', () => {
      const rp = utils.readJson(RP_MANIFEST_PATH);
      expect(Array.isArray(rp.header.min_engine_version)).toBe(true);
      expect(rp.header.min_engine_version.length).toBe(3);
      const [maj, min, patch] = rp.header.min_engine_version;
      const valid = (maj > 1) || (maj === 1 && min > 21) || (maj === 1 && min === 21 && patch >= 60);
      expect(valid).toBe(true);
    }, { tier: 1 });

    test('BP modules contains script module entry pointing to scripts/main.js', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(Array.isArray(bp.modules)).toBe(true);
      const scriptModule = bp.modules.find(m => m.type === 'script');
      expect(scriptModule).toBeDefined();
      expect(scriptModule.language).toBe('javascript');
      expect(scriptModule.entry).toBe('scripts/main.js');
      expect(scriptModule.uuid).toMatch(UUID_REGEX);
      expect(Array.isArray(scriptModule.version)).toBe(true);
    }, { tier: 1 });

    test('RP modules contains resources module', () => {
      const rp = utils.readJson(RP_MANIFEST_PATH);
      expect(Array.isArray(rp.modules)).toBe(true);
      const resModule = rp.modules.find(m => m.type === 'resources');
      expect(resModule).toBeDefined();
      expect(resModule.uuid).toMatch(UUID_REGEX);
      expect(Array.isArray(resModule.version)).toBe(true);
    }, { tier: 1 });

    test('BP dependencies includes @minecraft/server (version 2.8.0)', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(Array.isArray(bp.dependencies)).toBe(true);
      const serverDep = bp.dependencies.find(d => d.module_name === '@minecraft/server');
      expect(serverDep).toBeDefined();
      expect(typeof serverDep.version).toBe('string');
      expect(serverDep.version.startsWith('2.8.0')).toBe(true);
    }, { tier: 1 });

    test('BP dependencies includes @minecraft/server-ui (version 2.1.0)', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      expect(Array.isArray(bp.dependencies)).toBe(true);
      const uiDep = bp.dependencies.find(d => d.module_name === '@minecraft/server-ui');
      expect(uiDep).toBeDefined();
      expect(typeof uiDep.version).toBe('string');
      expect(uiDep.version.startsWith('2.1.0')).toBe(true);
    }, { tier: 1 });

    // --- Tier 2: Boundary & Negative Cases ---
    test('BP header UUID and RP header UUID are distinct (no collision)', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      const rp = utils.readJson(RP_MANIFEST_PATH);
      expect(bp.header.uuid !== rp.header.uuid).toBe(true);
    }, { tier: 2 });

    test('All UUIDs across BP and RP manifests are globally unique', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      const rp = utils.readJson(RP_MANIFEST_PATH);
      const uuids = [
        bp.header.uuid,
        ...bp.modules.map(m => m.uuid),
        rp.header.uuid,
        ...rp.modules.map(m => m.uuid)
      ];
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(uuids.length);
    }, { tier: 2 });

    test('Manifest version components are non-negative integers', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      const rp = utils.readJson(RP_MANIFEST_PATH);
      for (const v of bp.header.version) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v >= 0).toBe(true);
      }
      for (const v of rp.header.version) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v >= 0).toBe(true);
      }
    }, { tier: 2 });

    test('UUID validator rejects malformed UUID strings', () => {
      expect(UUID_REGEX.test('not-a-uuid')).toBe(false);
      expect(UUID_REGEX.test('b68a1fe2-39ff-4937-becb-1dbbd33b66e4-extra')).toBe(false);
      expect(UUID_REGEX.test('b68a1fe239ff4937becb1dbbd33b66e4')).toBe(false);
      expect(UUID_REGEX.test('')).toBe(false);
    }, { tier: 2 });

    // --- Tier 3: Cross-Pack Pairing & Integration ---
    test('BP dependencies correctly references RP header UUID and version', () => {
      const bp = utils.readJson(BP_MANIFEST_PATH);
      const rp = utils.readJson(RP_MANIFEST_PATH);
      const rpDep = bp.dependencies.find(d => d.uuid === rp.header.uuid);
      expect(rpDep).toBeDefined();
      expect(rpDep.uuid).toBe(rp.header.uuid);
      expect(rpDep.version).toEqual(rp.header.version);
    }, { tier: 3 });

    test('Pack icon exists for both BP and RP', () => {
      const bpIcon = path.join(ROOT_DIR, 'BeforeAlpha_BP', 'pack_icon.png');
      const rpIcon = path.join(ROOT_DIR, 'BeforeAlpha_RP', 'pack_icon.png');
      expect(utils.fileExists(bpIcon)).toBe(true);
      expect(utils.fileExists(rpIcon)).toBe(true);
      const bpIconInfo = utils.getPngInfo(bpIcon);
      const rpIconInfo = utils.getPngInfo(rpIcon);
      expect(bpIconInfo.valid).toBe(true);
      expect(rpIconInfo.valid).toBe(true);
    }, { tier: 3 });
  });
}

if (require.main === module) {
  runCli('Manifests Suite', registerTests);
}

module.exports = { registerTests };

/**
 * BEFORE ALPHA - Test Scripts & Dimension Engine
 * Validates JavaScript syntax (via node --check), startup dimension hooks,
 * forbidden API guardrails, THE GLITCH item listener, UI modal, ticking area cleanup,
 * and safe platform construction logic.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { describe, test, expect, runCli, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP', 'scripts');

const REQUIRED_SCRIPT_FILES = [
  'main.js',
  'dimensions.js',
  'glitch_item.js',
  'platform.js'
];

function registerTests() {
  describe('Script API Engine & Dimension Architecture', () => {
    // --- Tier 1: File Existence & JavaScript Syntax Verification ---
    test('All required script modules exist in BeforeAlpha_BP/scripts/', () => {
      expect(utils.fileExists(SCRIPTS_DIR)).toBe(true);
      for (const scriptFile of REQUIRED_SCRIPT_FILES) {
        const fullPath = path.join(SCRIPTS_DIR, scriptFile);
        expect(utils.fileExists(fullPath)).toBe(true);
      }
    }, { tier: 1 });

    for (const scriptFile of REQUIRED_SCRIPT_FILES) {
      test(`[${scriptFile}] Clean JavaScript syntax via node --check`, () => {
        const fullPath = path.join(SCRIPTS_DIR, scriptFile);
        const res = spawnSync(process.execPath, ['--check', fullPath], {
          encoding: 'utf8',
          windowsHide: true
        });

        expect(res.status).toBe(0);
        if (res.status !== 0) {
          throw new Error(`Syntax error in ${scriptFile}: ${res.stderr}`);
        }
      }, { tier: 1 });
    }

    // --- Tier 1: Startup Custom Dimension Registration ---
    test('Registers twin dimensions strictly in system.beforeEvents.startup', () => {
      const dimScriptPath = path.join(SCRIPTS_DIR, 'dimensions.js');
      const content = utils.readFile(dimScriptPath);

      // Must import system from @minecraft/server
      expect(content).toContain('@minecraft/server');
      expect(content).toContain('system.beforeEvents.startup');
      expect(content).toContain('event.dimensionRegistry.registerCustomDimension');

      // Both dimension identifiers must be registered
      expect(content).toContain('before_alpha:java_alpha');
      expect(content).toContain('before_alpha:bedrock_beta');
    }, { tier: 1 });

    // --- Tier 1: Interactive THE GLITCH Item Listener ---
    test('Registers itemUse listener for before_alpha:the_glitch', () => {
      const glitchScriptPath = path.join(SCRIPTS_DIR, 'glitch_item.js');
      const content = utils.readFile(glitchScriptPath);

      expect(content).toContain('world.afterEvents.itemUse');
      expect(content).toContain('before_alpha:the_glitch');
    }, { tier: 1 });

    // --- Tier 1: Safe Landing Platform Builder ---
    test('Constructs 5x5 platform at y=64 with headroom clearance at y=65..67', () => {
      const platformScriptPath = path.join(SCRIPTS_DIR, 'platform.js');
      const content = utils.readFile(platformScriptPath);

      expect(content).toContain('buildSafeLandingPlatform');
      // Must check floor level 64
      expect(content).toContain('64');
      // Must check headroom levels 65..67
      expect(content).toContain('65');
      expect(content).toContain('67');
      // Must reference cobblestone
      expect(content).toContain('cobblestone');
    }, { tier: 1 });

    // --- Tier 2: Forbidden Engine API & Anti-Jank Audit ---
    test('Forbidden Engine API Guardrail: No chat listeners or prefix command hacks', () => {
      const allScripts = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));
      for (const scriptFile of allScripts) {
        const content = utils.readFile(path.join(SCRIPTS_DIR, scriptFile));

        // In Bedrock 1.21.60+, chatSend/chatReceive/playerSendChatMessage are removed
        expect(content.includes('chatSend')).toBe(false);
        expect(content.includes('chatReceive')).toBe(false);
        expect(content.includes('playerSendChatMessage')).toBe(false);
        expect(content.includes('runCommandAsync')).toBe(false);

        // No chat prefix command hooks
        expect(content.includes('!warp')).toBe(false);
        expect(content.includes('.alpha')).toBe(false);
      }
    }, { tier: 2 });

    test('Zero console debug logs in production scripts', () => {
      const allScripts = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));
      for (const scriptFile of allScripts) {
        const content = utils.readFile(path.join(SCRIPTS_DIR, scriptFile));
        expect(content.includes('console.log(')).toBe(false);
        expect(content.includes('console.warn(')).toBe(false);
        expect(content.includes('console.error(')).toBe(false);
      }
    }, { tier: 2 });

    // --- Tier 2: Dynamic Ticking Area Lifecycle & 60-Tick Timeout ---
    test('Ticking area creation includes 60-tick automatic cleanup to respect quota', () => {
      const glitchScriptPath = path.join(SCRIPTS_DIR, 'glitch_item.js');
      const content = utils.readFile(glitchScriptPath);

      // Must call createTickingArea
      expect(content).toContain('createTickingArea');
      // Must call removeTickingArea
      expect(content).toContain('removeTickingArea');
      // Must schedule 60-tick cleanup via system.runTimeout
      expect(content).toContain('system.runTimeout');
      expect(content).toContain('60');
    }, { tier: 2 });

    // --- Tier 3: Modal UI & Sneak Quick Cycle Warp Integration ---
    test('ActionFormData modal UI integrates 3 dimensions (Overworld, Java Alpha, Bedrock Beta)', () => {
      const glitchScriptPath = path.join(SCRIPTS_DIR, 'glitch_item.js');
      const content = utils.readFile(glitchScriptPath);

      expect(content).toContain('ActionFormData');
      expect(content).toContain('@minecraft/server-ui');
      expect(content).toContain('minecraft:overworld');
      expect(content).toContain('before_alpha:java_alpha');
      expect(content).toContain('before_alpha:bedrock_beta');
    }, { tier: 3 });

    test('Quick cycle warp detects player.isSneaking and cycles 3 dimensions', () => {
      const glitchScriptPath = path.join(SCRIPTS_DIR, 'glitch_item.js');
      const content = utils.readFile(glitchScriptPath);

      expect(content).toContain('isSneaking');
      expect(content).toContain('getNextDimension');
    }, { tier: 3 });

    test('Main entry point executes registrations cleanly', () => {
      const mainPath = path.join(SCRIPTS_DIR, 'main.js');
      const content = utils.readFile(mainPath);

      expect(content).toContain('registerDimensions');
      expect(content).toContain('initGlitchItemHandler');
    }, { tier: 3 });
  });
}

if (require.main === module) {
  runCli('Scripts & Dimension Engine Suite', registerTests);
}

module.exports = { registerTests };

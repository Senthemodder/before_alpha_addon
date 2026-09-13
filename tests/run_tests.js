#!/usr/bin/env node

/**
 * BEFORE ALPHA - Master Test Runner
 * Orchestrates the comprehensive automated test suite across Tiers 1-4:
 * - tests/test_manifests.js (Format, UUIDs, Dependencies)
 * - tests/test_blocks.js (18 Custom Block Definitions, 1.21.60+ Schema, Bedrock Floor)
 * - tests/test_textures.js (16x16 PNGs, Texture Atlas, Sound Mapping, Localization)
 * - tests/test_scripts.js (Script Syntax, Dimensions Hook, THE GLITCH, Ticking Area, Platform)
 * - tests/test_worldgen.js (Feature Rules, 6-Layer Architecture, Leaf Whitelist, Bedrock Floor)
 * - tests/test_scenarios.js (Tier 4 Real-World Application Workflows)
 */

const { defaultRegistry, runSuites, printSummary, colors } = require('./test_framework');

const testManifests = require('./test_manifests');
const testBlocks = require('./test_blocks');
const testTextures = require('./test_textures');
const testScripts = require('./test_scripts');
const testWorldgen = require('./test_worldgen');
const testScenarios = require('./test_scenarios');
const testDeployment = require('./test_deployment');

async function main() {
  const args = process.argv.slice(2);
  let filterTier = null;
  let filterModule = null;
  let verbose = true;

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      filterTier = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--module=')) {
      filterModule = arg.split('=')[1].toLowerCase();
    } else if (arg === '--quiet') {
      verbose = false;
    }
  }

  console.log(colors.bold + colors.magenta + '\n======================================================================');
  console.log('       BEFORE ALPHA BEDROCK ADD-ON — AUTOMATED TEST SUITE');
  console.log('======================================================================\n' + colors.reset);

  defaultRegistry.clear();

  const moduleMap = {
    manifests: testManifests,
    blocks: testBlocks,
    textures: testTextures,
    scripts: testScripts,
    worldgen: testWorldgen,
    scenarios: testScenarios,
    deployment: testDeployment
  };

  if (filterModule) {
    const mod = moduleMap[filterModule];
    if (!mod) {
      console.error(`${colors.red}Unknown module: ${filterModule}. Available modules: ${Object.keys(moduleMap).join(', ')}${colors.reset}`);
      process.exit(1);
    }
    mod.registerTests();
  } else {
    testManifests.registerTests();
    testBlocks.registerTests();
    testTextures.registerTests();
    testScripts.registerTests();
    testWorldgen.registerTests();
    testScenarios.registerTests();
    testDeployment.registerTests();
  }

  const results = await runSuites(defaultRegistry.suites, {
    tier: filterTier,
    verbose
  });

  printSummary(results);

  if (results.failed > 0) {
    console.error(`${colors.bold}${colors.red}❌ Test suite finished with ${results.failed} failure(s).${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.bold}${colors.green}✔ All ${results.passed} tests passed successfully across all tiers!${colors.reset}\n`);
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled test runner error:', err);
    process.exit(1);
  });
}

module.exports = { main };

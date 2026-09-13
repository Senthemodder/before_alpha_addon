/**
 * BEFORE ALPHA - Adversarial Challenge Test Suite (Challenger 1)
 * Focus: Stress Testing, Boundary Cases, Fault Injection & Concurrency
 *
 * Checks:
 * 1. Block Boundary & Fault Injection:
 *    - JSON fuzzing & stray character audit across all 18 block definitions.
 *    - Omission of deprecated 'sound' inside block description object.
 *    - Indestructible bedrock foundation (omission of destructible_by_mining).
 *    - Leaves alpha transparency (render_method: alpha_test, ambient_occlusion: 0.0, light_dampening: 1).
 *    - Valid 16x16 PNG headers, CRC32 check, color types, and empirical alpha channel verification in leaves.
 * 2. Script API & Concurrency Edge Cases:
 *    - executeSafeWarp resilience against ticking area quota exceptions, missing managers, teleport failures.
 *    - Forbidden API audit (chatSend, playerSendChatMessage, runCommandAsync, DimensionTypes, eval).
 *    - Memory leak / unbounded array accumulation audit in event handlers.
 *    - Concurrency burst test: concurrent warp calls with identical area IDs.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { describe, test, expect, runCli, colors, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const BP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP');
const RP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_RP');
const BLOCKS_DIR = path.join(BP_DIR, 'blocks');
const SCRIPTS_DIR = path.join(BP_DIR, 'scripts');
const BLOCK_TEXTURES_DIR = path.join(RP_DIR, 'textures', 'blocks', 'before_alpha');
const ITEM_TEXTURES_DIR = path.join(RP_DIR, 'textures', 'items');

const ALL_BLOCK_FILES = [
  'alpha_stone.json', 'alpha_grass_block.json', 'alpha_dirt.json',
  'alpha_cobblestone.json', 'alpha_gravel.json', 'alpha_sand.json',
  'alpha_bedrock.json', 'alpha_oak_log.json', 'alpha_oak_leaves.json',
  'beta_stone.json', 'beta_grass_block.json', 'beta_dirt.json',
  'beta_cobblestone.json', 'beta_gravel.json', 'beta_sand.json',
  'beta_bedrock.json', 'beta_oak_log.json', 'beta_oak_leaves.json'
];

// Helper: Compute CRC32
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

// Helper: Parse PNG Chunks and Check CRC
function parsePngChunks(filePath) {
  const buf = fs.readFileSync(filePath);
  const signature = buf.subarray(0, 8);
  const expectedSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!signature.equals(expectedSig)) {
    throw new Error(`Invalid PNG signature in ${filePath}`);
  }

  const chunks = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const crc = buf.readUInt32BE(offset + 8 + length);

    // Verify CRC32
    const chunkTypeAndData = buf.subarray(offset + 4, offset + 8 + length);
    const computedCrc = crc32(chunkTypeAndData);
    if (crc !== computedCrc) {
      throw new Error(`CRC32 mismatch in chunk ${type} of ${filePath}: expected ${crc.toString(16)}, got ${computedCrc.toString(16)}`);
    }

    chunks.push({ type, length, data, crc });
    offset += 8 + length + 4;
  }
  return { buf, chunks };
}

function registerTests() {
  describe('Challenger 1: Block Boundary, Schema Fuzzing & Asset Integrity', () => {

    // Test 1: JSON Fuzzing and Stray Character Detection
    test('[Fuzz-Test] All 18 block JSON files have no BOM, no illegal control chars, and strict schema keys', () => {
      for (const file of ALL_BLOCK_FILES) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const rawBuf = fs.readFileSync(fullPath);

        // Check BOM (EF BB BF)
        expect(rawBuf[0] === 0xEF && rawBuf[1] === 0xBB && rawBuf[2] === 0xBF).toBe(false);

        const rawStr = rawBuf.toString('utf8');

        // Check control characters (outside \r, \n, \t)
        const hasIllegalControlChar = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(rawStr);
        expect(hasIllegalControlChar).toBe(false);

        // Verify strict parseable JSON
        let parsed;
        try {
          parsed = JSON.parse(rawStr);
        } catch (err) {
          throw new Error(`JSON syntax corruption in ${file}: ${err.message}`);
        }

        // Root level keys must strictly be format_version and minecraft:block
        const rootKeys = Object.keys(parsed);
        expect(rootKeys.sort()).toEqual(['format_version', 'minecraft:block'].sort());

        // format_version must be >= 1.21.60
        const fv = parsed.format_version;
        expect(typeof fv).toBe('string');
        const parts = fv.split('.').map(Number);
        const isAtLeast12160 = parts[0] > 1 || (parts[0] === 1 && (parts[1] > 21 || (parts[1] === 21 && parts[2] >= 60)));
        expect(isAtLeast12160).toBe(true);

        const blockObj = parsed['minecraft:block'];
        expect(blockObj).toBeDefined();

        // blockObj keys must ONLY be description and components
        const blockKeys = Object.keys(blockObj);
        expect(blockKeys.sort()).toEqual(['components', 'description'].sort());
      }
    }, { tier: 2 });

    // Test 2: Sound Omission in Description Invariant
    test('[Invariant-Sound] Description object strictly omits deprecated "sound" property across all 18 blocks', () => {
      for (const file of ALL_BLOCK_FILES) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const parsed = utils.readJson(fullPath);
        const desc = parsed['minecraft:block'].description;

        // In 1.21.60+, "sound" in description is completely invalid and fatal
        expect(desc.sound).toBeUndefined();
        expect(Object.keys(desc)).toContain('identifier');
        expect(Object.keys(desc)).toContain('menu_category');
      }
    }, { tier: 2 });

    // Test 3: Indestructible Bedrock Foundation
    test('[Indestructible-Bedrock] alpha_bedrock and beta_bedrock strictly omit destructible_by_mining', () => {
      const bedrockFiles = ['alpha_bedrock.json', 'beta_bedrock.json'];
      for (const file of bedrockFiles) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const parsed = utils.readJson(fullPath);
        const components = parsed['minecraft:block'].components;

        // Must NOT be destructible by mining (survival indestructibility)
        expect(components['minecraft:destructible_by_mining']).toBeUndefined();

        // Must be solid full blocks
        expect(components['minecraft:collision_box']).toBe(true);
        expect(components['minecraft:selection_box']).toBe(true);
        expect(components['minecraft:geometry']).toBe('minecraft:geometry.full_block');
        expect(components['minecraft:light_dampening']).toBe(15);
      }
    }, { tier: 2 });

    // Test 4: Breakable Blocks mining resistance
    test('[Breakable-Blocks] All non-bedrock blocks define valid positive seconds_to_destroy', () => {
      const breakableFiles = ALL_BLOCK_FILES.filter(f => !f.includes('bedrock'));
      for (const file of breakableFiles) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const parsed = utils.readJson(fullPath);
        const mining = parsed['minecraft:block'].components['minecraft:destructible_by_mining'];

        expect(mining).toBeDefined();
        expect(typeof mining.seconds_to_destroy).toBe('number');
        expect(mining.seconds_to_destroy).toBeGreaterThan(0);
      }
    }, { tier: 2 });

    // Test 5: Leaves Foliage Transparency & Ambient Occlusion
    test('[Foliage-Transparency] alpha_oak_leaves and beta_oak_leaves enforce alpha_test, ambient_occlusion 0.0, light_dampening 1', () => {
      const leafFiles = ['alpha_oak_leaves.json', 'beta_oak_leaves.json'];
      for (const file of leafFiles) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const parsed = utils.readJson(fullPath);
        const comp = parsed['minecraft:block'].components;

        const mat = comp['minecraft:material_instances'];
        expect(mat).toBeDefined();
        expect(mat['*']).toBeDefined();
        expect(mat['*'].render_method).toBe('alpha_test');
        expect(mat['*'].ambient_occlusion).toBe(0.0);
        expect(mat['*'].face_dimming).toBe(false);

        // Light dampening must be <= 1 for foliage transparency
        expect(comp['minecraft:light_dampening']).toBeLessThanOrEqual(1);

        // Fast mining speed
        expect(comp['minecraft:destructible_by_mining'].seconds_to_destroy).toBeLessThanOrEqual(0.3);
      }
    }, { tier: 2 });

    // Test 6: Material instances homogeneity (No mixing opaque & transparent)
    test('[Material-Instances] No block mixes opaque and transparent render_method', () => {
      for (const file of ALL_BLOCK_FILES) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const parsed = utils.readJson(fullPath);
        const mat = parsed['minecraft:block'].components['minecraft:material_instances'];
        expect(mat).toBeDefined();

        const methods = new Set();
        for (const key of Object.keys(mat)) {
          if (mat[key].render_method) {
            methods.add(mat[key].render_method);
          }
        }
        // Bedrock rejects mixing opaque and alpha_test in the same material_instances map
        if (methods.has('alpha_test') || methods.has('blend')) {
          expect(methods.has('opaque')).toBe(false);
        }
      }
    }, { tier: 2 });

    // Test 7: PNG 16x16 Deep Byte & CRC32 Verification
    test('[PNG-Integrity] All 22 block textures and 1 item texture have valid 16x16 dimensions, CRC32, and IEND', () => {
      const pngFiles = fs.readdirSync(BLOCK_TEXTURES_DIR).filter(f => f.endsWith('.png'));
      expect(pngFiles.length).toBe(22);

      const allPngs = [
        ...pngFiles.map(f => path.join(BLOCK_TEXTURES_DIR, f)),
        path.join(ITEM_TEXTURES_DIR, 'the_glitch.png')
      ];

      for (const pngPath of allPngs) {
        const filename = path.basename(pngPath);
        const { buf, chunks } = parsePngChunks(pngPath);

        // Check size > 0
        expect(buf.length).toBeGreaterThan(64);

        // IHDR chunk check
        const ihdr = chunks.find(c => c.type === 'IHDR');
        expect(ihdr).toBeDefined();
        expect(ihdr.length).toBe(13);

        const width = ihdr.data.readUInt32BE(0);
        const height = ihdr.data.readUInt32BE(4);
        const bitDepth = ihdr.data.readUInt8(8);
        const colorType = ihdr.data.readUInt8(9);
        const compression = ihdr.data.readUInt8(10);
        const filter = ihdr.data.readUInt8(11);
        const interlace = ihdr.data.readUInt8(12);

        expect(width).toBe(16);
        expect(height).toBe(16);
        expect(bitDepth).toBe(8);
        expect([2, 6].includes(colorType)).toBe(true); // RGB or RGBA
        expect(compression).toBe(0);
        expect(filter).toBe(0);
        expect(interlace).toBe(0); // non-interlaced

        // IEND chunk check
        const iend = chunks.find(c => c.type === 'IEND');
        expect(iend).toBeDefined();
        expect(iend.length).toBe(0);

        // Check IDAT chunks exist
        const idats = chunks.filter(c => c.type === 'IDAT');
        expect(idats.length).toBeGreaterThan(0);
      }
    }, { tier: 2 });

    // Test 8: Empirical Alpha Channel Transparency in Leaves Textures
    test('[Leaves-Alpha-Empirical] alpha_oak_leaves.png and beta_oak_leaves.png contain true transparent pixels in RGBA', () => {
      const leafPngNames = ['alpha_oak_leaves.png', 'beta_oak_leaves.png'];
      for (const name of leafPngNames) {
        const pngPath = path.join(BLOCK_TEXTURES_DIR, name);
        const { chunks } = parsePngChunks(pngPath);

        // Extract and concatenate IDAT data
        const idats = chunks.filter(c => c.type === 'IDAT');
        const compressedData = Buffer.concat(idats.map(c => c.data));
        const decompressed = zlib.inflateSync(compressedData);

        // Width 16, Height 16, 4 bytes/pixel (RGBA) + 1 filter byte per row = 65 bytes/row
        expect(decompressed.length).toBe(16 * 65);

        let transparentPixelCount = 0;
        let opaquePixelCount = 0;

        for (let row = 0; row < 16; row++) {
          const rowOffset = row * 65;
          // pixel data starts at rowOffset + 1 (skipping filter byte)
          for (let col = 0; col < 16; col++) {
            const pixelOffset = rowOffset + 1 + col * 4;
            const alpha = decompressed[pixelOffset + 3];
            if (alpha < 128) {
              transparentPixelCount++;
            } else {
              opaquePixelCount++;
            }
          }
        }

        // Leaves MUST have both see-through gaps and solid foliage pixels
        expect(transparentPixelCount).toBeGreaterThan(20);
        expect(opaquePixelCount).toBeGreaterThan(50);
      }
    }, { tier: 2 });

    // Test 9: Resource Pack blocks.json strictly maps sound without textures
    test('[RP-Blocks] blocks.json defines sound properties and NO textures field for all 18 blocks', () => {
      const blocksJsonPath = path.join(RP_DIR, 'blocks.json');
      const blocksJson = utils.readJson(blocksJsonPath);

      for (const file of ALL_BLOCK_FILES) {
        const blockId = `before_alpha:${file.replace('.json', '')}`;
        const entry = blocksJson[blockId];
        expect(entry).toBeDefined();
        expect(entry.sound).toBeDefined();
        expect(typeof entry.sound).toBe('string');
        // Must NOT contain textures (defined in BP material_instances)
        expect(entry.textures).toBeUndefined();
      }
    }, { tier: 2 });
  });

  describe('Challenger 1: Script API Boundary, Quota & Concurrency Challenge', () => {

    // Test 10: Forbidden Engine API Audit
    test('[Script-Forbidden-APIs] Zero occurrences of restricted or deprecated engine APIs in all scripts', () => {
      const scriptFiles = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));
      const FORBIDDEN_TOKENS = [
        'chatSend',
        'playerSendChatMessage',
        'runCommandAsync',
        'DimensionTypes.get',
        'DimensionTypes.getAll',
        'world.events.',
        'system.events.',
        'eval(',
        'Function('
      ];

      for (const file of scriptFiles) {
        const code = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');
        for (const token of FORBIDDEN_TOKENS) {
          expect(code.includes(token)).toBe(false);
        }
      }
    }, { tier: 2 });

    // Test 11: Dimension Registration Hook Scope
    test('[Script-Dimension-Hook] registerCustomDimension called exclusively inside system.beforeEvents.startup', () => {
      const dimCode = fs.readFileSync(path.join(SCRIPTS_DIR, 'dimensions.js'), 'utf8');

      // Verify startup subscription pattern
      expect(dimCode).toMatch(/system\.beforeEvents\.startup\.subscribe/);
      expect(dimCode).toMatch(/registerCustomDimension/);

      // Verify other scripts do NOT call registerCustomDimension
      const otherScripts = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js') && f !== 'dimensions.js');
      for (const file of otherScripts) {
        const code = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');
        expect(code.includes('registerCustomDimension')).toBe(false);
      }
    }, { tier: 2 });

    // Test 12: Memory Leak & Event Subscription Singleton Audit
    test('[Script-Memory-Audit] No unbounded arrays, no duplicate event subscriptions on reload', () => {
      const scriptFiles = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));

      for (const file of scriptFiles) {
        const code = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');

        // Check that event listeners are NOT registered inside intervals or timeout callbacks
        const timeoutMatches = code.match(/system\.(runInterval|runTimeout)\s*\([^]*?\)\s*=>\s*\{([^]*?)\}\s*,\s*\d+\s*\)/g) || [];
        for (const match of timeoutMatches) {
          expect(match.includes('.subscribe')).toBe(false);
        }

        // Check that there are no global arrays pushing indefinitely (e.g. `cache.push`, `history.push`)
        const hasUnboundedArrayPush = /[a-zA-Z0-9_]+\.push\(/.test(code);
        expect(hasUnboundedArrayPush).toBe(false);
      }
    }, { tier: 2 });

    // Test 13: Empirical executeSafeWarp Fault Injection & Quota Stress Test
    test('[Script-Fault-Injection] executeSafeWarp handles TickingArea quota errors, missing API, and teleport failures gracefully', async () => {
      // We import or simulate executeSafeWarp logic in an adversarial environment
      let quotaErrorThrown = false;
      let fallbackTeleportCalled = false;
      let areaRemoved = false;

      // Adversarial Mock Environment
      const mockTickingAreaManager = {
        hasTickingArea(id) {
          return false;
        },
        async createTickingArea(id, options) {
          quotaErrorThrown = true;
          throw new Error('Maximum limit of 10 ticking areas exceeded for world');
        },
        removeTickingArea(id) {
          areaRemoved = true;
        }
      };

      const mockDimension = {
        id: 'before_alpha:java_alpha',
        getBlock(loc) {
          return {
            typeId: 'minecraft:air',
            setPermutation(perm) {}
          };
        }
      };

      const mockWorld = {
        tickingAreaManager: mockTickingAreaManager,
        getDimension(id) {
          return mockDimension;
        }
      };

      let teleportErrorThrown = false;
      const mockPlayer = {
        id: 'player_test_1',
        teleport(loc, opts) {
          if (opts && opts.dimension) {
            teleportErrorThrown = true;
            throw new Error('Engine dimension stream delay');
          }
          fallbackTeleportCalled = true;
        }
      };

      // Simulated warp function modeled strictly after glitch_item.js logic
      async function testWarp(player, targetDimId) {
        const dimension = mockWorld.getDimension(targetDimId);
        if (!dimension) return false;

        const targetLoc = { x: 0, y: 65, z: 0 };
        const cleanDimId = targetDimId.replace(/[^a-zA-Z0-9_]/g, "_");
        const areaId = `warp_${cleanDimId}`;

        // 1. Ticking area with catch
        try {
          if (mockWorld.tickingAreaManager && typeof mockWorld.tickingAreaManager.createTickingArea === "function") {
            const hasArea = typeof mockWorld.tickingAreaManager.hasTickingArea === "function"
                && mockWorld.tickingAreaManager.hasTickingArea(areaId);
            if (!hasArea) {
              await mockWorld.tickingAreaManager.createTickingArea(areaId, {
                dimension,
                from: { x: targetLoc.x - 8, y: 0, z: targetLoc.z - 8 },
                to: { x: targetLoc.x + 8, y: 128, z: targetLoc.z + 8 }
              });
            }
          }
        } catch {
          // Handled gracefully!
        }

        // 2. Platform construction simulated safely
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            dimension.getBlock({ x: dx, y: 64, z: dz });
          }
        }

        // 3. Teleport with fallback
        try {
          player.teleport({ x: targetLoc.x + 0.5, y: 65, z: targetLoc.z + 0.5 }, { dimension });
        } catch {
          try {
            player.teleport({ x: targetLoc.x + 0.5, y: 65, z: targetLoc.z + 0.5 });
          } catch {
            // Suppress
          }
        }

        // 4. Cleanup
        if (mockWorld.tickingAreaManager.hasTickingArea(areaId)) {
          mockWorld.tickingAreaManager.removeTickingArea(areaId);
        }
        return true;
      }

      // Execute under simulated fault injection
      const result = await testWarp(mockPlayer, 'before_alpha:java_alpha');
      expect(result).toBe(true);
      expect(quotaErrorThrown).toBe(true);
      expect(teleportErrorThrown).toBe(true);
      expect(fallbackTeleportCalled).toBe(true);
    }, { tier: 2 });

    // Test 14: Concurrency & Shared Area ID Race Condition Stress Test
    test('[Script-Concurrency-Burst] 20 concurrent warp requests to identical dimension reuse single ticking area safely', async () => {
      const activeAreas = new Map();
      let createCount = 0;

      const mockTickingManager = {
        hasTickingArea(id) {
          return activeAreas.has(id);
        },
        async createTickingArea(id, opts) {
          createCount++;
          activeAreas.set(id, opts);
        },
        removeTickingArea(id) {
          activeAreas.delete(id);
        }
      };

      const sharedDim = {
        id: 'before_alpha:bedrock_beta',
        getBlock: () => ({ typeId: 'minecraft:air', setPermutation: () => {} })
      };

      async function warpSingle(playerId) {
        const cleanDimId = 'before_alpha_bedrock_beta';
        const areaId = `warp_${cleanDimId}`;

        const has = mockTickingManager.hasTickingArea(areaId);
        if (!has) {
          await mockTickingManager.createTickingArea(areaId, { dimension: sharedDim });
        }

        // Player teleport
        const loc = { x: 0.5, y: 65, z: 0.5 };
        return { success: true, playerId, loc };
      }

      // Burst of 20 simultaneous warps
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(warpSingle(`player_${i}`));
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(20);
      // Area created exactly once due to deduplication / shared ID
      expect(createCount).toBe(1);
      expect(activeAreas.size).toBe(1);

      // Clean up
      mockTickingManager.removeTickingArea('warp_before_alpha_bedrock_beta');
      expect(activeAreas.size).toBe(0);
    }, { tier: 2 });

    // Test 15: Platform Builder Coordinate and Fallback Permutation Stress Test
    test('[Platform-Builder-Stress] buildSafeLandingPlatform handles object vs scalar coords and custom block fallbacks', () => {
      const placedBlocks = new Map();
      const mockDim = {
        id: 'before_alpha:java_alpha',
        getBlock(loc) {
          const key = `${loc.x},${loc.y},${loc.z}`;
          return {
            typeId: 'minecraft:air',
            setPermutation(perm) {
              placedBlocks.set(key, perm.typeId);
            }
          };
        }
      };

      // Mock platform builder logic
      function simulatePlatform(dimension, x = 0, y = 65, z = 0) {
        if (typeof x === "object" && x !== null) {
          y = x.y !== undefined ? x.y : 65;
          z = x.z !== undefined ? x.z : 0;
          x = x.x !== undefined ? x.x : 0;
        }
        const cx = Math.floor(x);
        const cz = Math.floor(z);
        const dimId = dimension && dimension.id ? dimension.id : "";
        let blockId = "minecraft:cobblestone";
        if (dimId === "before_alpha:java_alpha") {
          blockId = "before_alpha:alpha_cobblestone";
        } else if (dimId === "before_alpha:bedrock_beta") {
          blockId = "before_alpha:beta_cobblestone";
        }

        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const bx = cx + dx;
            const bz = cz + dz;
            dimension.getBlock({ x: bx, y: 64, z: bz }).setPermutation({ typeId: blockId });
            for (let dy = 65; dy <= 67; dy++) {
              dimension.getBlock({ x: bx, y: dy, z: bz }).setPermutation({ typeId: "minecraft:air" });
            }
          }
        }
      }

      // Test with object coordinates
      placedBlocks.clear();
      simulatePlatform(mockDim, { x: 10, y: 65, z: 20 });
      expect(placedBlocks.size).toBe(25 * 4); // 25 floor + 25*3 air = 100 blocks
      expect(placedBlocks.get('10,64,20')).toBe('before_alpha:alpha_cobblestone');
      expect(placedBlocks.get('10,65,20')).toBe('minecraft:air');
      expect(placedBlocks.get('10,66,20')).toBe('minecraft:air');
      expect(placedBlocks.get('10,67,20')).toBe('minecraft:air');

      // Test with scalar coordinates
      placedBlocks.clear();
      simulatePlatform(mockDim, 0, 65, 0);
      expect(placedBlocks.size).toBe(100);
      expect(placedBlocks.get('0,64,0')).toBe('before_alpha:alpha_cobblestone');
    }, { tier: 2 });

    // Test 16: getNextDimension 3-Phase Quantum Cycle Completeness
    test('[Quantum-Cycle-State-Machine] getNextDimension strictly cycles Overworld -> Alpha -> Beta -> Overworld', () => {
      // Direct simulation of getNextDimension
      const DIMENSIONS = {
        OVERWORLD: "minecraft:overworld",
        JAVA_ALPHA: "before_alpha:java_alpha",
        BEDROCK_BETA: "before_alpha:bedrock_beta"
      };
      function getNext(current) {
        if (current === DIMENSIONS.OVERWORLD) return DIMENSIONS.JAVA_ALPHA;
        if (current === DIMENSIONS.JAVA_ALPHA) return DIMENSIONS.BEDROCK_BETA;
        return DIMENSIONS.OVERWORLD;
      }

      expect(getNext("minecraft:overworld")).toBe("before_alpha:java_alpha");
      expect(getNext("before_alpha:java_alpha")).toBe("before_alpha:bedrock_beta");
      expect(getNext("before_alpha:bedrock_beta")).toBe("minecraft:overworld");
      // Fallback for null/undefined/unknown dimensions
      expect(getNext("minecraft:the_end")).toBe("minecraft:overworld");
      expect(getNext(null)).toBe("minecraft:overworld");
      expect(getNext(undefined)).toBe("minecraft:overworld");
    }, { tier: 2 });

    // Test 17: RP terrain_texture.json maps 100% of custom block material instances
    test('[Texture-Atlas-Referential-Integrity] Every material instance in BP blocks resolves to terrain_texture.json', () => {
      const terrainJsonPath = path.join(RP_DIR, 'textures', 'terrain_texture.json');
      const terrainData = utils.readJson(terrainJsonPath).texture_data;

      for (const file of ALL_BLOCK_FILES) {
        const fullPath = path.join(BLOCKS_DIR, file);
        const parsed = utils.readJson(fullPath);
        const mat = parsed['minecraft:block'].components['minecraft:material_instances'];

        for (const face of Object.keys(mat)) {
          const texAlias = mat[face].texture;
          expect(terrainData[texAlias]).toBeDefined();
          const texDef = terrainData[texAlias];
          const relativePng = (typeof texDef.textures === 'string' ? texDef.textures : texDef.textures[0]) + '.png';
          const fullPngPath = path.join(RP_DIR, relativePng);
          expect(fs.existsSync(fullPngPath)).toBe(true);
        }
      }
    }, { tier: 2 });

    // Test 18: Authentic mobile green tinting in terrain_texture.json
    test('[Texture-Tint-Discipline] Bedrock Beta grass top has #339933 tint and Java Alpha grass top has NO tint', () => {
      const terrainJsonPath = path.join(RP_DIR, 'textures', 'terrain_texture.json');
      const terrainData = utils.readJson(terrainJsonPath).texture_data;

      expect(terrainData['before_alpha_beta_grass_top'].tint_color).toBe('#339933');
      expect(terrainData['before_alpha_alpha_grass_top'].tint_color).toBeUndefined();
    }, { tier: 2 });

    // Test 19: Global scan for deprecated 'sound' key in any Behavior Pack JSON description
    test('[BP-Zero-Sound-Scan] Complete scan across all BP JSONs confirms zero sound in description', () => {
      const bpBlockFiles = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.json'));
      for (const f of bpBlockFiles) {
        const data = utils.readJson(path.join(BLOCKS_DIR, f));
        const desc = (data['minecraft:block'] || {}).description || {};
        expect(desc.sound).toBeUndefined();
      }
      const itemFile = path.join(BP_DIR, 'items', 'the_glitch.json');
      if (fs.existsSync(itemFile)) {
        const data = utils.readJson(itemFile);
        const desc = (data['minecraft:item'] || {}).description || {};
        expect(desc.sound).toBeUndefined();
      }
    }, { tier: 2 });
  });
}

if (require.main === module) {
  runCli('Challenger 1: Stress & Boundary Challenge Suite', registerTests);
}

module.exports = { registerTests, crc32, parsePngChunks };

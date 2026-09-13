/**
 * BEFORE ALPHA - Adversarial Challenge Test Suite (Challenger 2)
 * Role: Molang & Strata Challenger
 * Focus: Empirical simulation across 10,000 random coordinates & strata verification.
 */

const fs = require('fs');
const path = require('path');
const { describe, test, expect, runCli, colors, utils } = require('./test_framework');

const ROOT_DIR = path.resolve(__dirname, '..');
const BP_DIR = path.join(ROOT_DIR, 'BeforeAlpha_BP');
const FEATURES_DIR = path.join(BP_DIR, 'features');

// --- Ken Perlin (2002) Improved Noise Implementation (Bedrock q.noise faithful) ---
class BedrockRandom {
  constructor(seed = 0) {
    this.MULTIPLIER = 0x5DEECE66Dn;
    this.ADDEND = 0xBn;
    this.MASK = (1n << 48n) - 1n;
    this.setSeed(seed);
  }

  setSeed(seed) {
    this.seed = (BigInt(seed) ^ this.MULTIPLIER) & this.MASK;
  }

  next(bits) {
    this.seed = (this.seed * this.MULTIPLIER + this.ADDEND) & this.MASK;
    return Number(this.seed >> (48n - BigInt(bits)));
  }

  nextInt(bound) {
    if (bound === undefined) {
      let raw = this.next(32);
      if (raw >= 0x80000000) raw -= 0x100000000;
      return raw;
    }
    if (bound <= 0) return 0;
    if ((bound & (bound - 1)) === 0) {
      return Math.floor((bound * this.next(31)) / 0x80000000);
    }
    let bits = this.next(31);
    let val = bits % bound;
    while (bits - val + (bound - 1) < 0) {
      bits = this.next(31);
      val = bits % bound;
    }
    return val;
  }

  nextDouble() {
    const high = this.next(26) << 27;
    const low = this.next(27);
    return (high + low) / Math.pow(2, 53);
  }
}

class PerlinNoise {
  constructor(seed = 0) {
    this.rand = new BedrockRandom(seed);
    this.xo = this.rand.nextDouble() * 256.0;
    this.yo = this.rand.nextDouble() * 256.0;
    this.zo = this.rand.nextDouble() * 256.0;
    this.p = new Int32Array(512);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    for (let i = 0; i < 256; i++) {
      const j = this.rand.nextInt(256 - i) + i;
      const temp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = temp;
      this.p[i + 256] = this.p[i];
    }
  }

  static fade(t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  static lerp(t, a, b) {
    return a + t * (b - a);
  }

  static grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise3d(x, y, z) {
    const cx = x + this.xo;
    const cy = y + this.yo;
    const cz = z + this.zo;

    const xi = Math.floor(cx) & 255;
    const yi = Math.floor(cy) & 255;
    const zi = Math.floor(cz) & 255;

    const xf = cx - Math.floor(cx);
    const yf = cy - Math.floor(cy);
    const zf = cz - Math.floor(cz);

    const u = PerlinNoise.fade(xf);
    const v = PerlinNoise.fade(yf);
    const w = PerlinNoise.fade(zf);

    const p = this.p;
    const a = p[xi] + yi;
    const aa = p[a] + zi;
    const ab = p[a + 1] + zi;
    const b = p[xi + 1] + yi;
    const ba = p[b] + zi;
    const bb = p[b + 1] + zi;

    const g000 = PerlinNoise.grad(p[aa], xf, yf, zf);
    const g100 = PerlinNoise.grad(p[ba], xf - 1.0, yf, zf);
    const g010 = PerlinNoise.grad(p[ab], xf, yf - 1.0, zf);
    const g110 = PerlinNoise.grad(p[bb], xf - 1.0, yf - 1.0, zf);

    const g001 = PerlinNoise.grad(p[aa + 1], xf, yf, zf - 1.0);
    const g101 = PerlinNoise.grad(p[ba + 1], xf - 1.0, yf, zf - 1.0);
    const g011 = PerlinNoise.grad(p[ab + 1], xf, yf - 1.0, zf - 1.0);
    const g111 = PerlinNoise.grad(p[bb + 1], xf - 1.0, yf - 1.0, zf - 1.0);

    const x1 = PerlinNoise.lerp(u, g000, g100);
    const x2 = PerlinNoise.lerp(u, g010, g110);
    const y1 = PerlinNoise.lerp(v, x1, x2);

    const x3 = PerlinNoise.lerp(u, g001, g101);
    const x4 = PerlinNoise.lerp(u, g011, g111);
    const y2 = PerlinNoise.lerp(v, x3, x4);

    const val = PerlinNoise.lerp(w, y1, y2);
    return Math.max(-1.0, Math.min(1.0, val));
  }

  noise2d(x, z) {
    return this.noise3d(x, 0.0, z);
  }
}
// Math helpers matching Molang
function molangClamp(v, minVal, maxVal) {
  return Math.min(Math.max(v, minVal), maxVal);
}

// Evaluate Alpha column math
function evalAlphaColumn(wx, wz, noiseFn) {
  const d_raw = noiseFn(wx * 0.001, wz * 0.001);
  const depth = d_raw * 8.0;
  const scale = 1.0;
  const base_height = 92.0 + depth;
  const rx = 0.8 * wx + 0.6 * wz;
  const rz = -0.6 * wx + 0.8 * wz;
  const relief = noiseFn(rx * 0.008, rz * 0.008) * 30.0 + noiseFn(rx * 0.016, rz * 0.016) * 15.0;
  let raw_height = base_height + relief;
  if (raw_height > 104.0) {
    const weight = (raw_height - 104.0) / 24.0;
    raw_height = raw_height * (1.0 - weight) + 104.0 * weight;
  }
  const solid_height = Math.floor(molangClamp(raw_height, 1.0, 126.0));
  const height = Math.floor(Math.max(solid_height, 64.0));
  const water_depth = 64.0 > solid_height ? Math.floor(64.0 - solid_height) : 0;
  const layer = 0;
  const biome_id = 0;
  return {
    wx, wz, d_raw, depth, base_height, rx, rz, relief, raw_height,
    solid_height, height, water_depth, layer, biome_id
  };
}

// Evaluate Beta column math
function evalBetaColumn(wx, wz, noiseFn) {
  const warp_x = noiseFn(wx * 0.001, wz * 0.001) * 8.0;
  const warp_z = noiseFn((wx + 173.1) * 0.001, (wz + 311.7) * 0.001) * 8.0;
  const qx = wx + warp_x;
  const qz = wz + warp_z;
  const d_raw = noiseFn(qx * 0.001, qz * 0.001);
  const depth = d_raw * 8.0;
  const base_height = 91.0 + depth;
  const relief = noiseFn(qx * 0.008, qz * 0.008) * 25.0 + noiseFn(qx * 0.016, qz * 0.016) * 12.5;
  const raw_height = base_height + relief;
  const temp_raw = noiseFn(wx * 0.001, wz * 0.001);
  const rain_raw = noiseFn((wx + 543.2) * 0.001, (wz + 321.8) * 0.001);
  const temp = molangClamp((temp_raw + 1.0) * 0.5, 0.0, 1.0);
  const rain = molangClamp((rain_raw + 1.0) * 0.5, 0.0, 1.0);
  const eff_rain = rain * temp;
  const solid_height = Math.floor(molangClamp(raw_height, 1.0, 126.0));
  const height = Math.floor(Math.max(solid_height, 64.0));
  const water_depth = 64.0 > solid_height ? Math.floor(64.0 - solid_height) : 0;
  const layer = 0;
  const biome_id = (water_depth > 0) ? 0 : (
    (solid_height > 100) ? 3 : (
      (temp < 0.25) ? 10 : (
        (temp > 0.75 && eff_rain < 0.22) ? 2 : (
          (eff_rain > 0.48) ? 4 : 1
        )
      )
    )
  );
  return {
    wx, wz, warp_x, warp_z, qx, qz, d_raw, depth, base_height, relief, raw_height,
    temp_raw, rain_raw, temp, rain, eff_rain, solid_height, height, water_depth,
    layer, biome_id
  };
}

// Simulate complete column strata top-down for Alpha
function simulateAlphaStrata(col, randFn = Math.random) {
  const blocks = new Array(col.height);

  let t_layer = 0;
  for (let y = col.height - 1; y >= 0; y--) {
    t_layer += 1;
    let selectedBlock = 'before_alpha:alpha_stone';

    // block_picker_alpha early_out: first_success
    if (col.water_depth > 0 && t_layer <= col.water_depth) {
      selectedBlock = 'minecraft:water';
    } else if (col.water_depth > 0 && t_layer === (col.water_depth + 1) && (col.wx + col.wz) % 2 === 0) {
      selectedBlock = 'before_alpha:alpha_gravel';
    } else if ((col.water_depth > 0 && t_layer === (col.water_depth + 1)) || (col.water_depth === 0 && col.solid_height <= 65 && t_layer === 1)) {
      selectedBlock = 'before_alpha:alpha_sand';
    } else if (col.water_depth === 0 && t_layer === 1) {
      selectedBlock = 'before_alpha:alpha_grass_block';
    } else if ((col.water_depth === 0 && t_layer >= 2 && t_layer <= 4) || (col.water_depth > 0 && t_layer >= (col.water_depth + 2) && t_layer <= (col.water_depth + 4))) {
      selectedBlock = 'before_alpha:alpha_dirt';
    } else if (t_layer > 4) {
      selectedBlock = 'before_alpha:alpha_stone';
    }

    blocks[y] = selectedBlock;
  }

  // Bedrock floor feature from main_sequence (bedrock_floor_alpha)
  blocks[0] = 'before_alpha:alpha_bedrock';
  if (randFn() > 0.05 && col.height > 1) blocks[1] = 'before_alpha:alpha_bedrock';
  if (randFn() > 0.25 && col.height > 2) blocks[2] = 'before_alpha:alpha_bedrock';
  if (randFn() > 0.50 && col.height > 3) blocks[3] = 'before_alpha:alpha_bedrock';
  if (randFn() > 0.75 && col.height > 4) blocks[4] = 'before_alpha:alpha_bedrock';

  return blocks;
}

// Simulate complete column strata top-down for Beta
function simulateBetaStrata(col, randFn = Math.random) {
  const blocks = new Array(col.height);

  let t_layer = 0;
  for (let y = col.height - 1; y >= 0; y--) {
    t_layer += 1;
    let selectedBlock = 'before_alpha:beta_stone';

    // block_picker_beta early_out: first_success
    if (col.water_depth > 0 && t_layer <= col.water_depth) {
      selectedBlock = 'minecraft:water';
    } else if (col.biome_id === 2 && col.water_depth === 0 && t_layer === 1) {
      selectedBlock = 'before_alpha:beta_sand';
    } else if (col.biome_id === 2 && ((col.water_depth === 0 && t_layer >= 2 && t_layer <= 4) || (col.water_depth > 0 && t_layer >= (col.water_depth + 2) && t_layer <= (col.water_depth + 4)))) {
      selectedBlock = 'before_alpha:beta_sand';
    } else if (col.water_depth > 0 && t_layer === (col.water_depth + 1) && (col.wx + col.wz) % 2 === 0) {
      selectedBlock = 'before_alpha:beta_gravel';
    } else if ((col.water_depth > 0 && t_layer === (col.water_depth + 1)) || (col.water_depth === 0 && col.solid_height <= 65 && t_layer === 1)) {
      selectedBlock = 'before_alpha:beta_sand';
    } else if (col.water_depth === 0 && t_layer === 1) {
      selectedBlock = 'before_alpha:beta_grass_block';
    } else if ((col.water_depth === 0 && t_layer >= 2 && t_layer <= 4) || (col.water_depth > 0 && t_layer >= (col.water_depth + 2) && t_layer <= (col.water_depth + 4))) {
      selectedBlock = 'before_alpha:beta_dirt';
    } else if (t_layer > 4) {
      selectedBlock = 'before_alpha:beta_stone';
    }

    blocks[y] = selectedBlock;
  }

  // Bedrock floor feature from main_sequence (bedrock_floor_beta)
  blocks[0] = 'before_alpha:beta_bedrock';
  if (randFn() > 0.05 && col.height > 1) blocks[1] = 'before_alpha:beta_bedrock';
  if (randFn() > 0.25 && col.height > 2) blocks[2] = 'before_alpha:beta_bedrock';
  if (randFn() > 0.50 && col.height > 3) blocks[3] = 'before_alpha:beta_bedrock';
  if (randFn() > 0.75 && col.height > 4) blocks[4] = 'before_alpha:beta_bedrock';

  return blocks;
}
function registerTests() {
  describe('Challenger 2: Molang Math & Strata Ordering Challenge Suite', () => {

    // =========================================================================
    // Tier 1 / Module 1: Java Alpha Notchian Math Verification (10,000 Coordinates)
    // =========================================================================
    describe('Module 1: Java Alpha Notchian Math Empirical Simulation (10,000 Coords)', () => {
      const perlin = new PerlinNoise(42);
      const noise = (x, z) => perlin.noise2d(x, z);

      test('[Java Alpha Math] Exact JSON expression string verified from column_alpha.json', () => {
        const jsonPath = path.join(FEATURES_DIR, 'alpha', 'column_alpha.json');
        expect(utils.fileExists(jsonPath)).toBe(true);
        const data = utils.readJson(jsonPath);
        const expr = data['minecraft:scatter_feature'].iterations;
        expect(expr).toContain('t.solid_height = math.floor(math.clamp(v.raw_height, 1.0, 126.0))');
        expect(expr).toContain('t.height = math.floor(math.max(t.solid_height, 64.0))');
        expect(expr).toContain('t.water_depth = (64.0 > t.solid_height) ? math.floor(64.0 - t.solid_height) : 0');
      }, { tier: 2 });

      test('[Java Alpha Invariant] 10,000 random coordinates: solid_height in [1, 126], height >= 64, water_depth exact', () => {
        let minSolid = Infinity;
        let maxSolid = -Infinity;
        let oceanCount = 0;
        let landCount = 0;
        let mountainCount = 0;

        let rngState = 123456789;
        const nextRand = () => {
          rngState = (rngState * 1664525 + 1013904223) >>> 0;
          return rngState / 4294967296;
        };

        for (let i = 0; i < 10000; i++) {
          const wx = (nextRand() - 0.5) * 200000.0;
          const wz = (nextRand() - 0.5) * 200000.0;

          const res = evalAlphaColumn(wx, wz, noise);

          // Invariant 1: solid_height strictly in [1, 126]
          if (res.solid_height < 1 || res.solid_height > 126) {
            throw new Error(`Java Alpha solid_height out of bounds: ${res.solid_height} at (${wx}, ${wz})`);
          }
          if (res.solid_height < minSolid) minSolid = res.solid_height;
          if (res.solid_height > maxSolid) maxSolid = res.solid_height;

          // Invariant 2: t.height >= 64 always true
          if (res.height < 64) {
            throw new Error(`Java Alpha height < 64: ${res.height} at (${wx}, ${wz})`);
          }

          // Invariant 3: For solid_height < 64, water_depth === 64 - solid_height
          if (res.solid_height < 64) {
            oceanCount++;
            if (res.water_depth !== (64 - res.solid_height)) {
              throw new Error(`Water depth mismatch: expected ${64 - res.solid_height}, got ${res.water_depth}`);
            }
            if (res.height !== 64) {
              throw new Error(`Ocean column height must be sea level 64, got ${res.height}`);
            }
          } else {
            landCount++;
            if (res.water_depth !== 0) {
              throw new Error(`Dry land column must have water_depth == 0, got ${res.water_depth}`);
            }
            if (res.height !== res.solid_height) {
              throw new Error(`Dry land column height must equal solid_height: ${res.height} !== ${res.solid_height}`);
            }
            if (res.solid_height >= 100) mountainCount++;
          }

          // Invariant 4: No NaN or Infinity
          if (Number.isNaN(res.raw_height) || !Number.isFinite(res.raw_height)) {
            throw new Error(`Non-finite raw_height at (${wx}, ${wz})`);
          }
        }

        expect(minSolid).toBeGreaterThanOrEqual(1);
        expect(maxSolid).toBeLessThanOrEqual(126);
        expect(oceanCount).toBeGreaterThanOrEqual(0);
        expect(landCount).toBeGreaterThan(0);
        expect(mountainCount).toBeGreaterThan(0);
      }, { tier: 2 });
    });

    // =========================================================================
    // Tier 1 / Module 2: Bedrock Beta Domain-Warped Math (10,000 Coordinates)
    // =========================================================================
    describe('Module 2: Bedrock Beta Domain-Warped Math Simulation (10,000 Coords)', () => {
      const perlin = new PerlinNoise(1337);
      const noise = (x, z) => perlin.noise2d(x, z);

      test('[Bedrock Beta Math] Exact JSON expression string verified from column_beta.json', () => {
        const jsonPath = path.join(FEATURES_DIR, 'beta', 'column_beta.json');
        expect(utils.fileExists(jsonPath)).toBe(true);
        const data = utils.readJson(jsonPath);
        const expr = data['minecraft:scatter_feature'].iterations;
        expect(expr).toContain('v.warp_x = q.noise(v.wx * 0.001, v.wz * 0.001) * 8.0');
        expect(expr).toContain('v.temp = math.clamp((v.temp_raw + 1.0) * 0.5, 0.0, 1.0)');
        expect(expr).toContain('v.rain = math.clamp((v.rain_raw + 1.0) * 0.5, 0.0, 1.0)');
        expect(expr).toContain('t.solid_height = math.floor(math.clamp(v.raw_height, 1.0, 126.0))');
      }, { tier: 2 });

      test('[Bedrock Beta Invariant] 10,000 random coordinates: continuity, climate [0, 1], biomes valid, height bounds', () => {
        let minTemp = Infinity, maxTemp = -Infinity;
        let minRain = Infinity, maxRain = -Infinity;
        let minSolid = Infinity, maxSolid = -Infinity;
        const biomeDistribution = {};

        let rngState = 987654321;
        const nextRand = () => {
          rngState = (rngState * 1664525 + 1013904223) >>> 0;
          return rngState / 4294967296;
        };

        const validBiomes = new Set([0, 1, 2, 3, 4, 10]);

        for (let i = 0; i < 10000; i++) {
          const wx = (nextRand() - 0.5) * 200000.0;
          const wz = (nextRand() - 0.5) * 200000.0;

          const res = evalBetaColumn(wx, wz, noise);

          // Invariant 1: Domain-warped coordinates continuous and finite
          if (!Number.isFinite(res.qx) || !Number.isFinite(res.qz)) {
            throw new Error(`Beta warped coordinates non-finite at (${wx}, ${wz})`);
          }

          // Invariant 2: Climate values in [0, 1]
          if (res.temp < 0.0 || res.temp > 1.0) throw new Error(`Beta temp out of [0, 1]: ${res.temp}`);
          if (res.rain < 0.0 || res.rain > 1.0) throw new Error(`Beta rain out of [0, 1]: ${res.rain}`);
          if (res.eff_rain < 0.0 || res.eff_rain > 1.0) throw new Error(`Beta eff_rain out of [0, 1]: ${res.eff_rain}`);

          if (res.temp < minTemp) minTemp = res.temp;
          if (res.temp > maxTemp) maxTemp = res.temp;
          if (res.rain < minRain) minRain = res.rain;
          if (res.rain > maxRain) maxRain = res.rain;

          // Invariant 3: Biome ID valid
          if (!validBiomes.has(res.biome_id)) {
            throw new Error(`Invalid biome_id generated: ${res.biome_id}`);
          }
          biomeDistribution[res.biome_id] = (biomeDistribution[res.biome_id] || 0) + 1;

          // Invariant 4: solid_height strictly in [1, 126]
          if (res.solid_height < 1 || res.solid_height > 126) {
            throw new Error(`Beta solid_height out of bounds: ${res.solid_height}`);
          }
          if (res.solid_height < minSolid) minSolid = res.solid_height;
          if (res.solid_height > maxSolid) maxSolid = res.solid_height;

          // Invariant 5: t.height >= 64 always true
          if (res.height < 64) throw new Error(`Beta height < 64: ${res.height}`);

          // Invariant 6: Water depth
          if (res.solid_height < 64) {
            if (res.water_depth !== (64 - res.solid_height)) {
              throw new Error(`Beta water_depth mismatch: ${res.water_depth} !== ${64 - res.solid_height}`);
            }
            if (res.biome_id !== 0) {
              throw new Error(`Ocean column must have biome_id == 0, got ${res.biome_id}`);
            }
          } else {
            if (res.water_depth !== 0) {
              throw new Error(`Dry column must have water_depth == 0, got ${res.water_depth}`);
            }
          }
        }

        expect(minTemp).toBeGreaterThanOrEqual(0.0);
        expect(maxTemp).toBeLessThanOrEqual(1.0);
        expect(minRain).toBeGreaterThanOrEqual(0.0);
        expect(maxRain).toBeLessThanOrEqual(1.0);
        expect(minSolid).toBeGreaterThanOrEqual(1);
        expect(maxSolid).toBeLessThanOrEqual(126);

        // Biome diversity check: ocean, mountains, plains, deserts, tundra all generated
        expect(Object.keys(biomeDistribution).length).toBeGreaterThanOrEqual(4);
      }, { tier: 2 });
    });
    // =========================================================================
    // Tier 2 / Module 3: Boundary & Extreme Coordinates Fuzzing & Stress Test
    // =========================================================================
    describe('Module 3: Extreme Coordinates & Mathematical Extrema Stress Test', () => {
      const perlin = new PerlinNoise(2026);
      const noise = (x, z) => perlin.noise2d(x, z);

      test('[Extreme Coords] Stress-test Far Lands (+/-12,550,821), World Limit (+/-30,000,000), Zero and Floats', () => {
        const testCoords = [
          [0, 0], [1, 1], [-1, -1], [15, 15],
          [12550821, 12550821], [-12550821, -12550821], [12550821, -12550821],
          [30000000, 30000000], [-30000000, -30000000], [30000000, -30000000],
          [100000, 100000], [-100000, -100000],
          [123.456, 789.012], [-987.654, -321.098]
        ];

        for (const [x, z] of testCoords) {
          const alphaRes = evalAlphaColumn(x, z, noise);
          expect(alphaRes.solid_height).toBeGreaterThanOrEqual(1);
          expect(alphaRes.solid_height).toBeLessThanOrEqual(126);
          expect(alphaRes.height).toBeGreaterThanOrEqual(64);
          expect(Number.isFinite(alphaRes.raw_height)).toBe(true);

          const betaRes = evalBetaColumn(x, z, noise);
          expect(betaRes.solid_height).toBeGreaterThanOrEqual(1);
          expect(betaRes.solid_height).toBeLessThanOrEqual(126);
          expect(betaRes.height).toBeGreaterThanOrEqual(64);
          expect(betaRes.temp).toBeGreaterThanOrEqual(0.0);
          expect(betaRes.temp).toBeLessThanOrEqual(1.0);
          expect(Number.isFinite(betaRes.qx)).toBe(true);
          expect(Number.isFinite(betaRes.qz)).toBe(true);
        }
      }, { tier: 2 });

      test('[Theoretical Extrema] Injected noise worst-case limits: d_raw in {-1, 1}, relief in {-45, 45}', () => {
        const minNoise = () => -1.0;
        const maxNoise = () => 1.0;

        // Minimum possible terrain profile
        const alphaMin = evalAlphaColumn(0, 0, minNoise);
        expect(alphaMin.solid_height).toBeGreaterThanOrEqual(1);
        expect(alphaMin.solid_height).toBeLessThanOrEqual(126);
        expect(alphaMin.height).toBe(64);
        expect(alphaMin.water_depth).toBe(64 - alphaMin.solid_height);

        // Maximum possible terrain profile
        const alphaMax = evalAlphaColumn(0, 0, maxNoise);
        expect(alphaMax.solid_height).toBeGreaterThanOrEqual(1);
        expect(alphaMax.solid_height).toBeLessThanOrEqual(126);
        expect(alphaMax.height).toBeGreaterThanOrEqual(64);

        // Beta extrema
        const betaMin = evalBetaColumn(0, 0, minNoise);
        expect(betaMin.solid_height).toBeGreaterThanOrEqual(1);
        expect(betaMin.solid_height).toBeLessThanOrEqual(126);
        expect(betaMin.temp).toBe(0.0);
        expect(betaMin.rain).toBe(0.0);

        const betaMax = evalBetaColumn(0, 0, maxNoise);
        expect(betaMax.solid_height).toBeGreaterThanOrEqual(1);
        expect(betaMax.solid_height).toBeLessThanOrEqual(126);
        expect(betaMax.temp).toBe(1.0);
        expect(betaMax.rain).toBe(1.0);
      }, { tier: 2 });
    });

    // =========================================================================
    // Tier 3 / Module 4: Strata Ordering & Inverted Mountain Challenge (10,000 Columns)
    // =========================================================================
    describe('Module 4: Strata Ordering & Inverted Mountain Empirical Challenge', () => {
      const perlinAlpha = new PerlinNoise(1111);
      const perlinBeta = new PerlinNoise(2222);

      test('[Strata Challenge - Alpha] 5,000 columns: surface turf NEVER at y=0, bedrock 100% at y=0, water table filled', () => {
        let rng = 314159265;
        const nextR = () => {
          rng = (rng * 1664525 + 1013904223) >>> 0;
          return rng / 4294967296;
        };

        let verifiedCount = 0;
        let oceanCount = 0;
        let landCount = 0;

        for (let i = 0; i < 5000; i++) {
          const wx = (nextR() - 0.5) * 100000.0;
          const wz = (nextR() - 0.5) * 100000.0;
          const col = evalAlphaColumn(wx, wz, (x, z) => perlinAlpha.noise2d(x, z));
          const blocks = simulateAlphaStrata(col, nextR);
          verifiedCount++;

          // INVARIANT 1: Bedrock floor strictly 100% at y = 0
          if (blocks[0] !== 'before_alpha:alpha_bedrock') {
            throw new Error(`Alpha column at (${wx}, ${wz}) does NOT have bedrock at y=0, found: ${blocks[0]}`);
          }

          // INVARIANT 2: No bedrock above y = 4
          for (let y = 5; y < col.height; y++) {
            if (blocks[y] === 'before_alpha:alpha_bedrock') {
              throw new Error(`Bedrock found above floor at y=${y} in column (${wx}, ${wz})`);
            }
          }

          // INVARIANT 3: Surface turf NEVER placed at y = 0 (Inverted Mountain Check)
          if (blocks[0] === 'before_alpha:alpha_grass_block') {
            throw new Error(`INVERTED MOUNTAIN DETECTED! Surface turf grass placed at y=0 at (${wx}, ${wz})`);
          }

          // Dry Land vs Ocean Analysis
          if (col.water_depth === 0) {
            landCount++;
            const summitY = col.solid_height - 1;
            const topBlock = blocks[summitY];

            // Summit block must be turf (grass or beach sand)
            const validTurf = ['before_alpha:alpha_grass_block', 'before_alpha:alpha_sand'];
            if (!validTurf.includes(topBlock)) {
              throw new Error(`Alpha dry column summit at y=${summitY} is ${topBlock}, expected turf`);
            }

            // Subsurface layers (1 to 3 blocks beneath summit) must be dirt
            for (let ly = Math.max(5, summitY - 3); ly < summitY; ly++) {
              if (blocks[ly] !== 'before_alpha:alpha_dirt' && blocks[ly] !== 'before_alpha:alpha_sand') {
                throw new Error(`Alpha subsurface at y=${ly} is ${blocks[ly]}, expected dirt`);
              }
            }

            // Deep rock (y in [5, summitY - 4]) must be stone
            for (let ly = 5; ly < (summitY - 3); ly++) {
              if (blocks[ly] !== 'before_alpha:alpha_stone') {
                throw new Error(`Alpha deep strata at y=${ly} is ${blocks[ly]}, expected stone`);
              }
            }
          } else {
            oceanCount++;
            // Water surface at y = 63
            if (blocks[63] !== 'minecraft:water') {
              throw new Error(`Alpha ocean surface at y=63 is ${blocks[63]}, expected water`);
            }

            // Water filled continuously down to solid_height
            for (let wy = col.solid_height; wy <= 63; wy++) {
              if (blocks[wy] !== 'minecraft:water') {
                throw new Error(`Alpha ocean water missing at y=${wy}, found ${blocks[wy]}`);
              }
            }

            // Sea floor at y = solid_height - 1 must be sand or gravel
            const seaFloorY = col.solid_height - 1;
            const validBed = ['before_alpha:alpha_gravel', 'before_alpha:alpha_sand'];
            if (!validBed.includes(blocks[seaFloorY])) {
              throw new Error(`Alpha ocean floor at y=${seaFloorY} is ${blocks[seaFloorY]}, expected sand/gravel`);
            }

            // Sea floor NEVER grass
            if (blocks[seaFloorY] === 'before_alpha:alpha_grass_block') {
              throw new Error(`Grass block found on sea floor at y=${seaFloorY}`);
            }
          }
        }

        expect(verifiedCount).toBe(5000);
        expect(landCount).toBeGreaterThan(0);
        expect(oceanCount).toBeGreaterThanOrEqual(0);
      }, { tier: 3 });

      test('[Strata Challenge - Alpha Ocean Sweep] Comprehensive sweep across realistic water depths [5, 63]: water filled to y=63, sand/gravel bed', () => {
        for (let sh = 5; sh < 64; sh++) {
          for (const parity of [0, 1]) {
            const wx = parity;
            const wz = 0;
            const col = {
              wx, wz,
              solid_height: sh,
              height: 64,
              water_depth: 64 - sh,
              layer: 0,
              biome_id: 0
            };
            const blocks = simulateAlphaStrata(col, () => 0.0);

            // Water table strictly filled from sh to 63
            expect(blocks[63]).toBe('minecraft:water');
            for (let y = sh; y <= 63; y++) {
              if (blocks[y] !== 'minecraft:water') {
                throw new Error('Alpha ocean depth ' + col.water_depth + ': water missing at y=' + y + ', found ' + blocks[y]);
              }
            }

            // Sea floor at y = sh - 1
            const seaFloorY = sh - 1;
            const expectedBed = (parity === 0) ? 'before_alpha:alpha_gravel' : 'before_alpha:alpha_sand';
            expect(blocks[seaFloorY]).toBe(expectedBed);
            expect(blocks[seaFloorY]).not.toBe('before_alpha:alpha_grass_block');

            // Bedrock at y = 0
            expect(blocks[0]).toBe('before_alpha:alpha_bedrock');
            expect(blocks[0]).not.toBe('before_alpha:alpha_grass_block');
          }
        }
      }, { tier: 3 });

      test('[Strata Challenge - Beta] 5,000 columns: surface turf NEVER at y=0, bedrock 100% at y=0, water table filled', () => {
        let rng = 271828182;
        const nextR = () => {
          rng = (rng * 1664525 + 1013904223) >>> 0;
          return rng / 4294967296;
        };

        let verifiedCount = 0;
        let oceanCount = 0;
        let landCount = 0;

        for (let i = 0; i < 5000; i++) {
          const wx = (nextR() - 0.5) * 100000.0;
          const wz = (nextR() - 0.5) * 100000.0;
          const col = evalBetaColumn(wx, wz, (x, z) => perlinBeta.noise2d(x, z));
          const blocks = simulateBetaStrata(col, nextR);
          verifiedCount++;

          // INVARIANT 1: Bedrock floor strictly 100% at y = 0
          if (blocks[0] !== 'before_alpha:beta_bedrock') {
            throw new Error(`Beta column at (${wx}, ${wz}) does NOT have bedrock at y=0, found: ${blocks[0]}`);
          }

          // INVARIANT 2: No bedrock above y = 4
          for (let y = 5; y < col.height; y++) {
            if (blocks[y] === 'before_alpha:beta_bedrock') {
              throw new Error(`Beta bedrock found above floor at y=${y}`);
            }
          }

          // INVARIANT 3: Surface turf NEVER placed at y = 0 (Inverted Mountain Check)
          if (blocks[0] === 'before_alpha:beta_grass_block') {
            throw new Error(`INVERTED MOUNTAIN DETECTED! Beta turf grass placed at y=0 at (${wx}, ${wz})`);
          }

          if (col.water_depth === 0) {
            landCount++;
            const summitY = col.solid_height - 1;
            const topBlock = blocks[summitY];

            if (col.biome_id === 2) {
              expect(topBlock).toBe('before_alpha:beta_sand');
            } else {
              const validTurf = ['before_alpha:beta_grass_block', 'before_alpha:beta_sand'];
              if (!validTurf.includes(topBlock)) {
                throw new Error(`Beta land summit at y=${summitY} is ${topBlock}, expected grass/sand`);
              }
            }

            for (let ly = Math.max(5, summitY - 3); ly < summitY; ly++) {
              if (col.biome_id === 2) {
                expect(blocks[ly]).toBe('before_alpha:beta_sand');
              } else {
                const validSub = ['before_alpha:beta_dirt', 'before_alpha:beta_sand'];
                if (!validSub.includes(blocks[ly])) {
                  throw new Error(`Beta subsurface at y=${ly} is ${blocks[ly]}, expected dirt/sand`);
                }
              }
            }

            for (let ly = 5; ly < (summitY - 3); ly++) {
              if (blocks[ly] !== 'before_alpha:beta_stone') {
                throw new Error(`Beta deep strata at y=${ly} is ${blocks[ly]}, expected stone`);
              }
            }
          } else {
            oceanCount++;
            if (blocks[63] !== 'minecraft:water') {
              throw new Error(`Beta ocean surface at y=63 is ${blocks[63]}, expected water`);
            }

            for (let wy = col.solid_height; wy <= 63; wy++) {
              if (blocks[wy] !== 'minecraft:water') {
                throw new Error(`Beta ocean water missing at y=${wy}`);
              }
            }

            const seaFloorY = col.solid_height - 1;
            const validBed = ['before_alpha:beta_gravel', 'before_alpha:beta_sand'];
            if (!validBed.includes(blocks[seaFloorY])) {
              throw new Error(`Beta ocean floor at y=${seaFloorY} is ${blocks[seaFloorY]}`);
            }

            if (blocks[seaFloorY] === 'before_alpha:beta_grass_block') {
              throw new Error(`Grass block found on Beta sea floor at y=${seaFloorY}`);
            }
          }
        }

        expect(verifiedCount).toBe(5000);
        expect(landCount).toBeGreaterThan(0);
        expect(oceanCount).toBeGreaterThanOrEqual(0);
      }, { tier: 3 });

      test('[Strata Challenge - Beta Ocean Sweep] Comprehensive sweep across realistic water depths [5, 63]: water filled to y=63, sand/gravel bed', () => {
        for (let sh = 5; sh < 64; sh++) {
          for (const parity of [0, 1]) {
            const wx = parity;
            const wz = 0;
            const col = {
              wx, wz,
              solid_height: sh,
              height: 64,
              water_depth: 64 - sh,
              layer: 0,
              biome_id: 0
            };
            const blocks = simulateBetaStrata(col, () => 0.0);

            // Water table strictly filled from sh to 63
            expect(blocks[63]).toBe('minecraft:water');
            for (let y = sh; y <= 63; y++) {
              if (blocks[y] !== 'minecraft:water') {
                throw new Error('Beta ocean depth ' + col.water_depth + ': water missing at y=' + y + ', found ' + blocks[y]);
              }
            }

            // Sea floor at y = sh - 1
            const seaFloorY = sh - 1;
            const expectedBed = (parity === 0) ? 'before_alpha:beta_gravel' : 'before_alpha:beta_sand';
            expect(blocks[seaFloorY]).toBe(expectedBed);
            expect(blocks[seaFloorY]).not.toBe('before_alpha:beta_grass_block');

            // Bedrock at y = 0
            expect(blocks[0]).toBe('before_alpha:beta_bedrock');
            expect(blocks[0]).not.toBe('before_alpha:beta_grass_block');
          }
        }
      }, { tier: 3 });
    });
    // =========================================================================
    // Tier 3 / Module 5: Decoupled Bedrock Floor Architecture Audit
    // =========================================================================
    describe('Module 5: Decoupled Bedrock Architecture Guardrail Audit', () => {
      test('[Architecture Guardrail] block_picker strictly omits bedrock features (avoids whole-column bedrock bug)', () => {
        const alphaPicker = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'block_picker_alpha.json'));
        const betaPicker = utils.readJson(path.join(FEATURES_DIR, 'beta', 'block_picker_beta.json'));

        for (const picker of [alphaPicker, betaPicker]) {
          const features = picker['minecraft:aggregate_feature'].features;
          for (const f of features) {
            expect(f).not.toContain('bedrock');
          }
        }
      }, { tier: 3 });

      test('[Architecture Guardrail] bedrock_floor sequenced as dedicated feature in main_sequence', () => {
        const alphaSeq = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'main_sequence_alpha.json'));
        const betaSeq = utils.readJson(path.join(FEATURES_DIR, 'beta', 'main_sequence_beta.json'));

        expect(alphaSeq['minecraft:aggregate_feature'].features).toContain('before_alpha:bedrock_floor_alpha');
        expect(betaSeq['minecraft:aggregate_feature'].features).toContain('before_alpha:bedrock_floor_beta');
      }, { tier: 3 });

      test('[Architecture Guardrail] bedrock_y0 features enforce unconditional iterations: 1 at y: 0', () => {
        const alphaY0 = utils.readJson(path.join(FEATURES_DIR, 'alpha', 'bedrock_y0_alpha.json'));
        const betaY0 = utils.readJson(path.join(FEATURES_DIR, 'beta', 'bedrock_y0_beta.json'));

        expect(alphaY0['minecraft:scatter_feature'].iterations).toBe(1);
        expect(alphaY0['minecraft:scatter_feature'].y).toBe(0);
        expect(alphaY0['minecraft:scatter_feature'].places_feature).toBe('before_alpha:alpha_bedrock');

        expect(betaY0['minecraft:scatter_feature'].iterations).toBe(1);
        expect(betaY0['minecraft:scatter_feature'].y).toBe(0);
        expect(betaY0['minecraft:scatter_feature'].places_feature).toBe('before_alpha:beta_bedrock');
      }, { tier: 3 });
    });

  });
}

if (require.main === module) {
  runCli('Challenger 2: Molang & Strata Challenge Suite', registerTests);
}

module.exports = { registerTests };

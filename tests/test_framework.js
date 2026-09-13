/**
 * BEFORE ALPHA - Test Framework
 * Pure Node.js test runner, assertion engine, and Tier 1-4 compliance reporter.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI Color Palette
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Deep equality helper
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

// Format values for assertion error messages
function formatValue(val) {
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
  if (val instanceof RegExp) return val.toString();
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// Assertion Error class
class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

// Expectation wrapper
function expect(actual) {
  return createExpectation(actual, false);
}

function createExpectation(actual, isNot) {
  const check = (condition, message) => {
    const passed = isNot ? !condition : condition;
    if (!passed) {
      throw new AssertionError(message);
    }
  };

  const handler = {
    toBe(expected) {
      check(
        actual === expected,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be' : 'to be'} ${formatValue(expected)}`
      );
    },
    toEqual(expected) {
      check(
        deepEqual(actual, expected),
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to deeply equal' : 'to deeply equal'} ${formatValue(expected)}`
      );
    },
    toBeDefined() {
      check(
        actual !== undefined,
        `Expected value ${isNot ? 'NOT to be defined' : 'to be defined'}, but got undefined`
      );
    },
    toBeUndefined() {
      check(
        actual === undefined,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be undefined' : 'to be undefined'}`
      );
    },
    toBeNull() {
      check(
        actual === null,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be null' : 'to be null'}`
      );
    },
    toBeTruthy() {
      check(
        Boolean(actual),
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be truthy' : 'to be truthy'}`
      );
    },
    toBeFalsy() {
      check(
        !actual,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be falsy' : 'to be falsy'}`
      );
    },
    toBeGreaterThan(expected) {
      check(
        actual > expected,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be greater than' : 'to be greater than'} ${formatValue(expected)}`
      );
    },
    toBeGreaterThanOrEqual(expected) {
      check(
        actual >= expected,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be greater than or equal to' : 'to be greater than or equal to'} ${formatValue(expected)}`
      );
    },
    toBeLessThan(expected) {
      check(
        actual < expected,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be less than' : 'to be less than'} ${formatValue(expected)}`
      );
    },
    toBeLessThanOrEqual(expected) {
      check(
        actual <= expected,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to be less than or equal to' : 'to be less than or equal to'} ${formatValue(expected)}`
      );
    },
    toContain(item) {
      let contains = false;
      if (typeof actual === 'string' || Array.isArray(actual)) {
        contains = actual.includes(item);
      } else if (actual instanceof Set || actual instanceof Map) {
        contains = actual.has(item);
      } else if (typeof actual === 'object' && actual !== null) {
        contains = Object.prototype.hasOwnProperty.call(actual, item);
      }
      check(
        contains,
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${formatValue(item)}`
      );
    },
    toMatch(regex) {
      const r = typeof regex === 'string' ? new RegExp(regex) : regex;
      check(
        r.test(String(actual)),
        `Expected ${formatValue(actual)} ${isNot ? 'NOT to match' : 'to match'} ${regex}`
      );
    },
    toThrow(expectedPattern) {
      let threw = false;
      let error = null;
      try {
        if (typeof actual !== 'function') {
          throw new Error('actual must be a function to use toThrow');
        }
        actual();
      } catch (err) {
        threw = true;
        error = err;
      }

      if (!isNot) {
        if (!threw) {
          throw new AssertionError('Expected function to throw, but it did not throw');
        }
        if (expectedPattern) {
          const msg = error.message || String(error);
          if (expectedPattern instanceof RegExp) {
            if (!expectedPattern.test(msg)) {
              throw new AssertionError(`Expected thrown message "${msg}" to match ${expectedPattern}`);
            }
          } else if (typeof expectedPattern === 'string') {
            if (!msg.includes(expectedPattern)) {
              throw new AssertionError(`Expected thrown message "${msg}" to contain "${expectedPattern}"`);
            }
          }
        }
      } else {
        if (threw) {
          throw new AssertionError(`Expected function NOT to throw, but it threw: ${error.message}`);
        }
      }
    }
  };

  if (!isNot) {
    handler.not = createExpectation(actual, true);
  }

  return handler;
}

// Test Runner State
class TestRegistry {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
  }

  describe(name, fn) {
    const parent = this.currentSuite;
    const suite = {
      name,
      tests: [],
      children: [],
      parent
    };
    if (parent) {
      parent.children.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = parent;
    }
  }

  test(name, fn, options = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.test(name, fn, options);
      });
      return;
    }
    const tier = options.tier || 1;
    this.currentSuite.tests.push({
      name,
      fn,
      tier,
      timeout: options.timeout || 10000
    });
  }

  clear() {
    this.suites = [];
    this.currentSuite = null;
  }
}

const defaultRegistry = new TestRegistry();

function describe(name, fn) {
  defaultRegistry.describe(name, fn);
}

function test(name, fn, options) {
  defaultRegistry.test(name, fn, options);
}

const it = test;

// Runner execution
async function runSuites(suites = defaultRegistry.suites, options = {}) {
  const filterTier = options.tier ? parseInt(options.tier, 10) : null;
  const verbose = options.verbose !== false;

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tierStats: {
      1: { total: 0, passed: 0, failed: 0 },
      2: { total: 0, passed: 0, failed: 0 },
      3: { total: 0, passed: 0, failed: 0 },
      4: { total: 0, passed: 0, failed: 0 }
    },
    failures: []
  };

  const startTime = Date.now();

  async function executeSuite(suite, depth = 0) {
    const indent = '  '.repeat(depth);
    if (verbose) {
      console.log(`${indent}${colors.bold}${colors.cyan}● ${suite.name}${colors.reset}`);
    }

    for (const t of suite.tests) {
      if (filterTier && t.tier !== filterTier) {
        results.skipped++;
        continue;
      }

      results.total++;
      const tierObj = results.tierStats[t.tier] || (results.tierStats[t.tier] = { total: 0, passed: 0, failed: 0 });
      tierObj.total++;

      const testStart = Date.now();
      let testPassed = false;
      let error = null;

      try {
        const promise = t.fn();
        if (promise && typeof promise.then === 'function') {
          await Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Test timed out after ${t.timeout}ms`)), t.timeout))
          ]);
        }
        testPassed = true;
        results.passed++;
        tierObj.passed++;
      } catch (err) {
        testPassed = false;
        error = err;
        results.failed++;
        tierObj.failed++;
        results.failures.push({
          suite: suite.name,
          test: t.name,
          tier: t.tier,
          error
        });
      }

      const elapsed = Date.now() - testStart;
      if (verbose) {
        const mark = testPassed
          ? `${colors.green}✔ PASS${colors.reset}`
          : `${colors.red}✖ FAIL${colors.reset}`;
        const tierTag = `${colors.dim}[T${t.tier}]${colors.reset}`;
        const timing = `${colors.dim}(${elapsed}ms)${colors.reset}`;
        console.log(`  ${indent}${mark} ${tierTag} ${t.name} ${timing}`);
        if (!testPassed && error) {
          const errLines = (error.stack || error.message).split('\n');
          console.log(`    ${indent}${colors.red}${errLines[0]}${colors.reset}`);
          for (let i = 1; i < Math.min(errLines.length, 4); i++) {
            console.log(`    ${indent}${colors.dim}${errLines[i]}${colors.reset}`);
          }
        }
      }
    }

    for (const child of suite.children) {
      await executeSuite(child, depth + 1);
    }
  }

  for (const suite of suites) {
    await executeSuite(suite);
  }

  results.durationMs = Date.now() - startTime;
  return results;
}

// Standalone runner runner with summary printer
async function runCli(suiteName, fn) {
  defaultRegistry.clear();
  describe(suiteName, fn);
  const results = await runSuites();
  printSummary(results);
  process.exit(results.failed > 0 ? 1 : 0);
}

function printSummary(results) {
  console.log('\n' + colors.bold + '='.repeat(70) + colors.reset);
  console.log(`${colors.bold}TEST SUITE SUMMARY REPORT${colors.reset}`);
  console.log('='.repeat(70));

  console.log(`\n  Total Tests : ${results.total}`);
  console.log(`  ${colors.green}Passed      : ${results.passed}${colors.reset}`);
  console.log(`  ${results.failed > 0 ? colors.red : colors.dim}Failed      : ${results.failed}${colors.reset}`);
  if (results.skipped > 0) {
    console.log(`  ${colors.yellow}Skipped     : ${results.skipped}${colors.reset}`);
  }
  console.log(`  Duration    : ${(results.durationMs / 1000).toFixed(2)}s\n`);

  console.log(`${colors.bold}Tier Breakdown:${colors.reset}`);
  for (let t = 1; t <= 4; t++) {
    const s = results.tierStats[t];
    if (!s || s.total === 0) continue;
    const tierName =
      t === 1 ? 'Tier 1: Fundamental / Syntax / Contract' :
      t === 2 ? 'Tier 2: Boundary / Negative / Robustness' :
      t === 3 ? 'Tier 3: Pairwise / Module Integration' :
      'Tier 4: End-to-End Real-World Scenarios';
    const status = s.failed === 0 ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL (${s.failed}/${s.total})${colors.reset}`;
    console.log(`  [Tier ${t}] ${tierName.padEnd(42)}: ${s.passed}/${s.total} [${status}]`);
  }

  if (results.failures.length > 0) {
    console.log('\n' + colors.bold + colors.red + 'FAILURES DETAIL:' + colors.reset);
    results.failures.forEach((f, idx) => {
      console.log(`\n  ${idx + 1}) [Tier ${f.tier}] ${f.suite} > ${f.test}`);
      console.log(`     ${colors.red}${f.error.message || f.error}${colors.reset}`);
      if (f.error.stack) {
        const stack = f.error.stack.split('\n').slice(1, 4).join('\n');
        console.log(`     ${colors.dim}${stack}${colors.reset}`);
      }
    });
  }
  console.log('\n' + '='.repeat(70) + '\n');
}

// Utility inspection helpers
const utils = {
  readJson(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse JSON at ${filePath}: ${e.message}`);
    }
  },

  fileExists(filePath) {
    return fs.existsSync(filePath);
  },

  readFile(filePath, encoding = 'utf8') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fs.readFileSync(filePath, encoding);
  },

  getPngInfo(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PNG file does not exist: ${filePath}`);
    }
    const buf = fs.readFileSync(filePath);
    if (buf.length < 24) {
      return { valid: false, error: 'File buffer too short for PNG' };
    }
    const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const sig = buf.subarray(0, 8);
    if (!sig.equals(expectedSig)) {
      return { valid: false, error: 'Invalid PNG header signature' };
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf.readUInt8(24);
    const colorType = buf.readUInt8(25);
    const size = buf.length;
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    return {
      valid: true,
      width,
      height,
      bitDepth,
      colorType,
      size,
      sha256
    };
  }
};

module.exports = {
  describe,
  test,
  it,
  expect,
  AssertionError,
  defaultRegistry,
  runSuites,
  runCli,
  printSummary,
  utils,
  colors
};

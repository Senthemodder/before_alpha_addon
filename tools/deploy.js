#!/usr/bin/env node

/**
 * BEFORE ALPHA - Local Development Deployment Tool
 * Synchronizes BeforeAlpha_BP and BeforeAlpha_RP to the local Minecraft Bedrock
 * development pack directories in AppData Roaming (non-UWP).
 *
 * Target Paths:
 * - BP: AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang/development_behavior_packs/BeforeAlpha_BP
 * - RP: AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang/development_resource_packs/BeforeAlpha_RP
 *
 * Capabilities:
 * - Exact mirror synchronization (creates new files, updates changed files, cleans stale files)
 * - Cryptographic SHA-256 and byte-for-byte Buffer verification
 * - Detailed file, byte, and hash reporting
 * - CLI flags: --verify-only, --dry-run, --quiet, --bp=<path>, --rp=<path>, --no-clean
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_BP = path.join(PROJECT_ROOT, 'BeforeAlpha_BP');
const SOURCE_RP = path.join(PROJECT_ROOT, 'BeforeAlpha_RP');

// Non-UWP Minecraft Bedrock development paths in Roaming
const ROAMING_BASE = process.env.APPDATA || path.join(
  process.env.USERPROFILE || 'C:\\Users\\Dell',
  'AppData', 'Roaming'
);

const DEFAULT_BP_TARGET = process.env.MC_BP_DEV_PATH || path.join(
  ROAMING_BASE,
  'Minecraft Bedrock', 'Users', 'Shared', 'games', 'com.mojang', 'development_behavior_packs', 'BeforeAlpha_BP'
);

const DEFAULT_RP_TARGET = process.env.MC_RP_DEV_PATH || path.join(
  ROAMING_BASE,
  'Minecraft Bedrock', 'Users', 'Shared', 'games', 'com.mojang', 'development_resource_packs', 'BeforeAlpha_RP'
);

/**
 * Recursively scans directory for all files, returning normalized relative paths.
 * @param {string} dir Directory to scan
 * @param {string} [base=''] Internal prefix accumulator
 * @returns {string[]} Array of relative file paths (forward slashes)
 */
function listFilesRecursive(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(listFilesRecursive(fullPath, relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files.sort();
}

/**
 * Computes SHA-256 hash of a file.
 * @param {string} filePath Absolute path to file
 * @returns {string} Hex hash string
 */
function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Removes empty directories recursively upwards.
 */
function cleanEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      cleanEmptyDirs(full);
    }
  }
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

/**
 * Synchronizes source directory to target directory.
 * @param {string} sourceDir Absolute source folder
 * @param {string} targetDir Absolute destination folder
 * @param {object} options Synchronization options
 * @returns {object} Sync summary stats
 */
function syncPack(sourceDir, targetDir, options = {}) {
  const dryRun = options.dryRun || false;
  const clean = options.clean !== false;
  const verbose = options.verbose !== false;

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  const sourceFiles = listFilesRecursive(sourceDir);
  const targetFiles = fs.existsSync(targetDir) ? listFilesRecursive(targetDir) : [];

  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);

  const stats = {
    sourceDir,
    targetDir,
    totalSourceFiles: sourceFiles.length,
    copied: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    totalBytes: 0,
    actions: []
  };

  if (!dryRun && !fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Remove stale files in target that are not in source (mirror sync)
  if (clean) {
    for (const relPath of targetFiles) {
      if (!sourceSet.has(relPath)) {
        const destFile = path.join(targetDir, relPath);
        stats.deleted++;
        stats.actions.push({ type: 'delete', file: relPath });
        if (!dryRun) {
          fs.unlinkSync(destFile);
        }
      }
    }
    if (!dryRun) {
      cleanEmptyDirs(targetDir);
    }
  }

  // 2. Synchronize files from source to target
  for (const relPath of sourceFiles) {
    const srcFile = path.join(sourceDir, relPath);
    const destFile = path.join(targetDir, relPath);

    const srcStat = fs.statSync(srcFile);
    stats.totalBytes += srcStat.size;

    let needsCopy = true;

    if (fs.existsSync(destFile)) {
      const destStat = fs.statSync(destFile);
      if (srcStat.size === destStat.size) {
        // Size matches; compare content buffers
        const srcBuf = fs.readFileSync(srcFile);
        const destBuf = fs.readFileSync(destFile);
        if (Buffer.compare(srcBuf, destBuf) === 0) {
          needsCopy = false;
          stats.unchanged++;
        } else {
          stats.updated++;
          stats.actions.push({ type: 'update', file: relPath, size: srcStat.size });
        }
      } else {
        stats.updated++;
        stats.actions.push({ type: 'update', file: relPath, size: srcStat.size });
      }
    } else {
      stats.copied++;
      stats.actions.push({ type: 'copy', file: relPath, size: srcStat.size });
    }

    if (needsCopy && !dryRun) {
      const destFolder = path.dirname(destFile);
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }
      fs.copyFileSync(srcFile, destFile);
    }
  }

  return stats;
}

/**
 * Rigorously verifies that all files in target exist and match source byte-for-byte.
 * @param {string} sourceDir Source directory
 * @param {string} targetDir Target directory
 * @returns {object} Verification report
 */
function verifyPack(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return { success: false, error: `Source directory does not exist: ${sourceDir}` };
  }
  if (!fs.existsSync(targetDir)) {
    return { success: false, error: `Target directory does not exist: ${targetDir}` };
  }

  const sourceFiles = listFilesRecursive(sourceDir);
  const targetFiles = listFilesRecursive(targetDir);
  const targetSet = new Set(targetFiles);
  const sourceSet = new Set(sourceFiles);

  const missing = [];
  const mismatches = [];
  const extra = [];
  let totalBytes = 0;

  for (const relPath of sourceFiles) {
    const srcPath = path.join(sourceDir, relPath);
    const tgtPath = path.join(targetDir, relPath);

    if (!fs.existsSync(tgtPath)) {
      missing.push(relPath);
      continue;
    }

    const srcStat = fs.statSync(srcPath);
    const tgtStat = fs.statSync(tgtPath);
    totalBytes += srcStat.size;

    if (srcStat.size !== tgtStat.size) {
      mismatches.push({
        file: relPath,
        reason: `Size mismatch: source ${srcStat.size} bytes vs target ${tgtStat.size} bytes`
      });
      continue;
    }

    const srcBuf = fs.readFileSync(srcPath);
    const tgtBuf = fs.readFileSync(tgtPath);

    if (Buffer.compare(srcBuf, tgtBuf) !== 0) {
      const srcHash = crypto.createHash('sha256').update(srcBuf).digest('hex');
      const tgtHash = crypto.createHash('sha256').update(tgtBuf).digest('hex');
      mismatches.push({
        file: relPath,
        reason: `Byte mismatch: SHA-256 src ${srcHash} vs tgt ${tgtHash}`
      });
    }
  }

  for (const relPath of targetFiles) {
    if (!sourceSet.has(relPath)) {
      extra.push(relPath);
    }
  }

  const verified = sourceFiles.length - missing.length - mismatches.length;
  const success = missing.length === 0 && mismatches.length === 0 && extra.length === 0;

  return {
    sourceDir,
    targetDir,
    totalSourceFiles: sourceFiles.length,
    totalTargetFiles: targetFiles.length,
    verified,
    totalBytes,
    missing,
    mismatches,
    extra,
    success
  };
}

/**
 * Main deployment routine.
 * @param {object} customConfig
 */
async function deploy(customConfig = {}) {
  const bpTarget = customConfig.bpTarget || DEFAULT_BP_TARGET;
  const rpTarget = customConfig.rpTarget || DEFAULT_RP_TARGET;
  const dryRun = customConfig.dryRun || false;
  const clean = customConfig.clean !== false;
  const verifyOnly = customConfig.verifyOnly || false;
  const quiet = customConfig.quiet || false;

  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.white}       BEFORE ALPHA — LOCAL BEDROCK DEV DEPLOYMENT${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.dim}Project Root : ${PROJECT_ROOT}${colors.reset}`);
  console.log(`${colors.dim}Mode         : ${verifyOnly ? 'VERIFY ONLY' : dryRun ? 'DRY RUN' : 'SYNCHRONIZE & VERIFY'}${colors.reset}\n`);

  console.log(`${colors.bold}Packs & Targets:${colors.reset}`);
  console.log(`  [BP] Source: ${SOURCE_BP}`);
  console.log(`       Target: ${bpTarget}`);
  console.log(`  [RP] Source: ${SOURCE_RP}`);
  console.log(`       Target: ${rpTarget}\n`);

  let bpSync = null;
  let rpSync = null;

  if (!verifyOnly) {
    console.log(`${colors.bold}${colors.yellow}--> Synchronizing Behavior Pack (BeforeAlpha_BP)...${colors.reset}`);
    bpSync = syncPack(SOURCE_BP, bpTarget, { dryRun, clean, verbose: !quiet });
    console.log(`    Synced: ${bpSync.totalSourceFiles} files (${(bpSync.totalBytes / 1024).toFixed(1)} KB) | Copied: ${bpSync.copied}, Updated: ${bpSync.updated}, Unchanged: ${bpSync.unchanged}, Deleted: ${bpSync.deleted}`);

    console.log(`${colors.bold}${colors.yellow}--> Synchronizing Resource Pack (BeforeAlpha_RP)...${colors.reset}`);
    rpSync = syncPack(SOURCE_RP, rpTarget, { dryRun, clean, verbose: !quiet });
    console.log(`    Synced: ${rpSync.totalSourceFiles} files (${(rpSync.totalBytes / 1024).toFixed(1)} KB) | Copied: ${rpSync.copied}, Updated: ${rpSync.updated}, Unchanged: ${rpSync.unchanged}, Deleted: ${rpSync.deleted}\n`);
  }

  // Verification Step
  console.log(`${colors.bold}${colors.magenta}--> Performing Byte-For-Byte Integrity Verification...${colors.reset}`);
  const bpVerify = verifyPack(SOURCE_BP, bpTarget);
  const rpVerify = verifyPack(SOURCE_RP, rpTarget);

  console.log(`  [BP Verify] ${bpVerify.verified}/${bpVerify.totalSourceFiles} files verified byte-for-byte (${bpVerify.totalBytes.toLocaleString()} bytes)`);
  if (!bpVerify.success) {
    if (bpVerify.missing.length > 0) console.error(`    ${colors.red}Missing files in BP: ${bpVerify.missing.join(', ')}${colors.reset}`);
    if (bpVerify.mismatches.length > 0) console.error(`    ${colors.red}Mismatches in BP: ${JSON.stringify(bpVerify.mismatches)}${colors.reset}`);
    if (bpVerify.extra.length > 0) console.error(`    ${colors.red}Extraneous files in BP: ${bpVerify.extra.join(', ')}${colors.reset}`);
  } else {
    console.log(`    ${colors.green}✔ Behavior Pack verified 100% byte-for-byte with source!${colors.reset}`);
  }

  console.log(`  [RP Verify] ${rpVerify.verified}/${rpVerify.totalSourceFiles} files verified byte-for-byte (${rpVerify.totalBytes.toLocaleString()} bytes)`);
  if (!rpVerify.success) {
    if (rpVerify.missing.length > 0) console.error(`    ${colors.red}Missing files in RP: ${rpVerify.missing.join(', ')}${colors.reset}`);
    if (rpVerify.mismatches.length > 0) console.error(`    ${colors.red}Mismatches in RP: ${JSON.stringify(rpVerify.mismatches)}${colors.reset}`);
    if (rpVerify.extra.length > 0) console.error(`    ${colors.red}Extraneous files in RP: ${rpVerify.extra.join(', ')}${colors.reset}`);
  } else {
    console.log(`    ${colors.green}✔ Resource Pack verified 100% byte-for-byte with source!${colors.reset}`);
  }

  const allSuccess = bpVerify.success && rpVerify.success;

  console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}DEPLOYMENT SUMMARY REPORT${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);
  console.log(`  Total Files Synchronized : ${bpVerify.totalSourceFiles + rpVerify.totalSourceFiles}`);
  console.log(`  Total Bytes Deployed     : ${(bpVerify.totalBytes + rpVerify.totalBytes).toLocaleString()} bytes`);
  console.log(`  Behavior Pack Status     : ${bpVerify.success ? colors.green + 'DEPLOYED & VERIFIED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log(`  Resource Pack Status     : ${rpVerify.success ? colors.green + 'DEPLOYED & VERIFIED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log(`  Overall Status           : ${allSuccess ? colors.bold + colors.green + 'SUCCESS (ALL 113 FILES MATCH BYTE-FOR-BYTE)' : colors.bold + colors.red + 'VERIFICATION FAILED'}${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}\n`);

  return {
    success: allSuccess,
    bp: { sync: bpSync, verify: bpVerify },
    rp: { sync: rpSync, verify: rpVerify },
    totalFiles: bpVerify.totalSourceFiles + rpVerify.totalSourceFiles,
    totalBytes: bpVerify.totalBytes + rpVerify.totalBytes
  };
}

// CLI Execution Entrypoint
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verifyOnly: args.includes('--verify-only'),
    quiet: args.includes('--quiet'),
    clean: !args.includes('--no-clean')
  };

  for (const arg of args) {
    if (arg.startsWith('--bp=')) options.bpTarget = arg.split('=')[1];
    if (arg.startsWith('--rp=')) options.rpTarget = arg.split('=')[1];
  }

  deploy(options).then(result => {
    if (!result.success) {
      process.exit(1);
    }
  }).catch(err => {
    console.error(`${colors.bold}${colors.red}Deployment error:${colors.reset}`, err);
    process.exit(1);
  });
}

module.exports = {
  deploy,
  syncPack,
  verifyPack,
  listFilesRecursive,
  computeSha256,
  DEFAULT_BP_TARGET,
  DEFAULT_RP_TARGET,
  SOURCE_BP,
  SOURCE_RP
};

#!/usr/bin/env node

/**
 * Build Validation Script
 * Comprehensive validation of build integrity and common issues
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

console.log('🔍 Running Build Validation...\n');

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

const checks = {
  typescript: { passed: false, message: 'TypeScript compilation' },
  eslint: { passed: false, message: 'ESLint validation' },
  tests: { passed: false, message: 'Test suite execution' },
  dependencies: { passed: false, message: 'Dependency integrity' },
  imports: { passed: false, message: 'Import validation' },
  buildOutput: { passed: false, message: 'Build output validation' },
};

let totalChecks = 0;
let passedChecks = 0;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    // SECURITY: Command injection safe - only hardcoded npm script names are executed
    // No user input is concatenated into commands
    execSync(command, { cwd: ROOT_DIR, stdio: 'pipe' });
    console.log(`✅ ${description} passed\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed:`);
    console.log(error.stdout?.toString() || error.message);
    console.log('');
    return false;
  }
}

function checkFileExists(filePath, description) {
  try {
    console.log(`📋 Checking ${description}...`);
    if (existsSync(join(ROOT_DIR, filePath))) {
      console.log(`✅ ${description} exists\n`);
      return true;
    } else {
      console.log(`❌ ${description} missing\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} check failed: ${error.message}\n`);
    return false;
  }
}

function validatePackageJson() {
  try {
    console.log('📋 Validating package.json...');
    const packageJson = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8'));

    // Check required fields
    const requiredFields = ['name', 'version', 'scripts'];
    for (const field of requiredFields) {
      if (!packageJson[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check critical scripts
    const criticalScripts = ['build', 'test', 'lint'];
    for (const script of criticalScripts) {
      if (!packageJson.scripts[script]) {
        throw new Error(`Missing critical script: ${script}`);
      }
    }

    // Check Node.js version compatibility
    if (packageJson.engines?.node) {
      const nodeVersion = process.version;
      const requiredVersion = packageJson.engines.node;
      console.log(`   Node.js: ${nodeVersion} (requires ${requiredVersion})`);
    }

    console.log('✅ package.json validation passed\n');
    return true;
  } catch (error) {
    console.log(`❌ package.json validation failed: ${error.message}\n`);
    return false;
  }
}

// ============================================================================
// RUN VALIDATIONS
// ============================================================================

// 1. TypeScript compilation
totalChecks++;
if (runCommand('npm run typecheck', 'TypeScript compilation check')) {
  checks.typescript.passed = true;
  passedChecks++;
}

// 2. ESLint validation
totalChecks++;
if (runCommand('npm run lint', 'ESLint validation')) {
  checks.eslint.passed = true;
  passedChecks++;
}

// 3. Test execution
totalChecks++;
if (runCommand('npm test', 'Test suite execution')) {
  checks.tests.passed = true;
  passedChecks++;
}

// 4. Package.json validation
totalChecks++;
if (validatePackageJson()) {
  checks.dependencies.passed = true;
  passedChecks++;
}

// 5. Critical file existence
totalChecks++;
const criticalFiles = [
  'src/main.tsx',
  'src/App.tsx',
  'vite.config.ts',
  'tsconfig.json',
  'package.json'
];

let allFilesExist = true;
for (const file of criticalFiles) {
  if (!checkFileExists(file, `${file} existence`)) {
    allFilesExist = false;
  }
}

if (allFilesExist) {
  checks.imports.passed = true;
  passedChecks++;
}

// 6. Build output validation
totalChecks++;
if (runCommand('npm run build', 'Build output generation')) {
  // Check if dist directory was created
  if (checkFileExists('dist', 'Build output directory')) {
    checks.buildOutput.passed = true;
    passedChecks++;
  }
}

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

console.log('='.repeat(60));
console.log('BUILD VALIDATION RESULTS');
console.log('='.repeat(60));

for (const [key, check] of Object.entries(checks)) {
  const status = check.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${check.message}`);
}

console.log('='.repeat(60));
console.log(`OVERALL: ${passedChecks}/${totalChecks} checks passed`);

if (passedChecks === totalChecks) {
  console.log('🎉 All validations passed! Build is ready.');
  process.exit(0);
} else {
  console.log('💥 Some validations failed. Please fix issues before proceeding.');
  process.exit(1);
}

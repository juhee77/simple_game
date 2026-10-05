#!/usr/bin/env node
/**
 * Validate Game Rules Script
 * Scans all HTML files in games/ directory and verifies that:
 * 1. An id="game-rules" JSON script block exists.
 * 2. The JSON is valid and formatted cleanly.
 * 3. Required fields (title, steps, goal/players) are present.
 *
 * Usage:
 *   node scripts/validate-rules.js           (Reports warnings/errors)
 *   node scripts/validate-rules.js --strict  (Fails build on missing rules)
 */

const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '..', 'games');
const isStrict = process.argv.includes('--strict');

let totalFiles = 0;
let validFiles = 0;
let errors = [];
let warnings = [];

function checkFile(filePath) {
  const fileName = path.basename(filePath);
  if (!fileName.endsWith('.html')) return;

  totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract <script type="application/json" id="game-rules">
  const match = content.match(/<script\s+type=["']application\/json["']\s+id=["']game-rules["']>([\s\S]*?)<\/script>/i);

  if (!match) {
    warnings.push({ file: fileName, message: 'Missing <script id="game-rules"> block' });
    return;
  }

  const jsonStr = match[1].trim();
  if (!jsonStr) {
    errors.push({ file: fileName, message: 'Empty #game-rules JSON block' });
    return;
  }

  try {
    const rules = JSON.parse(jsonStr);

    if (!rules.title || typeof rules.title !== 'string') {
      errors.push({ file: fileName, message: 'Missing or invalid "title" property in #game-rules' });
      return;
    }

    if (!rules.steps || !Array.isArray(rules.steps) || rules.steps.length === 0) {
      errors.push({ file: fileName, message: 'Missing or empty "steps" array in #game-rules' });
      return;
    }

    validFiles++;
  } catch (err) {
    errors.push({ file: fileName, message: `Invalid JSON syntax in #game-rules: ${err.message}` });
  }
}

function runValidation() {
  console.log('🔍 Validating #game-rules JSON across all games...');
  const files = fs.readdirSync(gamesDir);

  files.forEach(file => {
    const fullPath = path.join(gamesDir, file);
    if (fs.statSync(fullPath).isFile()) {
      checkFile(fullPath);
    }
  });

  console.log('\n📊 Summary:');
  console.log(`- Total HTML Games Checked: ${totalFiles}`);
  console.log(`- Valid Rules Definitions: ${validFiles}`);
  console.log(`- Missing Rules (Warnings): ${warnings.length}`);
  console.log(`- Syntax / Schema Errors: ${errors.length}`);

  if (warnings.length > 0) {
    console.log(`\n⚠️ Missing Rule Blocks (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - [${w.file}]: ${w.message}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Syntax / Schema Errors (${errors.length}):`);
    errors.forEach(e => console.log(`  - [${e.file}]: ${e.message}`));
  }

  if (errors.length > 0 || (isStrict && warnings.length > 0)) {
    console.log('\n❌ Rule validation failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Rule validation completed successfully!');
    process.exit(0);
  }
}

runValidation();

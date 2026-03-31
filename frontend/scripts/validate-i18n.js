#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANGUAGES = ['en', 'hi', 'mr'];
const SOURCE_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

const SKIP_PATTERNS = [
  /^import\s+/m,
  /^export\s+/m,
  /^const\s+\w+\s*=/m,
  /^export\s+default/m,
  /function\s+\w+/,
  /=>\s*{/,
  /<\w+\s+[a-z]/,
  /^[A-Z][a-z]+\s*=/m,
  /debugger/,
  /console\./,
  /https?:\/\//,
  /^[A-Z_]+$/,
  /^\d+$/,
  /\.json$/,
  /node_modules/,
  /\.css$/,
  /\.svg$/,
  /^\s*<[A-Z][a-zA-Z]*[^>]*>\s*$/m,
  /\.\w+\(/,
  /<\w+\s+[a-z][\w-]*=/,
  /use[A-Z]\w+/,
  /[A-Z]\w+\s*\(/,
  /\$\{.*?\}/,
  /set\w+\(/,
  /localStorage\./,
  /navigate\(/,
  /filter\(|\.map\(|\.reduce\(/,
  /JSON\.parse|JSON\.stringify/,
  /new\s+Date/,
  /return\s+null/,
  /return\s+true|return\s+false/,
  /^import\s+.*from\s+['"]react['"]/m,
  /^import\s+.*from\s+['"]react-router/m,
];

const UI_ELEMENT_PATTERNS = [
  /placeholder=["'][^"']*[a-zA-Z][a-zA-Z\s]{2,}[^"']*["']/g,
  /aria-label=["'][^"']*[a-zA-Z][a-zA-Z\s]{2,}[^"']*["']/g,
  /alt=["'][^"']*[a-zA-Z][a-zA-Z\s]{2,}[^"']*["']/g,
  /title=["'][^"']*[a-zA-Z][a-zA-Z\s]{2,}[^"']*["']/g,
];

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadTranslationFiles() {
  const translations = {};
  for (const lang of LANGUAGES) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }
  return translations;
}

function getAllTranslationKeys(translations) {
  const keys = {};
  for (const lang of LANGUAGES) {
    keys[lang] = getAllKeys(translations[lang] || {});
  }
  return keys;
}

function findMissingKeys(allKeys) {
  const enKeys = new Set(allKeys.en || []);
  const missing = {};
  
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;
    const langKeys = new Set(allKeys[lang] || []);
    const missingKeyList = [...enKeys].filter(k => !langKeys.has(k));
    if (missingKeyList.length > 0) {
      missing[lang] = missingKeyList;
    }
  }
  
  return missing;
}

function shouldSkipLine(line) {
  return SKIP_PATTERNS.some(pattern => pattern.test(line));
}

function findHardcodedUIAttributes(filePath, content) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (shouldSkipLine(line)) return;
    
    for (const pattern of UI_ELEMENT_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!match.includes('t(') && !match.includes('useTranslation') && !match.includes('i18n')) {
            issues.push({
              file: path.relative(SOURCE_DIR, filePath),
              line: index + 1,
              content: match
            });
          }
        });
      }
    }
  });
  
  return issues;
}

function scanFiles(dir, extensions = ['.jsx', '.js', '.tsx', '.ts']) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        if (!entry.name.includes('dev-dist')) {
          walk(fullPath);
        }
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function main() {
  console.log('\n🔍 STRICT I18N VALIDATION\n');
  console.log('='.repeat(50));
  
  let hasErrors = false;
  
  console.log('\n📁 Loading translation files...');
  const translations = loadTranslationFiles();
  const allKeys = getAllTranslationKeys(translations);
  
  console.log('✓ Loaded translations for:', Object.keys(translations).join(', '));
  
  console.log('\n🔑 Checking for missing translation keys...');
  const missingKeys = findMissingKeys(allKeys);
  
  if (Object.keys(missingKeys).length > 0) {
    hasErrors = true;
    console.log('❌ Missing keys found:');
    for (const [lang, keys] of Object.entries(missingKeys)) {
      console.log(`   ${lang}: ${keys.length} missing keys`);
      keys.slice(0, 5).forEach(k => console.log(`      - ${k}`));
      if (keys.length > 5) {
        console.log(`      ... and ${keys.length - 5} more`);
      }
    }
  } else {
    console.log('✓ All translation keys are present in all languages');
  }
  
  console.log('\n📝 Scanning for hardcoded UI attributes...');
  const files = scanFiles(SOURCE_DIR);
  let hardcodedIssues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const issues = findHardcodedUIAttributes(file, content);
    hardcodedIssues = hardcodedIssues.concat(issues);
  }
  
  if (hardcodedIssues.length > 0) {
    hasErrors = true;
    console.log(`❌ Found ${hardcodedIssues.length} potential hardcoded UI strings:`);
    hardcodedIssues.slice(0, 20).forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.content}`);
    });
    if (hardcodedIssues.length > 20) {
      console.log(`   ... and ${hardcodedIssues.length - 20} more`);
    }
  } else {
    console.log('✓ No hardcoded UI strings detected');
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (hasErrors) {
    console.log('\n❌ VALIDATION FAILED');
    console.log('   Please fix the issues above before committing.\n');
    process.exit(1);
  } else {
    console.log('\n✅ VALIDATION PASSED');
    console.log('   All translations are complete!\n');
    process.exit(0);
  }
}

main();

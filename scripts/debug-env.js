#!/usr/bin/env node
/**
 * Debug script to check environment setup
 * Run with: node scripts/debug-env.js
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

console.log('\n🔍 Para Allowance Wallet - Environment Debug\n');
console.log('='.repeat(50));

// Check 1: Node version
console.log('\n1. Node Version Check');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
if (majorVersion >= 20) {
  console.log(`   ✅ Node ${nodeVersion} (requires >= 20)`);
} else {
  console.log(`   ❌ Node ${nodeVersion} - REQUIRES Node 20 or higher!`);
  console.log(`      Run: nvm install 20 && nvm use 20`);
}

// Check 2: .env file exists
console.log('\n2. Environment File Check');
const envPath = join(projectRoot, '.env');
const envLocalPath = join(projectRoot, '.env.local');
const envExamplePath = join(projectRoot, '.env.example');

if (existsSync(envPath)) {
  console.log(`   ✅ .env file exists`);
} else if (existsSync(envLocalPath)) {
  console.log(`   ⚠️  .env.local exists but .env does not`);
  console.log(`      Vite reads .env - rename or copy .env.local to .env`);
} else {
  console.log(`   ❌ No .env file found!`);
  console.log(`      Run: cp .env.example .env`);
}

// Check 3: Environment variables format
console.log('\n3. Environment Variables Check');
let envContent = '';
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, 'utf-8');
} else if (existsSync(envLocalPath)) {
  envContent = readFileSync(envLocalPath, 'utf-8');
}

if (envContent) {
  const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));

  // Check VITE_PARA_API_KEY
  const apiKeyLine = lines.find(l => l.startsWith('VITE_PARA_API_KEY'));
  if (apiKeyLine) {
    const value = apiKeyLine.split('=')[1]?.trim();
    if (value && value !== 'your_api_key_here' && value.length > 10) {
      console.log(`   ✅ VITE_PARA_API_KEY is set (${value.substring(0, 8)}...)`);
    } else if (value === 'your_api_key_here') {
      console.log(`   ❌ VITE_PARA_API_KEY still has placeholder value!`);
      console.log(`      Get your key from: https://developer.getpara.com`);
    } else {
      console.log(`   ❌ VITE_PARA_API_KEY appears empty or too short`);
    }

    // Check for common formatting issues
    if (apiKeyLine.includes(' = ') || apiKeyLine.includes('= ') || apiKeyLine.includes(' =')) {
      console.log(`   ⚠️  Warning: Remove spaces around '=' in env file`);
      console.log(`      Wrong: VITE_PARA_API_KEY = value`);
      console.log(`      Right: VITE_PARA_API_KEY=value`);
    }
    if (value && (value.startsWith('"') || value.startsWith("'"))) {
      console.log(`   ⚠️  Warning: Remove quotes from env value`);
      console.log(`      Wrong: VITE_PARA_API_KEY="value"`);
      console.log(`      Right: VITE_PARA_API_KEY=value`);
    }
  } else {
    console.log(`   ❌ VITE_PARA_API_KEY not found in env file`);
  }

  // Check VITE_PARA_ENV
  const envLine = lines.find(l => l.startsWith('VITE_PARA_ENV'));
  if (envLine) {
    const value = envLine.split('=')[1]?.trim();
    console.log(`   ✅ VITE_PARA_ENV=${value}`);
    if (value === 'development') {
      console.log(`      ℹ️  Beta environment - use test emails (@test.getpara.com)`);
    }
  } else {
    console.log(`   ℹ️  VITE_PARA_ENV not set (defaults to development/Beta)`);
  }
}

// Check 4: Dependencies installed
console.log('\n4. Dependencies Check');
const nodeModulesPath = join(projectRoot, 'node_modules');
const paraPath = join(nodeModulesPath, '@getpara', 'react-sdk');

if (existsSync(nodeModulesPath)) {
  console.log(`   ✅ node_modules exists`);
  if (existsSync(paraPath)) {
    console.log(`   ✅ @getpara/react-sdk installed`);
  } else {
    console.log(`   ❌ @getpara/react-sdk NOT installed`);
    console.log(`      Run: npm install`);
  }
} else {
  console.log(`   ❌ node_modules not found!`);
  console.log(`      Run: npm install`);
}

// Check 5: Build output
console.log('\n5. Build Check');
const distPath = join(projectRoot, 'dist');
if (existsSync(distPath)) {
  console.log(`   ✅ dist folder exists (built)`);
} else {
  console.log(`   ℹ️  No dist folder (not built yet)`);
  console.log(`      Run: npm run build`);
}

// Check 6: Common issues
console.log('\n6. Quick Fixes');
console.log(`
   If login modal doesn't open:
   - Check browser console for errors (F12 → Console)
   - Verify API key is correct (not placeholder)

   If OTP not received (Beta environment):
   - Use test email: yourname@test.getpara.com
   - Any OTP code works: 123456

   If page is blank:
   - Check browser console for errors
   - Try: npm run build && npm run preview
`);

console.log('='.repeat(50));
console.log('\n📋 Full Debug Command:');
console.log('   npm run dev 2>&1 | head -50\n');

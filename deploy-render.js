#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Preparing for Render deployment...\n');

// Update railway.toml to use ultra simple server
const renderConfig = `services:
  - type: web
    name: hairfy
    env: node
    plan: free
    buildCommand: npm run build
    startCommand: node ultra-simple-server.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production`;

fs.writeFileSync('render.yaml', renderConfig);
console.log('✅ Updated render.yaml');

// Build the application
console.log('\n📦 Building application...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n📋 Next steps for Render:');
console.log('1. Go to https://render.com');
console.log('2. Connect your GitHub repository');
console.log('3. Create a new Web Service');
console.log('4. Use these settings:');
console.log('   - Build Command: npm run build');
console.log('   - Start Command: node ultra-simple-server.js');
console.log('   - Health Check Path: /health');
console.log('\n🎉 Ready for Render deployment!');
#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Preparing WhatsApp-enabled deployment for Render...\n');

// Create render.yaml with WhatsApp support
const renderConfig = `services:
  - type: web
    name: hairfy-whatsapp
    env: node
    plan: free
    region: oregon
    buildCommand: npm ci && npm run build
    startCommand: node production-server.js
    healthCheckPath: /api/health
    autoDeploy: false
    envVars:
      - key: NODE_ENV
        value: production
      - key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
        value: true
      - key: PUPPETEER_EXECUTABLE_PATH
        value: /usr/bin/google-chrome-stable
    disk:
      name: whatsapp-sessions
      mountPath: /opt/render/project/src/.wwebjs_auth
      sizeGB: 1`;

fs.writeFileSync('render.yaml', renderConfig);
console.log('✅ Created render.yaml with WhatsApp support');

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

console.log('\n📋 Deploy to Render:');
console.log('1. Go to https://render.com');
console.log('2. Connect your GitHub repository');
console.log('3. Create a new Web Service');
console.log('4. Render will automatically use render.yaml');
console.log('5. Your WhatsApp integration will work!');
console.log('\n🎉 Ready for Render with WhatsApp support!');
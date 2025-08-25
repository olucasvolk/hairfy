#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Deploying with simple server...\n');

// Update railway.json to use simple server
const railwayConfig = {
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "npm run start:simple",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
};

fs.writeFileSync('railway.json', JSON.stringify(railwayConfig, null, 2));
console.log('✅ Updated railway.json to use simple server');

// Clean and build
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

// Deploy
console.log('\n🚀 Deploying to Railway...');
try {
  execSync('railway up --detach', { stdio: 'inherit' });
  console.log('\n✅ Deployment started successfully!');
  
  setTimeout(() => {
    try {
      const url = execSync('railway domain', { encoding: 'utf8' }).trim();
      console.log(`\n🌐 Application available at: ${url}`);
    } catch (error) {
      console.log('\n✅ Check Railway dashboard for URL: https://railway.app/dashboard');
    }
  }, 5000);
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Simple deployment completed!');
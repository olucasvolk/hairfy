#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Deploying to Vercel...\n');

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('✅ Vercel CLI found');
} catch (error) {
  console.log('❌ Vercel CLI not found. Installing...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI installed');
  } catch (installError) {
    console.error('❌ Failed to install Vercel CLI');
    console.log('💡 Try: npm install -g vercel');
    process.exit(1);
  }
}

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

// Deploy to Vercel
console.log('\n🚀 Deploying to Vercel...');
try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('\n✅ Deployment completed!');
  console.log('\n🌐 Your app is now live on Vercel');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n💡 Try running: vercel login');
  process.exit(1);
}

console.log('\n🎉 Vercel deployment completed!');
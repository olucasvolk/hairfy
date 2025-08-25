#!/bin/bash

# Script para deploy em VPS Ubuntu/Debian
echo "🚀 Deploying to VPS..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome dependencies
sudo apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install PM2 for process management
sudo npm install -g pm2

# Clone and setup project
git clone https://github.com/your-username/your-repo.git hairfy
cd hairfy
npm install
npm run build

# Start with PM2
pm2 start production-server.js --name "hairfy-whatsapp"
pm2 startup
pm2 save

echo "✅ Deployment completed!"
echo "🌐 Your app is running on port 3001"
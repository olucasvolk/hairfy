// DEPLOY COMPLETO PARA DIGITAL OCEAN
// WhatsApp + Lembretes + Web Interface

const fs = require('fs');
const path = require('path');

console.log('🌊 PREPARANDO DEPLOY PARA DIGITAL OCEAN...');

// 1. Criar package.json otimizado para produção
const packageJson = {
  "name": "barberflow-complete",
  "version": "1.0.0",
  "description": "Sistema completo de barbearia com WhatsApp e lembretes automáticos",
  "main": "digitalocean-complete-server.js",
  "scripts": {
    "start": "node digitalocean-complete-server.js",
    "build": "echo 'Build completed'",
    "postinstall": "echo 'Dependencies installed'"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.56.0",
    "whatsapp-web.js": "^1.25.0",
    "qrcode": "^1.5.4",
    "socket.io": "^4.8.1",
    "node-cron": "^3.0.3",
    "puppeteer": "^23.10.4"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "keywords": [
    "whatsapp",
    "barbershop",
    "reminders",
    "automation"
  ]
};

// 2. Criar Dockerfile otimizado
const dockerfile = `# DOCKERFILE PARA DIGITAL OCEAN
FROM node:18-slim

# Instalar dependências do sistema para Puppeteer
RUN apt-get update && apt-get install -y \\
    wget \\
    ca-certificates \\
    fonts-liberation \\
    libappindicator3-1 \\
    libasound2 \\
    libatk-bridge2.0-0 \\
    libatk1.0-0 \\
    libc6 \\
    libcairo2 \\
    libcups2 \\
    libdbus-1-3 \\
    libexpat1 \\
    libfontconfig1 \\
    libgbm1 \\
    libgcc1 \\
    libglib2.0-0 \\
    libgtk-3-0 \\
    libnspr4 \\
    libnss3 \\
    libpango-1.0-0 \\
    libpangocairo-1.0-0 \\
    libstdc++6 \\
    libx11-6 \\
    libx11-xcb1 \\
    libxcb1 \\
    libxcomposite1 \\
    libxcursor1 \\
    libxdamage1 \\
    libxext6 \\
    libxfixes3 \\
    libxi6 \\
    libxrandr2 \\
    libxrender1 \\
    libxss1 \\
    libxtst6 \\
    lsb-release \\
    xdg-utils \\
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p .wwebjs_auth .wwebjs_cache dist

# Expor porta
EXPOSE 3001

# Variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Instalar Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \\
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \\
    && apt-get update \\
    && apt-get install -y google-chrome-stable \\
    && rm -rf /var/lib/apt/lists/*

# Comando de inicialização
CMD ["npm", "start"]
`;

// 3. Criar docker-compose.yml
const dockerCompose = `version: '3.8'

services:
  barberflow:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - VITE_SUPABASE_URL=\${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=\${VITE_SUPABASE_ANON_KEY}
    volumes:
      - whatsapp_auth:/app/.wwebjs_auth
      - whatsapp_cache:/app/.wwebjs_cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  whatsapp_auth:
  whatsapp_cache:
`;

// 4. Criar .dockerignore
const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
.coverage/
.vscode
.DS_Store
*.log
dist/
build/
.next/
`;

// 5. Criar script de deploy
const deployScript = `#!/bin/bash

echo "🌊 DEPLOY PARA DIGITAL OCEAN"
echo "=============================="

# Verificar se está no diretório correto
if [ ! -f "digitalocean-complete-server.js" ]; then
    echo "❌ Arquivo digitalocean-complete-server.js não encontrado!"
    echo "Execute este script na raiz do projeto."
    exit 1
fi

# Build da aplicação React
echo "📦 Building aplicação React..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Diretório dist não foi criado!"
    echo "Verifique se o build foi executado corretamente."
    exit 1
fi

echo "✅ Build concluído!"

# Verificar variáveis de ambiente
echo "🔍 Verificando variáveis de ambiente..."

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "⚠️  VITE_SUPABASE_URL não definida"
    echo "Configure: export VITE_SUPABASE_URL=sua_url_supabase"
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  VITE_SUPABASE_ANON_KEY não definida"
    echo "Configure: export VITE_SUPABASE_ANON_KEY=sua_chave_supabase"
fi

# Build da imagem Docker
echo "🐳 Building imagem Docker..."
docker build -t barberflow-complete .

if [ $? -eq 0 ]; then
    echo "✅ Imagem Docker criada com sucesso!"
else
    echo "❌ Erro ao criar imagem Docker!"
    exit 1
fi

# Iniciar com docker-compose
echo "🚀 Iniciando aplicação..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
    echo "================================"
    echo "🌐 Aplicação: http://localhost:3001"
    echo "📱 WhatsApp: Ativo"
    echo "⏰ Lembretes: Ativo (a cada hora)"
    echo "🔗 Health Check: http://localhost:3001/health"
    echo ""
    echo "📋 Comandos úteis:"
    echo "   docker-compose logs -f    # Ver logs"
    echo "   docker-compose stop       # Parar"
    echo "   docker-compose restart    # Reiniciar"
    echo ""
else
    echo "❌ Erro ao iniciar aplicação!"
    exit 1
fi
`;

// Escrever arquivos
try {
  // Package.json para produção
  fs.writeFileSync('package-production.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ package-production.json criado');

  // Dockerfile
  fs.writeFileSync('Dockerfile', dockerfile);
  console.log('✅ Dockerfile criado');

  // Docker Compose
  fs.writeFileSync('docker-compose.yml', dockerCompose);
  console.log('✅ docker-compose.yml criado');

  // .dockerignore
  fs.writeFileSync('.dockerignore', dockerignore);
  console.log('✅ .dockerignore criado');

  // Script de deploy
  fs.writeFileSync('deploy-do.sh', deployScript);
  fs.chmodSync('deploy-do.sh', '755');
  console.log('✅ deploy-do.sh criado');

  console.log('\n🎯 ARQUIVOS DE DEPLOY CRIADOS!');
  console.log('===============================');
  console.log('📁 Arquivos gerados:');
  console.log('   - package-production.json');
  console.log('   - Dockerfile');
  console.log('   - docker-compose.yml');
  console.log('   - .dockerignore');
  console.log('   - deploy-do.sh');
  
  console.log('\n🚀 PRÓXIMOS PASSOS:');
  console.log('===================');
  console.log('1. Configure as variáveis de ambiente:');
  console.log('   export VITE_SUPABASE_URL="sua_url_supabase"');
  console.log('   export VITE_SUPABASE_ANON_KEY="sua_chave_supabase"');
  console.log('');
  console.log('2. Execute o deploy:');
  console.log('   ./deploy-do.sh');
  console.log('');
  console.log('3. Ou manualmente:');
  console.log('   npm run build');
  console.log('   docker build -t barberflow-complete .');
  console.log('   docker-compose up -d');
  console.log('');
  console.log('✅ Sistema funcionará com:');
  console.log('   📱 WhatsApp Web.js integrado');
  console.log('   ⏰ Lembretes automáticos (cron)');
  console.log('   🌐 Interface web completa');
  console.log('   🔄 Auto-restart em caso de falha');

} catch (error) {
  console.error('❌ Erro ao criar arquivos:', error);
  process.exit(1);
}
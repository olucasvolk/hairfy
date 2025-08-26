#!/bin/bash

echo "🚀 Instalando dependências para App Platform..."

# Instalar dependências
npm install

# Garantir que o Puppeteer baixe o Chromium
npm install puppeteer-core @sparticuz/chromium --save

echo "📦 Fazendo build do React..."

# Build do frontend React
npm run build

echo "✅ Build completo concluído para App Platform!"
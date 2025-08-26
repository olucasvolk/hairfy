#!/bin/bash

echo "🚀 Instalando dependências para App Platform..."

# Instalar dependências
npm install

# Garantir que o Puppeteer baixe o Chromium
npm install puppeteer --save

echo "✅ Build concluído para App Platform!"